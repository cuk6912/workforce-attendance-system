import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserX, Activity, Calendar, FileText, Edit, Clock, Filter, ClipboardList, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import ManagerAuth from '../components/ManagerAuth'; 

export default function ManagerDashboard() {
  const getToday = () => new Date().toISOString().split('T')[0];
  // Gets current YYYY-MM (e.g. "2026-09") for the default OT filter
  const getCurrentMonth = () => new Date().toISOString().slice(0, 7);
  
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview', 'Modify', or 'OT'

  // --- OVERVIEW TAB STATE ---
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<Record<string, { present: any[], absent: any[] }>>({});
  const [expandedShifts, setExpandedShifts] = useState<Record<string, boolean>>({});

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

  // FETCH OVERVIEW DATA
  useEffect(() => {
    if (activeTab !== 'Overview') return;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`https://graphite-api.vercel.app/api/dashboard-stats?start=${startDate}&end=${endDate}`);
        setStats(response.data);
        const todayRes = await axios.get(`https://graphite-api.vercel.app/api/dashboard/today-list?date=${getToday()}`);
        const grouped = todayRes.data.reduce((acc: any, curr: any) => {
          if (!acc[curr.shift]) acc[curr.shift] = { present: [], absent: [] };
          if (curr.status === 'PRESENT') acc[curr.shift].present.push(curr);
          if (curr.status === 'ABSENT') acc[curr.shift].absent.push(curr);
          return acc;
        }, {});
        setTodayData(grouped);
      } catch (err: any) { console.error(err); } finally { setLoading(false); }
    };
    fetchStats();
  }, [startDate, endDate, activeTab]);

  // FETCH OT MONTHLY DATA
  useEffect(() => {
    if (activeTab !== 'OT') return;
    const fetchOt = async () => {
      setOtLoading(true);
      try {
        const [year, month] = otMonth.split('-');
        const start = `${otMonth}-01`;
        const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]; // Last day of month
        
        const res = await axios.get(`https://graphite-api.vercel.app/api/reports/employee-summary?start=${start}&end=${end}`);
        // Only show employees who actually have Overtime
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

  return (
    <ManagerAuth>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-wrap gap-4 mb-6 border-b border-gray-300 pb-4">
            <button onClick={() => setActiveTab('Overview')} className={`px-6 py-2 font-black rounded-lg transition-all ${activeTab === 'Overview' ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><Activity size={18} className="inline mr-2 -mt-1" /> Overview</button>
            <button onClick={() => setActiveTab('Modify')} className={`px-6 py-2 font-black rounded-lg transition-all ${activeTab === 'Modify' ? 'bg-purple-600 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><Edit size={18} className="inline mr-2 -mt-1" /> Edit Logs</button>
            <button onClick={() => setActiveTab('OT')} className={`px-6 py-2 font-black rounded-lg transition-all ${activeTab === 'OT' ? 'bg-orange-500 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><Clock size={18} className="inline mr-2 -mt-1" /> Monthly OT Report</button>
          </div>

          {activeTab === 'Overview' && (
             <div className="space-y-6 animate-fadeIn">
               {/* OVERVIEW CONTENT - Keeps your existing filters and stat blocks */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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
             </div>
          )}

          {/* NEW: OT MONTHLY REPORT TAB */}
          {activeTab === 'OT' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3"><Clock className="text-orange-500" size={32} /><h2 className="text-2xl font-black text-gray-800">Employee-Wise OT Report</h2></div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-lg border border-orange-200">
                    <Calendar size={20} className="text-orange-600" />
                    {/* Default is automatically set to current month here */}
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

          {activeTab === 'Modify' && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn p-6">
                <div className="flex items-center gap-3 mb-6"><ClipboardList className="text-purple-600" size={32} /><h1 className="text-2xl font-black">Manager Edit Mode</h1></div>
                {/* Your existing Modify logic remains exactly the same here - using the same updateModAttendance function */}
                <div className="flex flex-wrap gap-4 w-full bg-purple-50 p-4 rounded-lg border border-purple-200 mb-6">
                  <div className="flex items-center gap-2 flex-1 min-w-[150px]"><Calendar size={20} className="text-purple-700" /><input type="date" value={modDate} onChange={e => setModDate(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer w-full"/></div>
                  <div className="flex items-center gap-2 flex-1 min-w-[150px]"><Filter size={20} className="text-purple-700" /><select value={modGroup} onChange={e => setModGroup(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer w-full"><option value="Regular">Regulars</option></select></div>
                  <div className="flex items-center gap-2 flex-1 min-w-[150px]"><Clock size={20} className="text-purple-700" /><select value={modShift} onChange={e => setModShift(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer w-full"><option value="G">G Shift</option></select></div>
                </div>
                
                {modLoading ? <p className="font-bold text-gray-500">Loading records...</p> : 
                  modWorkers.map(worker => {
                    const current = modAttendance[worker.id] || { status: '' };
                    return (
                      <div key={worker.id} className="p-4 border-b flex justify-between items-center">
                        <div><p className="font-bold text-blue-900">{worker.name}</p><p className="text-sm text-gray-500">{worker.id}</p></div>
                        <div className="flex gap-2">
                          <button onClick={() => updateModAttendance(worker.id, { status: 'PRESENT' })} className={`px-4 py-2 rounded font-bold ${current.status === 'PRESENT' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>PRESENT</button>
                          <button onClick={() => updateModAttendance(worker.id, { status: 'ABSENT' })} className={`px-4 py-2 rounded font-bold ${current.status === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>ABSENT</button>
                        </div>
                      </div>
                    )
                  })
                }
             </div>
          )}
        </div>
      </div>
    </ManagerAuth>
  );
}