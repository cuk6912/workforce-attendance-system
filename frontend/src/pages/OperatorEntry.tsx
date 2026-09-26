import { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardList, Calendar, Clock } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  category: string;
}

export default function OperatorScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('General');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch workers and today's attendance directly from live Vercel backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const workersRes = await axios.get('https://graphite-api.vercel.app/api/workers');
        setWorkers(workersRes.data);

        const attRes = await axios.get(`https://graphite-api.vercel.app/api/attendance?date=${date}&shift=${shift}`);
        const attMap: Record<string, string> = {};
        attRes.data.forEach((record: any) => {
          attMap[record.worker_id] = record.status;
        });
        setAttendance(attMap);
        setError('');
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError('Failed to load data from the server. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [date, shift]);

  const markAttendance = async (worker_id: string, status: string) => {
    // Instantly update the UI so the operator doesn't have to wait
    setAttendance(prev => ({ ...prev, [worker_id]: status }));
    
    try {
      // Send the save request to the cloud
      await axios.post('https://graphite-api.vercel.app/api/attendance', {
        worker_id,
        date,
        shift,
        status
      });
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert(`Failed to save attendance for ${worker_id}. Please check your connection.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200 bg-slate-800 text-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-blue-400" size={32} />
            <h1 className="text-2xl font-black">Daily Attendance Entry</h1>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg flex-1">
              <Calendar size={20} className="text-gray-300" />
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer w-full"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg flex-1">
              <Clock size={20} className="text-gray-300" />
              <select 
                value={shift} 
                onChange={e => setShift(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer w-full"
              >
                <option value="General" className="text-black">General Shift</option>
                <option value="Shift A" className="text-black">Shift A</option>
                <option value="Shift B" className="text-black">Shift B</option>
                <option value="Shift C" className="text-black">Shift C</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 font-bold border-b border-red-100">
            {error}
          </div>
        )}

        {/* Worker List Section */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="p-4 font-bold border-b">ID</th>
                <th className="p-4 font-bold border-b">Name</th>
                <th className="p-4 font-bold border-b">Category</th>
                <th className="p-4 font-bold border-b text-center">Mark Attendance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center font-bold text-gray-500 text-lg">
                    Loading employees...
                  </td>
                </tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center font-bold text-gray-500 text-lg">
                    No employees found. Please ask a manager to import them.
                  </td>
                </tr>
              ) : (
                workers.map(worker => {
                  const currentStatus = attendance[worker.id];
                  
                  return (
                    <tr key={worker.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{worker.id}</td>
                      <td className="p-4 font-bold text-blue-900">{worker.name}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-gray-200 rounded-full text-sm font-bold text-gray-700">
                          {worker.category}
                        </span>
                      </td>
                      <td className="p-4 flex justify-center gap-3">
                        <button 
                          onClick={() => markAttendance(worker.id, 'PRESENT')}
                          className={`px-4 py-2 rounded-lg font-black transition-all ${
                            currentStatus === 'PRESENT' 
                            ? 'bg-green-600 text-white shadow-md' 
                            : 'bg-gray-200 text-gray-600 hover:bg-green-100 hover:text-green-700'
                          }`}
                        >
                          PRESENT
                        </button>
                        <button 
                          onClick={() => markAttendance(worker.id, 'ABSENT')}
                          className={`px-4 py-2 rounded-lg font-black transition-all ${
                            currentStatus === 'ABSENT' 
                            ? 'bg-red-600 text-white shadow-md' 
                            : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-700'
                          }`}
                        >
                          ABSENT
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );
}