import { useState, useEffect } from 'react';
import axios from 'axios';
// Notice the new "Lock" and "Save" icons imported below
import { ClipboardList, Calendar, Clock, Filter, RotateCcw, Lock, Save } from 'lucide-react';

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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeGroup, setEmployeeGroup] = useState('Regular'); 
  const [shift, setShift] = useState(getAutoShift('Regular')); 
  
  // NEW: State to track if the current shift is locked
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
      // Instantly assume it's loading and not locked when switching filters
      setIsLocked(false);
      const cachedWorkers = sessionStorage.getItem('cached_workers');
      if (cachedWorkers) { setWorkers(JSON.parse(cachedWorkers)); setLoading(false); } else { setLoading(true); }
      
      try {
        const workersRes = await axios.get('https://graphite-api.vercel.app/api/workers');
        const activeWorkers = workersRes.data.filter((w: any) => !w.is_archived);
        setWorkers(activeWorkers);
        sessionStorage.setItem('cached_workers', JSON.stringify(activeWorkers));

        // Fetch Attendance
        const attRes = await axios.get(`https://graphite-api.vercel.app/api/attendance?date=${date}&shift=${shift}`);
        const attMap: Record<string, AttData> = {};
        attRes.data.forEach((record: any) => {
          attMap[record.worker_id] = {
            status: record.status, late_in: record.late_in || false, early_out: record.early_out || false,
            late_in_time: record.late_in_time || '', early_out_time: record.early_out_time || '', ot_hours: record.ot_hours || ''
          };
        });
        setAttendance(attMap);

        // NEW: Fetch Lock Status
        const lockRes = await axios.get(`https://graphite-api.vercel.app/api/shift-lock?date=${date}&shift=${shift}&group=${employeeGroup}`);
        setIsLocked(lockRes.data.isLocked);
        
        setError('');
      } catch (err: any) { setError('Failed to load data from the server.'); } finally { setLoading(false); }
    };
    fetchData();
  }, [date, shift, employeeGroup]);

  // NEW: Function to lock the shift
  const handleLockShift = async () => {
    if (!window.confirm(`Are you sure you want to Save & Lock attendance for ${employeeGroup} on ${date} (Shift: ${shift})? You will not be able to make further changes.`)) return;
    try {
      await axios.post('https://graphite-api.vercel.app/api/shift-lock', { date, shift, group: employeeGroup, is_locked: true });
      setIsLocked(true);
      alert('Shift locked successfully! Only managers can modify these records now.');
    } catch (err) { alert('Failed to lock shift.'); }
  };

  const updateAttendance = async (worker_id: string, updates: Partial<AttData>) => {
    if (isLocked) return; // Extra layer of protection
    const current = attendance[worker_id] || { status: '', late_in: false, early_out: false, late_in_time: '', early_out_time: '', ot_hours: '' };
    const nextState = { ...current, ...updates };
    
    if (!nextState.late_in) nextState.late_in_time = '';
    if (!nextState.early_out) nextState.early_out_time = '';

    setAttendance(prev => ({ ...prev, [worker_id]: nextState }));
    try { await axios.post('https://graphite-api.vercel.app/api/attendance', { worker_id, date, shift, ...nextState }); } 
    catch (err) { alert(`Failed to save attendance for ${worker_id}.`); }
  };

  const clearAttendance = async (worker_id: string) => {
    if (isLocked) return; // Extra layer of protection
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

        {/* NEW: Lock & Save Banner */}
        <div className={`p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 ${isLocked ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex-1">
            {isLocked ? (
              <p className="text-red-700 font-bold flex items-center gap-2"><Lock size={20}/> This shift's attendance has been securely locked. No further changes can be made.</p>
            ) : (
              <p className="text-gray-600 font-bold">Please ensure all entries are accurate. Once saved and locked, only Managers can modify these records.</p>
            )}
          </div>
          <div>
            {isLocked ? (
              <div className="bg-red-100 text-red-800 font-black px-6 py-2 rounded-lg border border-red-300 shadow-sm flex items-center gap-2 cursor-not-allowed opacity-80">
                <Lock size={20}/> RECORD LOCKED
              </div>
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
                 const isUnassigned = !worker.worker_group || worker.worker_group.trim() === '';
                 const canHaveOT = worker.category === 'Permanent' || worker.category === 'Contact';
                 
                 return (
                   <tr key={worker.id} className={`border-b transition-colors ${current.status ? 'bg-blue-50/20' : 'hover:bg-gray-50'}`}>
                     <td className="p-4 font-medium text-gray-900">{worker.id}</td>
                     <td className="p-4 font-bold text-blue-900">{worker.name}</td>
                     <td className="p-4">
                       {isUnassigned ? <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">Unassigned</span> : <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded text-sm">{worker.worker_group}</span>}
                     </td>
                     <td className="p-4 flex flex-col items-center gap-2">
                       <div className="flex justify-center gap-2">
                         {/* DISABLED STATUS ADDED TO BUTTONS IF isLocked IS TRUE */}
                         <button onClick={() => updateAttendance(worker.id, { status: 'PRESENT' })} disabled={isLocked} className={`px-4 py-2 rounded-lg font-black transition-all ${current.status === 'PRESENT' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-100 cursor-pointer'}`}>PRESENT</button>
                         <button onClick={() => updateAttendance(worker.id, { status: 'ABSENT' })} disabled={isLocked} className={`px-4 py-2 rounded-lg font-black transition-all ${current.status === 'ABSENT' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100 cursor-pointer'}`}>ABSENT</button>
                         {current.status && !isLocked && (
                           <button onClick={() => clearAttendance(worker.id)} className="px-3 py-2 rounded-lg bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer" title="Undo"><RotateCcw size={20} /></button>
                         )}
                       </div>
                       
                       {current.status === 'PRESENT' && (
                         <div className="flex flex-col gap-2 mt-1 w-full max-w-sm">
                           <div className={`flex items-center justify-between px-3 py-2 rounded border shadow-sm ${isLocked ? 'bg-gray-100 border-gray-200' : 'bg-white border-blue-200'}`}>
                             <label className={`flex items-center gap-2 text-sm font-bold text-blue-900 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                               <input type="checkbox" checked={current.late_in} disabled={isLocked} onChange={(e) => updateAttendance(worker.id, { late_in: e.target.checked })} className={`w-4 h-4 accent-blue-600 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`} /> Late In
                             </label>
                             {current.late_in && <input type="time" disabled={isLocked} value={current.late_in_time || ''} onChange={(e) => updateAttendance(worker.id, { late_in_time: e.target.value })} className={`border border-gray-300 rounded p-1 text-sm font-bold outline-none ${isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`} />}
                           </div>
                           <div className={`flex items-center justify-between px-3 py-2 rounded border shadow-sm ${isLocked ? 'bg-gray-100 border-gray-200' : 'bg-white border-blue-200'}`}>
                             <label className={`flex items-center gap-2 text-sm font-bold text-blue-900 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                               <input type="checkbox" checked={current.early_out} disabled={isLocked} onChange={(e) => updateAttendance(worker.id, { early_out: e.target.checked })} className={`w-4 h-4 accent-blue-600 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`} /> Early Out
                             </label>
                             {current.early_out && <input type="time" disabled={isLocked} value={current.early_out_time || ''} onChange={(e) => updateAttendance(worker.id, { early_out_time: e.target.value })} className={`border border-gray-300 rounded p-1 text-sm font-bold outline-none ${isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`} />}
                           </div>
                           {canHaveOT && (
                             <div className={`flex items-center justify-between px-3 py-2 rounded border shadow-sm ${isLocked ? 'bg-gray-100 border-gray-200' : 'bg-purple-50 border-purple-200'}`}>
                               <label className={`text-sm font-bold ${isLocked ? 'text-gray-500' : 'text-purple-900'}`}>OT (Hours)</label>
                               <input type="number" step="0.5" min="0" placeholder="0" disabled={isLocked} value={current.ot_hours || ''} onChange={(e) => updateAttendance(worker.id, { ot_hours: e.target.value })} className={`border rounded p-1 w-20 text-sm font-bold outline-none ${isLocked ? 'bg-gray-100 border-gray-300 cursor-not-allowed text-gray-500' : 'border-purple-300 focus:border-purple-600 bg-white'}`} />
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