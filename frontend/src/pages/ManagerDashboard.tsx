import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';

export default function ManagerDashboard() {
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch live stats from SQLite backend
  useEffect(() => {
    axios.get('http://localhost:5000/api/dashboard-stats')
      .then(response => {
        setStats(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching dashboard stats:', error);
        setLoading(false);
      });
  }, []);

  // Sample trend data for the chart (can be hooked to historical data next)
  const chartData = [
    { name: 'Today', Present: stats.present, Absent: stats.absent },
  ];

  if (loading) {
    return <div className="p-8 text-xl font-bold">Loading Live Analytics...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Export Buttons */}
        <div className="bg-white p-6 rounded-xl shadow-sm flex flex-wrap justify-between items-center gap-4 border border-gray-200">
          <div>
            <h1 className="text-3xl font-black text-gray-800">Manager Dashboard</h1>
            <p className="text-gray-500 font-medium">Live Workforce Overview (Connected to SQLite)</p>
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-100 border border-red-200 transition-colors cursor-pointer">
              <Download size={20} /> PDF Report
            </button>
            <button className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold hover:bg-green-100 border border-green-200 transition-colors cursor-pointer">
              <FileSpreadsheet size={20} /> Excel Export
            </button>
          </div>
        </div>

        {/* Top Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-8 border-blue-500">
            <h3 className="text-gray-500 font-bold uppercase tracking-wider text-sm">Total Workforce</h3>
            <p className="text-4xl font-black text-gray-800 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-8 border-green-500">
            <h3 className="text-gray-500 font-bold uppercase tracking-wider text-sm">Present Today</h3>
            <p className="text-4xl font-black text-green-600 mt-2">{stats.present}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-8 border-red-500">
            <h3 className="text-gray-500 font-bold uppercase tracking-wider text-sm">Absent Today</h3>
            <p className="text-4xl font-black text-red-600 mt-2">{stats.absent}</p>
          </div>
        </div>

        {/* Visual Chart Area */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200" style={{ height: '400px' }}>
          <h2 className="text-xl font-bold text-gray-800 mb-6">Today's Attendance Breakdown</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Present" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={60} />
              <Bar dataKey="Absent" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}