import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserX, Activity, Calendar, Download } from 'lucide-react';
import ManagerAuth from '../components/ManagerAuth'; // Secures this page

export default function Dashboard() {
  // Sets default dates to the current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const currentDay = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(currentDay);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`https://graphite-api.vercel.app/api/dashboard-stats?start=${startDate}&end=${endDate}`);
      setStats(response.data);
      setError('');
    } catch (err: any) {
      setError('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch automatically if they change the dates
  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const downloadReport = async () => {
    try {
      const res = await axios.get(`https://graphite-api.vercel.app/api/reports/attendance?start=${startDate}&end=${endDate}`);
      const data = res.data;
      
      if (data.length === 0) return alert('No attendance records found for this date range.');

      // Build CSV File
      const headers = ['Date', 'Shift', 'Emp ID', 'Name', 'Category', 'Group', 'Status', 'Late In', 'Early Out'];
      const csvRows = [headers.join(',')];

      data.forEach((row: any) => {
        csvRows.push([
          row.date, row.shift, row.id, 
          `"${row.name}"`, // Quotes prevent commas in names from breaking the file
          `"${row.category}"`, `"${row.worker_group || ''}"`,
          row.status, 
          row.late_in ? 'Yes' : 'No', 
          row.early_out ? 'Yes' : 'No'
        ].join(','));
      });

      // Trigger automatic browser download
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Attendance_Report_${startDate}_to_${endDate}.csv`);
      a.click();
    } catch (err) {
      alert('Failed to download report.');
    }
  };

  return (
    <ManagerAuth>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Activity className="text-blue-600" size={32} />
              <h1 className="text-2xl font-black text-gray-800">System Dashboard</h1>
            </div>

            {/* Date Range & Download Actions */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 px-2">
                <Calendar className="text-gray-500" size={20} />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="font-bold outline-none cursor-pointer bg-transparent" />
                <span className="text-gray-400 font-bold px-1">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="font-bold outline-none cursor-pointer bg-transparent" />
              </div>
              <div className="h-8 w-px bg-gray-300 hidden sm:block mx-1"></div>
              <button onClick={downloadReport} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-md shadow-sm transition-colors cursor-pointer">
                <Download size={18} />
                Export CSV Report
              </button>
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 text-red-700 font-bold rounded-lg border border-red-200">{error}</div>}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-4 bg-blue-100 rounded-lg text-blue-600"><Users size={32} /></div>
              <div>
                <p className="text-gray-500 font-bold uppercase text-sm tracking-wider">Total Registered</p>
                <h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.total}</h2>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-4 bg-green-100 rounded-lg text-green-600"><UserCheck size={32} /></div>
              <div>
                <p className="text-gray-500 font-bold uppercase text-sm tracking-wider">Present in Range</p>
                <h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.present}</h2>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-4 bg-red-100 rounded-lg text-red-600"><UserX size={32} /></div>
              <div>
                <p className="text-gray-500 font-bold uppercase text-sm tracking-wider">Absent in Range</p>
                <h2 className="text-4xl font-black text-gray-800">{loading ? '...' : stats.absent}</h2>
              </div>
            </div>
          </div>

        </div>
      </div>
    </ManagerAuth>
  );
}