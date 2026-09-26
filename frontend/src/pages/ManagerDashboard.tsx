import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserX, Activity } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      // Hardcoded directly to your live Vercel backend for perfect connectivity
      const response = await axios.get('https://graphite-api.vercel.app/api/dashboard-stats');
      setStats(response.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-blue-600" size={32} />
          <h1 className="text-2xl font-black text-gray-800">System Dashboard</h1>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 font-bold rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Employees Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-4 bg-blue-100 rounded-lg text-blue-600">
              <Users size={32} />
            </div>
            <div>
              <p className="text-gray-500 font-bold uppercase text-sm tracking-wider">Total Employees</p>
              <h2 className="text-4xl font-black text-gray-800">
                {loading ? '...' : stats.total}
              </h2>
            </div>
          </div>

          {/* Present Today Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-4 bg-green-100 rounded-lg text-green-600">
              <UserCheck size={32} />
            </div>
            <div>
              <p className="text-gray-500 font-bold uppercase text-sm tracking-wider">Present Today</p>
              <h2 className="text-4xl font-black text-gray-800">
                {loading ? '...' : stats.present}
              </h2>
            </div>
          </div>

          {/* Absent Today Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-4 bg-red-100 rounded-lg text-red-600">
              <UserX size={32} />
            </div>
            <div>
              <p className="text-gray-500 font-bold uppercase text-sm tracking-wider">Absent Today</p>
              <h2 className="text-4xl font-black text-gray-800">
                {loading ? '...' : stats.absent}
              </h2>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}