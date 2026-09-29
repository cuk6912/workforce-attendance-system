import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserX, Activity, Calendar, FileText, Edit, Clock, Filter, ClipboardList, RotateCcw, ChevronDown, ChevronUp, Search } from 'lucide-react';
import ManagerAuth from '../components/ManagerAuth'; 

export default function ManagerDashboard() {
  const getToday = () => new Date().toISOString().split('T')[0];
  const getCurrentMonth = () => new Date().toISOString().slice(0, 7);
  
  const [activeTab, setActiveTab] = useState('Overview'); 

  // --- OVERVIEW TAB STATE ---
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  
  // NEW: Custom Date for Shift Viewer
  const [shiftViewDate, setShiftViewDate] = useState(getToday());
  const [shiftViewData, setShiftViewData] = useState<Record<string, { present: any[], absent: any[] }>>({});
  const [expandedShifts, setExpandedShifts] = useState<Record<string, boolean>>({});

  // --- HISTORY TAB STATE (NEW) ---
  const [histStart, setHistStart] = useState(getToday());
  const [histEnd, setHistEnd] = useState(getToday());
  const [histEmp, setHistEmp] = useState('');
  const [histWorkers, setHistWorkers] = useState<any[]>([]);
  const [histData, setHistData] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  // --- OT REPORT TAB STATE ---
  const [otMonth, setOtMonth] = useState(getCurrentMonth());
  const [otData, setOtData] = useState<any[]>([]);
  const [otLoading, setOtLoading] = useState(false);

  // --- MODIFY TAB STATE ---
  const [modDate, setModDate] = useState(getToday());
  const [modGroup, setModGroup] = useState('Regular');
  const [modShift, setModShift] = useState('G');
  const [modWorkers, setModWorkers] = useState<any[]>([]);
  const [modAttendance, setModAttendance] = useState<Record<string, any>>({});
  const [modLoading, setModLoading] = useState(false);

  // FETCH OVERVIEW STATS
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

  // FETCH SHIFT VIEW DATA
  useEffect(() => {
    if (activeTab !== 'Overview') return;
    const fetchShiftView = async () => {
      try {
        const res = await axios.get(`https://graphite-api.vercel.app/api/dashboard/today-list?date=${shiftViewDate}`);
        const grouped = res.data.reduce((acc: any, curr: any) => {
          if (!acc[curr.shift]) acc[curr.shift] = { present: [], absent: [] };
          if (curr.status === 'PRESENT') acc[curr.shift].present.push(curr);
          if (curr.status === 'ABSENT') acc[curr.shift].absent.push(curr);
          return acc;
        }, {});
        setShiftViewData(grouped);
      } catch (err: any) { console.error(err); }
    };
    fetchShiftView();
  }, [shiftViewDate, activeTab]);

  // FETCH EMPLOYEE HISTORY DATA
  useEffect(() => {
    if (activeTab !== 'History') return;
    const fetchHist = async () => {
      setHistLoading(true);
      try {
        if (histWorkers.length === 0) {
          const wRes = await axios.get('https://graphite-api.vercel.app/api/workers');
          setHistWorkers(wRes.data);
          if (!histEmp && wRes.data.length > 0) setHistEmp(wRes.data[0].id);
        }
        const res = await axios.get(`https://graphite-api.vercel.app/api/reports/attendance?start=${histStart}&end=${histEnd}`);
        setHistData(res.data);
      } catch (err) { console.error(err); } finally { setHistLoading(false); }
    };
    fetchHist();
  }, [histStart, histEnd, activeTab, histWorkers.length, histEmp]);

  // FETCH OT MONTHLY DATA
  useEffect(() => {
    if (activeTab !== 'OT') return;
    const fetchOt = async () => {
      setOtLoading(true);
      try {
        const [year, month] = otMonth.split('-');
        const start = `${otMonth}-01`;
        const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
        const res = await axios.get(`https://graphite-api.vercel.app/api/reports/employee-summary?start=${start}&end=${end}`);
        const employeesWithOT = res.data.filter((emp: any) => parseFloat(emp.total_ot_hours) > 0);
        setOtData(employeesWithOT);
      } catch (err) { console.error(err); } finally { setOtLoading(false); }
    };
    fetchOt();
  }, [otMonth, activeTab]);

  // FETCH MODIFY DATA
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
          aMap[r.worker_id] = { status: r.status, late_in: r.late_in, early_out: r.early_out, late_in_time: r.late_in_time || '', early_out_time: r.early_out_time || '', ot_hours: r.ot_hours || '' };
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

  const toggleShiftExpand = (shift: string) => {
    setExpandedShifts(prev => ({ ...prev, [shift]: !prev[shift] }));
  };

  const triggerDownload = (csvRows: string[], filename: string) => {
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.setAttribute('href', url); a.setAttribute('download', filename); a.click();
  };

  const downloadRawReport = async () => {
    try {
      const res = await axios.get(`https://graphite-api.vercel.app/api/reports/attendance?start=${startDate}&end=${endDate}`);
      if (res.data.length === 0) return alert('No attendance records found.');
      const headers = ['Date', 'Shift', 'Emp ID', 'Name', 'Category', 'Group', 'Status', 'Late In', 'Time In', 'Early Out', 'Time Out', 'OT Hours'];
      const csvRows = [headers.join(',')];
      res.data.forEach((r: any) => csvRows.push([r.date, r.shift, r.id, `"${r.name}"`, `"${r.category}"`, `"${r.worker_group || ''}"`, r.status, r.late_in ? 'Yes' : 'No', r.late_in_time || '-', r.early_out ? 'Yes' : 'No', r.early_out_time || '-', r.ot_hours || '0'].join(',')));
      triggerDownload(csvRows, `Raw_Attendance_${startDate}_to_${endDate}.csv`);
    } catch (err) { alert('Failed to download report.'); }
  };

  const downloadEmployeeSummary = async () => {
    try {
      const res = await axios.get(`https://graphite-api.vercel.app/api/reports/employee-summary?start=${startDate}&end=${endDate}`);
      if (res.data.length === 0) return alert('No records found.');
      const headers = ['Emp ID', 'Name', 'Category', 'Group', 'Active Status', 'Total Present Days', 'Total Absent', 'Total Late Ins', 'Total Early Outs', 'Total OT Hours'];
      const csvRows = [headers.join(',')];
      res.data.forEach((r: any) => csvRows.push([r.id, `"${r.name}"`, `"${r.category}"`, `"${r.worker_group || ''}"`, r.is_archived ? 'Archived' : 'Active', r.total_present, r.total_absent, r.total_late_in, r.total_early_out, r.total_ot_hours].join(',')));
      triggerDownload(csvRows, `Employee_Summary_${startDate}_to_${endDate}.csv`);
    } catch (err) { alert('Failed to download report.'); }
  };

  const downloadOTReport = () => {
    if (otData.length === 0) return alert('No OT records found for this month.');
    const headers = ['Emp ID', 'Name', 'Category', 'Group', 'Total OT Hours'];
    const csvRows = [headers.join(',')];
    otData.forEach((r: any) => csvRows.push([r.id, `"${r.name}"`, `"${r.category}"`, `"${r.worker_group || ''}"`, r.total_ot_hours].join(',')));
    triggerDownload(csvRows, `OT_Report_${otMonth}.csv`);
  };

  const updateModAttendance = async (worker_id: string, updates: any) => {
    const current = modAttendance[worker_id] || { status: '', late_in: false, early_out: false, late_in_time: '', early_out_time: '', ot_hours: '' };
    const nextState = { ...current, ...updates };
    if (!nextState.late_in) nextState.late_in_time = '';
    if (!nextState.early_out) nextState.early_out_time = '';
    setModAttendance(prev => ({ ...prev, [worker_id]: nextState }));
    try { await axios.post('https://graphite-api.vercel.app/api/attendance', { worker_id, date: modDate, shift: modShift, ...nextState }); } 
    catch (err) { alert(`Failed to save for ${worker_id}.`); }
  };

  const clearModAttendance = async (worker_id: string) => {
    if (!window.confirm('Delete/undo this attendance record?')) return;
    setModAttendance(prev => { const copy = { ...prev }; delete copy[worker_id]; return copy; });
    try { await axios.delete(`https://graphite-api.vercel.app/api/attendance/record?worker_id=${worker_id}&date=${modDate}&shift=${modShift}`); } 
    catch (err) { alert(`Failed to clear record.`); }
  };

  const handleModGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const group = e.target.value; setModGroup(group);
    if (group !== 'Regular') setModShift('Day'); else setModShift('G');
  };

  const casualGroups = Array.from(new Set(modWorkers.filter(w => w.category === 'Casual' && w.worker_group).map(w => w.worker_group as string))).sort();
  const filteredModWorkers = modWorkers.filter(w => {
    if (modGroup === 'Regular') return w.category === 'Permanent' || w.category === 'Contact';
    const isUnassignedCasual = w.category === 'Casual' && (!w.worker_group || w.worker_group.trim() === '');
    if (modShift === 'Day' && isUnassignedCasual) return true;
    return w.worker_group === modGroup;
  });

  const filteredHistory = histData.filter(r => r.id === histEmp);

  return (
    <ManagerAuth>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-wrap gap-4 mb-6 border-b border-gray-300 pb-4">
            <button onClick={() => setActiveTab('Overview')} className={`px-5 py-2 font-black rounded-lg transition-all ${activeTab === 'Overview' ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><Activity size={18} className="inline mr-2 -mt-1" /> Overview</button>
            <button onClick={() => setActiveTab('History')} className={`px-5 py-2 font-black rounded-lg transition-all ${activeTab === 'History' ? 'bg-teal-600 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><Search size={18} className="inline mr-2 -mt-1" /> Employee History</button>
            <button onClick={() => setActiveTab('Modify')} className={`px-5 py-2 font-black rounded-lg transition-all ${activeTab === 'Modify' ? 'bg-purple-600 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><Edit size={18} className="inline mr-2 -mt-1" /> Edit Logs</button>
            <button onClick={() => setActiveTab('OT')} className={`px-5 py-2 font-black rounded-lg transition-all ${activeTab === 'OT' ? 'bg-orange-500 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><Clock size={18} className="inline mr-2 -mt-1" /> Monthly OT</button>
          </div>

          {/* OVERVIEW TAB */}
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
                    <button onClick={downloadEmployeeSummary} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-3 rounded-lg shadow-sm"><Users size={20} /> Employee Summary CSV</button>
                    <button onClick={downloadRawReport} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-black px-4 py-3 rounded-lg shadow-sm"><FileText size={20} /> Detailed Log CSV</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4"><div className="p-4 bg-blue-100 rounded-lg text-blue-600"><Users size={32} /></div><div><p className="text-gray-500 font-bold uppercase text-sm">Active Employees</p><h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.total}</h2></div></div>
                 <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4"><div className="p-4 bg-green-100 rounded-lg text-green-600"><UserCheck size={32} /></div><div><p className="text-gray-500 font-bold uppercase text-sm">Present in Range</p><h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.present}</h2></div></div>
                 <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4"><div className="p-4 bg-red-100 rounded-lg text-red-600"><UserX size={32} /></div><div><p className="text-gray-500 font-bold uppercase text-sm">Absent in Range</p><h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.absent}</h2></div></div>
               </div>

               {/* NEW: Shift Viewer with Date Picker */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-4 border-b pb-4 gap-4">
                   <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><Clock size={24} className="text-blue-600"/> Daily Shift-wise Attendance</h3>
                   <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
                     <Calendar size={20} className="text-blue-600" />
                     <input type="date" value={shiftViewDate} onChange={e => setShiftViewDate(e.target.value)} className="bg-transparent font-bold text-blue-900 outline-none cursor-pointer" />
                   </div>
                 </div>
                 
                 {Object.keys(shiftViewData).length === 0 ? (
                   <p className="text-gray-500 font-bold text-center p-4">No attendance marked for {shiftViewDate}.</p>
                 ) : (
                   <div className="space-y-4">
                     {Object.entries(shiftViewData).map(([shiftName, data]) => (
                       <div key={shiftName} className="border border-gray-200 rounded-lg overflow-hidden">
                         <button onClick={() => toggleShiftExpand(shiftName)} className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                           <span className="font-black text-lg text-slate-800">Shift: {shiftName}</span>
                           <div className="flex items-center gap-4">
                             <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded">{data.present.length} Present</span>
                             <span className="text-sm font-bold text-red-700 bg-red-100 px-2 py-1 rounded">{data.absent.length} Absent</span>
                             {expandedShifts[shiftName] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                           </div>
                         </button>
                         
                         {expandedShifts[shiftName] && (
                           <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-200">
                             <div>
                               <h4 className="font-bold text-green-700 mb-2 border-b border-green-200 pb-1">Present Employees</h4>
                               <ul className="space-y-1">
                                 {data.present.length === 0 ? <li className="text-gray-400 italic">None</li> : data.present.map(emp => (
                                   <li key={emp.id} className="text-sm font-medium flex justify-between">
                                     <span>{emp.name} <span className="text-xs text-gray-500">({emp.id})</span></span>
                                     {emp.ot_hours > 0 && <span className="text-xs font-bold text-purple-600 bg-purple-100 px-1.5 rounded">OT: {emp.ot_hours}h</span>}
                                   </li>
                                 ))}
                               </ul>
                             </div>
                             <div>
                               <h4 className="font-bold text-red-700 mb-2 border-b border-red-200 pb-1">Absent Employees</h4>
                               <ul className="space-y-1">
                                 {data.absent.length === 0 ? <li className="text-gray-400 italic">None</li> : data.absent.map(emp => (
                                   <li key={emp.id} className="text-sm font-medium">{emp.name} <span className="text-xs text-gray-500">({emp.id})</span></li>
                                 ))}
                               </ul>
                             </div>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>
          )}

          {/* NEW: EMPLOYEE HISTORY TAB */}
          {activeTab === 'History' && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn p-6">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4"><Search className="text-teal-600" size={32} /><h1 className="text-2xl font-black text-gray-800">Employee History Viewer</h1></div>
                
                <div className="flex flex-wrap gap-4 w-full bg-teal-50 p-4 rounded-lg border border-teal-200 mb-6">
                  <div className="flex items-center gap-2 flex-1 min-w-[150px]"><Calendar size={20} className="text-teal-700" /><input type="date" value={histStart} onChange={e => setHistStart(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer w-full"/></div>
                  <span className="font-black text-teal-800 pt-1">TO</span>
                  <div className="flex items-center gap-2 flex-1 min-w-[150px]"><Calendar size={20} className="text-teal-700" /><input type="date" value={histEnd} onChange={e => setHistEnd(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer w-full"/></div>
                  
                  <div className="flex items-center gap-2 flex-1 min-w-[200px] border-l border-teal-300 pl-4">
                    <Users size={20} className="text-teal-700" />
                    <select value={histEmp} onChange={e => setHistEmp(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer w-full">
                      {histWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700">
                        <th className="p-4 font-bold border-b">Date</th>
                        <th className="p-4 font-bold border-b">Shift</th>
                        <th className="p-4 font-bold border-b">Status</th>
                        <th className="p-4 font-bold border-b">Time Tracking</th>
                        <th className="p-4 font-bold border-b text-right text-purple-600">OT Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {histLoading ? <tr><td colSpan={5} className="p-8 text-center font-bold text-gray-500">Loading history...</td></tr> :
                       filteredHistory.length === 0 ? <tr><td colSpan={5} className="p-8 text-center font-bold text-gray-500">No attendance records found for this date range.</td></tr> :
                       filteredHistory.map((r, i) => (
                         <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                           <td className="p-4 font-bold text-gray-900">{r.date}</td>
                           <td className="p-4 font-bold text-gray-700">{r.shift}</td>
                           <td className="p-4">
                             {r.status === 'PRESENT' ? <span className="text-green-700 bg-green-100 px-2 py-1 rounded font-bold text-sm">PRESENT</span> : <span className="text-red-700 bg-red-100 px-2 py-1 rounded font-bold text-sm">ABSENT</span>}
                           </td>
                           <td className="p-4">
                             <div className="flex flex-col gap-1 text-sm">
                               {r.late_in && <span className="text-orange-700 font-bold">Late In: {r.late_in_time}</span>}
                               {r.early_out && <span className="text-blue-700 font-bold">Early Out: {r.early_out_time}</span>}
                               {!r.late_in && !r.early_out && <span className="text-gray-400 italic">Standard</span>}
                             </div>
                           </td>
                           <td className="p-4 font-black text-right text-purple-600">{r.ot_hours > 0 ? r.ot_hours : '-'}</td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

          {/* OT MONTHLY REPORT TAB */}
          {activeTab === 'OT' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3"><Clock className="text-orange-500" size={32} /><h2 className="text-2xl font-black text-gray-800">Employee-Wise OT Report</h2></div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-lg border border-orange-200">
                    <Calendar size={20} className="text-orange-600" />
                    <input type="month" value={otMonth} onChange={e => setOtMonth(e.target.value)} className="bg-transparent font-bold text-orange-900 outline-none cursor-pointer" />
                  </div>
                  <button onClick={downloadOTReport} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
                    <FileText size={18}/> Download OT CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      <th className="p-4 font-bold border-b">ID</th>
                      <th className="p-4 font-bold border-b">Name</th>
                      <th className="p-4 font-bold border-b">Group</th>
                      <th className="p-4 font-bold border-b text-right text-orange-600">Total OT Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otLoading ? <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-500">Calculating OT...</td></tr> :
                     otData.length === 0 ? <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-500">No overtime recorded for this month.</td></tr> :
                     otData.map(emp => (
                       <tr key={emp.id} className="border-b hover:bg-gray-50 transition-colors">
                         <td className="p-4 font-medium text-gray-900">{emp.id}</td>
                         <td className="p-4 font-bold text-blue-900">{emp.name}</td>
                         <td className="p-4"><span className="px-3 py-1 bg-gray-200 rounded-full text-xs font-bold text-gray-700">{emp.worker_group || 'N/A'}</span></td>
                         <td className="p-4 font-black text-right text-orange-600 text-lg">{emp.total_ot_hours}</td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MANAGER EDIT MODE TAB */}
          {activeTab === 'Modify' && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn p-6">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4"><ClipboardList className="text-purple-600" size={32} /><h1 className="text-2xl font-black text-gray-800">Manager Edit Mode</h1></div>
                
                <div className="flex flex-wrap gap-4 w-full bg-purple-50 p-4 rounded-lg border border-purple-200 mb-6">
                  <div className="flex items-center gap-2 flex-1 min-w-[150px]"><Calendar size={20} className="text-purple-700" /><input type="date" value={modDate} onChange={e => setModDate(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer w-full"/></div>
                  <div className="flex items-center gap-2 flex-1 min-w-[150px]"><Filter size={20} className="text-purple-700" />
                    <select value={modGroup} onChange={handleModGroupChange} className="bg-transparent font-bold outline-none cursor-pointer w-full">
                      <option value="Regular">Regulars</option>
                      {casualGroups.map(g => <option key={g} value={g}>{g}</option>)}
                      {casualGroups.length === 0 && <option value="Unassigned Only">Casuals (Unassigned)</option>}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-[150px]"><Clock size={20} className="text-purple-700" />
                    <select value={modShift} onChange={e => setModShift(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer w-full">
                      {modGroup === 'Regular' ? (<><option value="G">G Shift</option><option value="A">Shift A</option><option value="B">Shift B</option><option value="C">Shift C</option></>) : (<><option value="Day">Day Shift</option><option value="Night">Night Shift</option></>)}
                    </select>
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
                         const canHaveOT = worker.category === 'Permanent' || worker.category === 'Contact';
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
                                   <button onClick={() => clearModAttendance(worker.id)} className="px-3 py-2 rounded-lg bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-700 transition-colors" title="Undo / Clear Marking"><RotateCcw size={20} /></button>
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
                                   {canHaveOT && (
                                     <div className="flex items-center justify-between bg-purple-50 px-3 py-2 rounded border border-purple-200 shadow-sm">
                                       <label className="text-sm font-bold text-purple-900">OT (Hours)</label>
                                       <input type="number" step="0.5" min="0" placeholder="0" value={current.ot_hours || ''} onChange={(e) => updateModAttendance(worker.id, { ot_hours: e.target.value })} className="border border-purple-300 rounded p-1 w-20 text-sm font-bold outline-none focus:border-purple-600" />
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
          )}
        </div>
      </div>
    </ManagerAuth>
  );
}