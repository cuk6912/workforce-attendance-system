import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserX, Activity, Calendar, Download, FileText } from 'lucide-react';
import ManagerAuth from '../components/ManagerAuth'; 

export default function Dashboard() {
  const getToday = () => new Date().toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`https://graphite-api.vercel.app/api/dashboard-stats?start=${startDate}&end=${endDate}`);
      setStats(response.data);
    } catch (err: any) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, [startDate, endDate]);

  // Quick Date Selectors
  const setPreset = (type: string) => {
    const today = new Date();
    setEndDate(getToday());
    
    if (type === 'Today') setStartDate(getToday());
    if (type === 'Week') {
      const first = today.getDate() - today.getDay() + 1;
      setStartDate(new Date(today.setDate(first)).toISOString().split('T')[0]);
    }
    if (type === 'Month') setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
    if (type === 'Year') setStartDate(new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]);
  };

  // 1. Standard Raw Report
  const downloadRawReport = async () => {
    try {
      const res = await axios.get(`https://graphite-api.vercel.app/api/reports/attendance?start=${startDate}&end=${endDate}`);
      if (res.data.length === 0) return alert('No attendance records found.');
      const headers = ['Date', 'Shift', 'Emp ID', 'Name', 'Category', 'Group', 'Status', 'Late In', 'Early Out'];
      const csvRows = [headers.join(',')];
      res.data.forEach((r: any) => csvRows.push([r.date, r.shift, r.id, `"${r.name}"`, `"${r.category}"`, `"${r.worker_group || ''}"`, r.status, r.late_in ? 'Yes' : 'No', r.early_out ? 'Yes' : 'No'].join(',')));
      triggerDownload(csvRows, `Raw_Attendance_${startDate}_to_${endDate}.csv`);
    } catch (err) { alert('Failed to download report.'); }
  };

  // 2. NEW: Employee-Wise Summary Report
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
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.click();
  };

  return (
    <ManagerAuth>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="flex items-center gap-3 mb-6"><Activity className="text-blue-600" size={32} /><h1 className="text-2xl font-black text-gray-800">System Dashboard</h1></div>

          {/* New Control Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Report Date Filters</h3>
            
            <div className="flex flex-wrap gap-3 mb-6">
              {['Today', 'Week', 'Month', 'Year'].map(type => (
                <button key={type} onClick={() => setPreset(type)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors border border-slate-300">
                  This {type}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2"><Calendar className="text-gray-500" size={20} /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="font-bold bg-transparent outline-none cursor-pointer" /></div>
              <span className="text-gray-400 font-black">TO</span>
              <div className="flex items-center gap-2"><Calendar className="text-gray-500" size={20} /><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="font-bold bg-transparent outline-none cursor-pointer" /></div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <button onClick={downloadEmployeeSummary} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-3 rounded-lg shadow-sm transition-colors cursor-pointer">
                <Users size={20} /> Download Employee-wise Summary
              </button>
              <button onClick={downloadRawReport} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-black px-4 py-3 rounded-lg shadow-sm transition-colors cursor-pointer">
                <FileText size={20} /> Download Detailed Log (Raw)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-4 bg-blue-100 rounded-lg text-blue-600"><Users size={32} /></div>
              <div><p className="text-gray-500 font-bold uppercase text-sm">Active Employees</p><h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.total}</h2></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-4 bg-green-100 rounded-lg text-green-600"><UserCheck size={32} /></div>
              <div><p className="text-gray-500 font-bold uppercase text-sm">Present in Range</p><h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.present}</h2></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-4 bg-red-100 rounded-lg text-red-600"><UserX size={32} /></div>
              <div><p className="text-gray-500 font-bold uppercase text-sm">Absent in Range</p><h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.absent}</h2></div>
            </div>
          </div>
        </div>
      </div>
    </ManagerAuth>
  );
}