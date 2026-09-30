import { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardList, Calendar, Clock, Filter, RotateCcw, Lock, Save, AlertCircle } from 'lucide-react';

interface Worker { id: string; name: string; category: string; worker_group?: string; }
interface AttData { status: string; late_in: boolean; early_out: boolean; late_in_time?: string; early_out_time?: string; ot_hours?: string | number; }

export default function OperatorEntry() {
  const getAutoShift = (group: string) => {
    const now = new Date();
    const time = now.getHours() + (now.getMinutes() / 60); 
    if (group === 'Regular') {
      if (time >= 6.5 && time < 15) return 'A';         
      if (time >= 15 && time < 23.5) return 'B';        
      return 'C';                                       
    } else {
      if (time >= 6.5 && time < 18.5) return 'Day';     
      return 'Night';                                   
    }
  };

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttData>>({});
  
  // NEW: State to track original lock state and pending edits
  const [originalAttendance, setOriginalAttendance] = useState<Record<string, AttData>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, AttData>>({});
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeGroup, setEmployeeGroup] = useState('Regular'); 
  const [shift, setShift] = useState(getAutoShift('Regular')); 
  
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const casualGroups = Array.from(new Set(workers.filter(w => w.category === 'Casual' && w.worker_group).map(w => w.worker_group as string))).sort();

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const group = e.target.value; 
    setEmployeeGroup(group);
    setShift(getAutoShift(group)); 
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLocked(false);
      setPendingChanges({});
      const cachedWorkers = sessionStorage.getItem('cached_workers');
      if (cachedWorkers) { setWorkers(JSON.parse(cachedWorkers)); setLoading(false); } else { setLoading(true); }
      
      try {
        const workersRes = await axios.get('https://graphite-api.vercel.app/api/workers');
        const activeWorkers = workersRes.data.filter((w: any) => !w.is_archived);
        setWorkers(activeWorkers);
        sessionStorage.setItem('cached_workers', JSON.stringify(activeWorkers));

        const attRes = await axios.get(`https://graphite-api.vercel.app/api/attendance?date=${date}&shift=${shift}`);
        const attMap: Record<string, AttData> = {};
        attRes.data.forEach((record: any) => {
          attMap[record.worker_id] = {
            status: record.status, late_in: record.late_in || false, early_out: record.early_out || false,
            late_in_time: record.late_in_time || '', early_out_time: record.early_out_time || '', ot_hours: record.ot_hours || ''
          };
        });
        setAttendance(attMap);
        setOriginalAttendance(JSON.parse(JSON.stringify(attMap)));

        const lockRes = await axios.get(`https://graphite-api.vercel.app/api/shift-lock?date=${date}&shift=${shift}&group=${employeeGroup}`);
        setIsLocked(lockRes.data.isLocked);
        setError('');
      } catch (err: any) { setError('Failed to load data from the server.'); } finally { setLoading(false); }
    };
    fetchData();
  }, [date, shift, employeeGroup]);

  const handleLockShift = async () => {
    if (!window.confirm(`Are you sure you want to Save & Lock initial attendance for ${employeeGroup} on ${date} (Shift: ${shift})?`)) return;
    try {
      await axios.post('https://graphite-api.vercel.app/api/shift-lock', { date, shift, group: employeeGroup, is_locked: true });
      setIsLocked(true);
      setOriginalAttendance(JSON.parse(JSON.stringify(attendance)));
      alert('Shift locked successfully! Operators can now only modify Late In, Early Out, OT, or change Absent to Present.');
    } catch (err) { alert('Failed to lock shift.'); }
  };

  const updateAttendance = async (worker_id: string, updates: Partial<AttData>) => {
    const current = attendance[worker_id] || { status: '', late_in: false, early_out: false, late_in_time: '', early_out_time: '', ot_hours: '' };
    const original = originalAttendance[worker_id] || { status: '' };
    
    if (isLocked) {
      const isAllowedEdit = 
        (current.status !== 'PRESENT' && updates.status === 'PRESENT') ||
        (current.status === 'PRESENT' && updates.status === 'ABSENT') ||
        updates.late_in !== undefined || updates.late_in_time !== undefined || 
        updates.early_out !== undefined || updates.early_out_time !== undefined || 
        updates.ot_hours !== undefined;

      if (!isAllowedEdit) {
        alert("This shift is locked. You can only mark Late In, Early Out, OT, or change Absent to Present.");
        return;
      }
    }

    const nextState = { ...current, ...updates };

    // NEW: Force Late In if changed from Absent to Present during a locked shift
    if (isLocked && original.status !== 'PRESENT' && nextState.status === 'PRESENT') {
      nextState.late_in = true;
    }
    // Prevent unchecking Late In manually if it was forced
    if (isLocked && original.status !== 'PRESENT' && nextState.status === 'PRESENT' && !nextState.late_in) {
       alert("Late entry is required when changing an employee to Present after the shift is locked.");
       nextState.late_in = true; 
    }

    if (!nextState.late_in) nextState.late_in_time = '';
    if (!nextState.early_out) nextState.early_out_time = '';

    setAttendance(prev => ({ ...prev, [worker_id]: nextState }));

    if (isLocked) {
      // Put in a temporary holding queue until they click "Save Updates"
      setPendingChanges(prev => ({ ...prev, [worker_id]: nextState }));
    } else {
      // Standard Auto-Save if shift is not locked yet
      try { await axios.post('https://graphite-api.vercel.app/api/attendance', { worker_id, date, shift, ...nextState }); } 
      catch (err) { alert(`Failed to save attendance for ${worker_id}.`); }
    }
  };

  // NEW: Manual Save function for post-lock updates
  const savePendingChanges = async () => {
    // 1. Validation: Ensure Late Time is filled out
    for (const worker_id of Object.keys(pendingChanges)) {
      const original = originalAttendance[worker_id] || { status: '' };
      const nextState = pendingChanges[worker_id];

      if (original.status !== 'PRESENT' && nextState.status === 'PRESENT') {
        if (!nextState.late_in_time || nextState.late_in_time.trim() === '') {
          alert(`MISSING TIME: You changed an Absent employee to Present post-lock. You MUST enter their 'Late In' time before saving.`);
          return; 
        }
      }
    }

    // 2. Save all edits
    setLoading(true);
    let success = true;
    for (const worker_id of Object.keys(pendingChanges)) {
      const nextState = pendingChanges[worker_id];
      try {
        await axios.post('https://graphite-api.vercel.app/api/attendance', { worker_id, date, shift, ...nextState });
        setOriginalAttendance(prev => ({ ...prev, [worker_id]: nextState }));
      } catch (err) {
        success = false;
        alert(`Failed to save updates for ${worker_id}.`);
      }
    }
    
    if (success) {
      setPendingChanges({});
      alert('All post-lock updates saved successfully!');
    }
    setLoading(false);
  };

  const clearAttendance = async (worker_id: string) => {
    if (isLocked) return alert("You cannot clear/undo records on a locked shift."); 
    if (!window.confirm('Are you sure you want to clear attendance?')) return;
    setAttendance(prev => { const copy = { ...prev }; delete copy[worker_id]; return copy; });
    try { await axios.delete(`https://graphite-api.vercel.app/api/attendance/record?worker_id=${worker_id}&date=${date}&shift=${shift}`); } 
    catch (err) { alert(`Failed to clear record.`); }
  };

  const filteredWorkers = workers
    .filter(w => {
      if (employeeGroup === 'Regular') return w.category === 'Permanent' || w.category === 'Contact';
      const isUnassignedCasual = w.category === 'Casual' && (!w.worker_group || w.worker_group.trim() === '');
      if ((shift === 'Day' || shift === 'Night') && isUnassignedCasual) return true;
      return w.worker_group === employeeGroup;
    })
    .sort((a, b) => {
      if (a.category === 'Permanent' && b.category !== 'Permanent') return -1;
      if (b.category === 'Permanent' && a.category !== 'Permanent') return 1;
      return a.id.localeCompare(b.id);
    });

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="p-6 border-b border-gray-200 bg-slate-800 text-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3"><ClipboardList className="text-blue-400" size={32} /><h1 className="text-2xl font-black">Daily Attendance Entry</h1></div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg flex-1 min-w-[150px]"><Calendar size={20} className="text-gray-300" /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-white font-bold outline-none cursor-pointer w-full" /></div>
            <div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg flex-1 min-w-[150px]"><Filter size={20} className="text-gray-300" />
              <select value={employeeGroup} onChange={handleGroupChange} className="bg-transparent text-white font-bold outline-none cursor-pointer w-full">
                <option value="Regular" className="text-black">Regulars (Perm/Contact)</option>
                {casualGroups.map(g => <option key={g} value={g} className="text-black">Casual - {g}</option>)}
                {casualGroups.length === 0 && <option value="Unassigned Only" className="text-black">Casuals (Unassigned)</option>}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg flex-1 min-w-[150px]"><Clock size={20} className="text-gray-300" />
              <select value={shift} onChange={e => setShift(e.target.value)} className="bg-transparent text-white font-bold outline-none cursor-pointer w-full">
                {employeeGroup === 'Regular' ? (<><option value="A" className="text-black">Shift A</option><option value="G" className="text-black">G Shift</option><option value="B" className="text-black">Shift B</option><option value="C" className="text-black">Shift C</option></>) : (<><option value="Day" className="text-black">Day Shift</option><option value="Night" className="text-black">Night Shift</option></>)}
              </select>
            </div>
          </div>
        </div>

        {/* DYNAMIC TOP BANNER FOR LOCKS AND EDITS */}
        <div className={`p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 ${Object.keys(pendingChanges).length > 0 ? 'bg-blue-50 border-blue-200' : isLocked ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex-1">
            {Object.keys(pendingChanges).length > 0 ? (
              <p className="text-blue-800 font-bold flex items-center gap-2"><AlertCircle size={20}/> You have unsaved changes. Please click 'Save Updates' to apply them.</p>
            ) : isLocked ? (
              <p className="text-orange-800 font-bold flex items-center gap-2"><Lock size={20}/> Shift Locked. You can still mark Late In, Early Out, OT, or update Absent to Present.</p>
            ) : (
              <p className="text-gray-600 font-bold">Please ensure all entries are accurate. Once locked, bulk changes are restricted.</p>
            )}
          </div>
          <div>
            {isLocked ? (
              Object.keys(pendingChanges).length > 0 ? (
                <button onClick={savePendingChanges} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2 rounded-lg shadow-md transition-colors flex items-center gap-2 cursor-pointer">
                  <Save size={20}/> SAVE UPDATES ({Object.keys(pendingChanges).length})
                </button>
              ) : (
                <div className="bg-orange-100 text-orange-800 font-black px-6 py-2 rounded-lg border border-orange-300 shadow-sm flex items-center gap-2 cursor-not-allowed">
                  <Lock size={20}/> SHIFT LOCKED
                </div>
              )
            ) : (
              <button onClick={handleLockShift} className="bg-green-600 hover:bg-green-700 text-white font-black px-6 py-2 rounded-lg shadow-md transition-colors flex items-center gap-2 cursor-pointer">
                <Save size={20}/> SAVE & LOCK SHIFT
              </button>
            )}
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-700 font-bold border-b border-red-100">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="p-4 font-bold border-b">ID</th>
                <th className="p-4 font-bold border-b">Name</th>
                <th className="p-4 font-bold border-b">Assigned Group</th>
                <th className="p-4 font-bold border-b text-center">Mark Attendance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-500">Loading employees...</td></tr> : 
               filteredWorkers.length === 0 ? <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-500">No employees found.</td></tr> : 
               filteredWorkers.map(worker => {
                 const current = attendance[worker.id] || { status: '', late_in: false, early_out: false };
                 const original = originalAttendance[worker.id] || { status: '' };
                 const isUnassigned = !worker.worker_group || worker.worker_group.trim() === '';
                 const canHaveOT = worker.category === 'Permanent' || worker.category === 'Contact';
                 
                 const disablePresent = isLocked && current.status === 'PRESENT' && original.status === 'PRESENT';
                 const disableAbsent = isLocked && original.status === 'PRESENT';
                 const rowHasEdits = !!pendingChanges[worker.id];
                 
                 return (
                   <tr key={worker.id} className={`border-b transition-colors ${rowHasEdits ? 'bg-blue-50/40 border-blue-100' : current.status ? 'bg-green-50/20' : 'hover:bg-gray-50'}`}>
                     <td className="p-4 font-medium text-gray-900">{worker.id}</td>
                     <td className="p-4 font-bold text-blue-900">{worker.name}</td>
                     <td className="p-4">
                       {isUnassigned ? <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">Unassigned</span> : <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded text-sm">{worker.worker_group}</span>}
                     </td>
                     <td className="p-4 flex flex-col items-center gap-2">
                       <div className="flex justify-center gap-2">
                         <button onClick={() => updateAttendance(worker.id, { status: 'PRESENT' })} disabled={disablePresent} className={`px-4 py-2 rounded-lg font-black transition-all ${current.status === 'PRESENT' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'} ${disablePresent ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-100 cursor-pointer'}`}>PRESENT</button>
                         <button onClick={() => updateAttendance(worker.id, { status: 'ABSENT' })} disabled={disableAbsent} className={`px-4 py-2 rounded-lg font-black transition-all ${current.status === 'ABSENT' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'} ${disableAbsent ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100 cursor-pointer'}`}>ABSENT</button>
                         {current.status && !isLocked && (
                           <button onClick={() => clearAttendance(worker.id)} className="px-3 py-2 rounded-lg bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer" title="Undo"><RotateCcw size={20} /></button>
                         )}
                       </div>
                       
                       {current.status === 'PRESENT' && (
                         <div className="flex flex-col gap-2 mt-1 w-full max-w-sm">
                           <div className="flex items-center justify-between px-3 py-2 rounded border shadow-sm bg-white border-blue-200">
                             <label className="flex items-center gap-2 text-sm font-bold text-blue-900 cursor-pointer">
                               <input type="checkbox" checked={current.late_in} onChange={(e) => updateAttendance(worker.id, { late_in: e.target.checked })} className="w-4 h-4 accent-blue-600 cursor-pointer" /> Late In
                             </label>
                             {current.late_in && <input type="time" value={current.late_in_time || ''} onChange={(e) => updateAttendance(worker.id, { late_in_time: e.target.value })} className="border border-gray-300 rounded p-1 text-sm font-bold outline-none bg-white" />}
                           </div>
                           <div className="flex items-center justify-between px-3 py-2 rounded border shadow-sm bg-white border-blue-200">
                             <label className="flex items-center gap-2 text-sm font-bold text-blue-900 cursor-pointer">
                               <input type="checkbox" checked={current.early_out} onChange={(e) => updateAttendance(worker.id, { early_out: e.target.checked })} className="w-4 h-4 accent-blue-600 cursor-pointer" /> Early Out
                             </label>
                             {current.early_out && <input type="time" value={current.early_out_time || ''} onChange={(e) => updateAttendance(worker.id, { early_out_time: e.target.value })} className="border border-gray-300 rounded p-1 text-sm font-bold outline-none bg-white" />}
                           </div>
                           {canHaveOT && (
                             <div className="flex items-center justify-between px-3 py-2 rounded border shadow-sm bg-purple-50 border-purple-200">
                               <label className="text-sm font-bold text-purple-900">OT (Hours)</label>
                               <input type="number" step="0.5" min="0" placeholder="0" value={current.ot_hours || ''} onChange={(e) => updateAttendance(worker.id, { ot_hours: e.target.value })} className="border border-purple-300 rounded p-1 w-20 text-sm font-bold outline-none focus:border-purple-600 bg-white" />
                             </div>
                           )}
                         </div>
                       )}
                     </td>
                   </tr>
                 );
               })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}