import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserX, Activity, Calendar, FileText, Edit, Clock, Filter, ClipboardList, RotateCcw } from 'lucide-react';
import ManagerAuth from '../components/ManagerAuth'; 

export default function Dashboard() {
  const getToday = () => new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState('Overview'); 

  // --- OVERVIEW TAB STATE ---
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);

  // --- MODIFY TAB STATE ---
  const [modDate, setModDate] = useState(getToday());
  const [modGroup, setModGroup] = useState('Regular');
  const [modShift, setModShift] = useState('G');
  const [modWorkers, setModWorkers] = useState<any[]>([]);
  const [modAttendance, setModAttendance] = useState<Record<string, any>>({});
  const [modLoading, setModLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'Overview') return;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`https://graphite-api.vercel.app/api/dashboard-stats?start=${startDate}&end=${endDate}`);
        setStats(response.data);
      } catch (err: any) { console.error(err); } finally { setLoading(false); }
    };
    fetchStats();
  }, [startDate, endDate, activeTab]);

  useEffect(() => {
    if (activeTab !== 'Modify') return;
    const fetchModData = async () => {
      setModLoading(true);
      try {
        const wRes = await axios.get('https://graphite-api.vercel.app/api/workers');
        setModWorkers(wRes.data.filter((w: any) => !w.is_archived)); 
        const aRes = await axios.get(`https://graphite-api.vercel.app/api/attendance?date=${modDate}&shift=${modShift}`);
        const aMap: Record<string, any> = {};
        aRes.data.forEach((r: any) => {
          aMap[r.worker_id] = { status: r.status, late_in: r.late_in, early_out: r.early_out, late_in_time: r.late_in_time || '', early_out_time: r.early_out_time || '' };
        });
        setModAttendance(aMap);
      } catch (err) { console.error(err); } finally { setModLoading(false); }
    };
    fetchModData();
  }, [modDate, modShift, activeTab]);

  const setPreset = (type: string) => {
    const today = new Date(); setEndDate(getToday());
    if (type === 'Today') setStartDate(getToday());
    if (type === 'Week') {
      const first = today.getDate() - today.getDay() + 1;
      setStartDate(new Date(today.setDate(first)).toISOString().split('T')[0]);
    }
    if (type === 'Month') setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
    if (type === 'Year') setStartDate(new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]);
  };

  const downloadRawReport = async () => {
    try {
      const res = await axios.get(`https://graphite-api.vercel.app/api/reports/attendance?start=${startDate}&end=${endDate}`);
      if (res.data.length === 0) return alert('No attendance records found.');
      // UPDATED HEADERS for Time Tracking
      const headers = ['Date', 'Shift', 'Emp ID', 'Name', 'Category', 'Group', 'Status', 'Late In', 'Time In', 'Early Out', 'Time Out'];
      const csvRows = [headers.join(',')];
      res.data.forEach((r: any) => csvRows.push([r.date, r.shift, r.id, `"${r.name}"`, `"${r.category}"`, `"${r.worker_group || ''}"`, r.status, r.late_in ? 'Yes' : 'No', r.late_in_time || '-', r.early_out ? 'Yes' : 'No', r.early_out_time || '-'].join(',')));
      triggerDownload(csvRows, `Raw_Attendance_${startDate}_to_${endDate}.csv`);
    } catch (err) { alert('Failed to download report.'); }
  };

  const downloadEmployeeSummary = async () => {
    try {
      const res = await axios.get(`https://graphite-api.vercel.app/api/reports/employee-summary?start=${startDate}&end=${endDate}`);
      if (res.data.length === 0) return alert('No records found.');
      const headers = ['Emp ID', 'Name', 'Category', 'Group', 'Date of Joining', 'Active Status', 'Total Present Days', 'Total Absent Days', 'Total Late Ins', 'Total Early Outs'];
      const csvRows = [headers.join(',')];
      res.data.forEach((r: any) => csvRows.push([r.id, `"${r.name}"`, `"${r.category}"`, `"${r.worker_group || ''}"`, r.date_of_joining || 'N/A', r.is_archived ? 'Archived' : 'Active', r.total_present, r.total_absent, r.total_late_in, r.total_early_out].join(',')));
      triggerDownload(csvRows, `Employee_Summary_${startDate}_to_${endDate}.csv`);
    } catch (err) { alert('Failed to download report.'); }
  };

  const triggerDownload = (csvRows: string[], filename: string) => {
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.setAttribute('href', url); a.setAttribute('download', filename); a.click();
  };

  const handleModGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const group = e.target.value; setModGroup(group);
    if (group !== 'Regular') setModShift('Day'); else setModShift('G');
  };

  // NEW: Unified Update for Manager Edit Mode
  const updateModAttendance = async (worker_id: string, updates: any) => {
    const current = modAttendance[worker_id] || { status: '', late_in: false, early_out: false, late_in_time: '', early_out_time: '' };
    const nextState = { ...current, ...updates };
    if (!nextState.late_in) nextState.late_in_time = '';
    if (!nextState.early_out) nextState.early_out_time = '';

    setModAttendance(prev => ({ ...prev, [worker_id]: nextState }));
    try { await axios.post('https://graphite-api.vercel.app/api/attendance', { worker_id, date: modDate, shift: modShift, ...nextState }); } 
    catch (err) { alert(`Failed to save for ${worker_id}.`); }
  };

  // NEW: Clear Button for Manager Edit Mode
  const clearModAttendance = async (worker_id: string) => {
    if (!window.confirm('Delete/undo this attendance record?')) return;
    setModAttendance(prev => { const copy = { ...prev }; delete copy[worker_id]; return copy; });
    try { await axios.delete(`https://graphite-api.vercel.app/api/attendance/record?worker_id=${worker_id}&date=${modDate}&shift=${modShift}`); } 
    catch (err) { alert(`Failed to clear record.`); }
  };

  const casualGroups = Array.from(new Set(modWorkers.filter(w => w.category === 'Casual' && w.worker_group).map(w => w.worker_group as string))).sort();
  const filteredModWorkers = modWorkers.filter(w => {
    if (modGroup === 'Regular') return w.category === 'Permanent' || w.category === 'Contact';
    const isUnassignedCasual = w.category === 'Casual' && (!w.worker_group || w.worker_group.trim() === '');
    if (modShift === 'Day' && isUnassignedCasual) return true;
    return w.worker_group === modGroup;
  });

  return (
    <ManagerAuth>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-wrap gap-4 mb-6 border-b border-gray-300 pb-4">
            <button onClick={() => setActiveTab('Overview')} className={`px-6 py-2 font-black rounded-lg transition-all ${activeTab === 'Overview' ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><Activity size={18} className="inline mr-2 -mt-1" /> Overview & Reports</button>
            <button onClick={() => setActiveTab('Modify')} className={`px-6 py-2 font-black rounded-lg transition-all ${activeTab === 'Modify' ? 'bg-purple-600 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><Edit size={18} className="inline mr-2 -mt-1" /> Edit Attendance Logs</button>
          </div>

          {activeTab === 'Overview' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Report Date Filters</h3>
                <div className="flex flex-wrap gap-3 mb-6">
                  {['Today', 'Week', 'Month', 'Year'].map(type => (
                    <button key={type} onClick={() => setPreset(type)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors border border-slate-300 cursor-pointer">This {type}</button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2"><Calendar className="text-gray-500" size={20} /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="font-bold bg-transparent outline-none cursor-pointer" /></div>
                  <span className="text-gray-400 font-black">TO</span>
                  <div className="flex items-center gap-2"><Calendar className="text-gray-500" size={20} /><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="font-bold bg-transparent outline-none cursor-pointer" /></div>
                </div>
                <div className="mt-6 flex flex-wrap gap-4">
                  <button onClick={downloadEmployeeSummary} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-3 rounded-lg shadow-sm transition-colors cursor-pointer"><Users size={20} /> Download Employee-wise Summary</button>
                  <button onClick={downloadRawReport} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-black px-4 py-3 rounded-lg shadow-sm transition-colors cursor-pointer"><FileText size={20} /> Download Detailed Log (Raw)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4"><div className="p-4 bg-blue-100 rounded-lg text-blue-600"><Users size={32} /></div><div><p className="text-gray-500 font-bold uppercase text-sm">Active Employees</p><h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.total}</h2></div></div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4"><div className="p-4 bg-green-100 rounded-lg text-green-600"><UserCheck size={32} /></div><div><p className="text-gray-500 font-bold uppercase text-sm">Present in Range</p><h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.present}</h2></div></div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4"><div className="p-4 bg-red-100 rounded-lg text-red-600"><UserX size={32} /></div><div><p className="text-gray-500 font-bold uppercase text-sm">Absent in Range</p><h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.absent}</h2></div></div>
              </div>
            </div>
          )}

          {activeTab === 'Modify' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
              <div className="p-6 border-b border-gray-200 bg-purple-900 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3"><ClipboardList className="text-purple-300" size={32} /><h1 className="text-2xl font-black">Manager Edit Mode</h1></div>
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-purple-800 p-2 rounded-lg flex-1 min-w-[150px] border border-purple-700"><Calendar size={20} className="text-purple-300" /><input type="date" value={modDate} onChange={e => setModDate(e.target.value)} className="bg-transparent text-white font-bold outline-none cursor-pointer w-full"/></div>
                  <div className="flex items-center gap-2 bg-purple-800 p-2 rounded-lg flex-1 min-w-[150px] border border-purple-700"><Filter size={20} className="text-purple-300" />
                    <select value={modGroup} onChange={handleModGroupChange} className="bg-transparent text-white font-bold outline-none cursor-pointer w-full">
                      <option value="Regular" className="text-black">Regulars</option>
                      {casualGroups.map(g => <option key={g} value={g} className="text-black">Casual - {g}</option>)}
                      {casualGroups.length === 0 && <option value="Unassigned Only" className="text-black">Casuals (Unassigned)</option>}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-800 p-2 rounded-lg flex-1 min-w-[150px] border border-purple-700"><Clock size={20} className="text-purple-300" />
                    <select value={modShift} onChange={e => setModShift(e.target.value)} className="bg-transparent text-white font-bold outline-none cursor-pointer w-full">
                      {modGroup === 'Regular' ? (<><option value="G" className="text-black">G Shift</option><option value="A" className="text-black">Shift A</option><option value="B" className="text-black">Shift B</option><option value="C" className="text-black">Shift C</option></>) : (<><option value="Day" className="text-black">Day Shift</option><option value="Night" className="text-black">Night Shift</option></>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      <th className="p-4 font-bold border-b">ID</th>
                      <th className="p-4 font-bold border-b">Name</th>
                      <th className="p-4 font-bold border-b">Group</th>
                      <th className="p-4 font-bold border-b text-center">Modify Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modLoading ? <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-500">Loading records...</td></tr> :
                     filteredModWorkers.length === 0 ? <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-500">No employees found.</td></tr> :
                     filteredModWorkers.map(worker => {
                       const current = modAttendance[worker.id] || { status: '', late_in: false, early_out: false };
                       return (
                         <tr key={worker.id} className={`border-b transition-colors ${current.status ? 'bg-purple-50/30' : 'hover:bg-gray-50'}`}>
                           <td className="p-4 font-medium text-gray-900">{worker.id}</td>
                           <td className="p-4 font-bold text-blue-900">{worker.name}</td>
                           <td className="p-4"><span className="px-3 py-1 bg-gray-200 rounded-full text-xs font-bold text-gray-700">{worker.worker_group || 'Unassigned'}</span></td>
                           <td className="p-4 flex flex-col items-center gap-2">
                             <div className="flex justify-center gap-2">
                               <button onClick={() => updateModAttendance(worker.id, { status: 'PRESENT' })} className={`px-4 py-2 rounded-lg font-black transition-all ${current.status === 'PRESENT' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`}>PRESENT</button>
                               <button onClick={() => updateModAttendance(worker.id, { status: 'ABSENT' })} className={`px-4 py-2 rounded-lg font-black transition-all ${current.status === 'ABSENT' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}`}>ABSENT</button>
                               {current.status && (
                                 <button onClick={() => clearModAttendance(worker.id)} className="px-3 py-2 rounded-lg bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-700 transition-colors" title="Undo / Clear Marking">
                                   <RotateCcw size={20} />
                                 </button>
                               )}
                             </div>
                             
                             {current.status === 'PRESENT' && (
                               <div className="flex flex-col gap-2 mt-1 w-full max-w-sm">
                                 <div className="flex items-center justify-between bg-white px-3 py-2 rounded border border-purple-200 shadow-sm">
                                   <label className="flex items-center gap-2 text-sm font-bold text-purple-900 cursor-pointer">
                                     <input type="checkbox" checked={current.late_in} onChange={(e) => updateModAttendance(worker.id, { late_in: e.target.checked })} className="w-4 h-4 cursor-pointer accent-purple-600" /> Late In
                                   </label>
                                   {current.late_in && <input type="time" value={current.late_in_time || ''} onChange={(e) => updateModAttendance(worker.id, { late_in_time: e.target.value })} className="border border-gray-300 rounded p-1 text-sm font-bold outline-none focus:border-purple-500" />}
                                 </div>
                                 <div className="flex items-center justify-between bg-white px-3 py-2 rounded border border-purple-200 shadow-sm">
                                   <label className="flex items-center gap-2 text-sm font-bold text-purple-900 cursor-pointer">
                                     <input type="checkbox" checked={current.early_out} onChange={(e) => updateModAttendance(worker.id, { early_out: e.target.checked })} className="w-4 h-4 cursor-pointer accent-purple-600" /> Early Out
                                   </label>
                                   {current.early_out && <input type="time" value={current.early_out_time || ''} onChange={(e) => updateModAttendance(worker.id, { early_out_time: e.target.value })} className="border border-gray-300 rounded p-1 text-sm font-bold outline-none focus:border-purple-500" />}
                                 </div>
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
          )}
        </div>
      </div>
    </ManagerAuth>
  );
}