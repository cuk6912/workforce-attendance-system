import { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardList, Calendar, Clock, Filter } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  category: string;
  worker_group?: string;
}

interface AttData {
  status: string;
  late_in: boolean;
  early_out: boolean;
}

export default function OperatorScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttData>>({});
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeGroup, setEmployeeGroup] = useState('Regular'); 
  const [shift, setShift] = useState('G');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Extract all unique custom groups that have been assigned to casuals
  const casualGroups = Array.from(new Set(
    workers.filter(w => w.category === 'Casual' && w.worker_group).map(w => w.worker_group as string)
  )).sort();

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const group = e.target.value;
    setEmployeeGroup(group);
    
    if (group !== 'Regular') {
      setShift('Day');
    } else {
      setShift('G');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const workersRes = await axios.get('https://graphite-api.vercel.app/api/workers');
        setWorkers(workersRes.data);

        const attRes = await axios.get(`https://graphite-api.vercel.app/api/attendance?date=${date}&shift=${shift}`);
        const attMap: Record<string, AttData> = {};
        attRes.data.forEach((record: any) => {
          attMap[record.worker_id] = {
            status: record.status,
            late_in: record.late_in || false,
            early_out: record.early_out || false
          };
        });
        setAttendance(attMap);
        setError('');
      } catch (err: any) {
        setError('Failed to load data from the server.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date, shift]);

  const markAttendance = async (worker_id: string, status: string, late_in: boolean, early_out: boolean) => {
    setAttendance(prev => ({ ...prev, [worker_id]: { status, late_in, early_out } }));
    try {
      await axios.post('https://graphite-api.vercel.app/api/attendance', {
        worker_id, date, shift, status, late_in, early_out
      });
    } catch (err) {
      alert(`Failed to save attendance for ${worker_id}.`);
    }
  };

  // SMART FILTERING LOGIC
  const filteredWorkers = workers.filter(w => {
    if (employeeGroup === 'Regular') {
      return w.category === 'Permanent' || w.category === 'Contact';
    } else {
      // Rule 1: Show unassigned casuals IF the shift is explicitly "Day"
      const isUnassignedCasual = w.category === 'Casual' && (!w.worker_group || w.worker_group.trim() === '');
      if (shift === 'Day' && isUnassignedCasual) return true;
      
      // Rule 2: Show workers explicitly assigned to the selected dropdown group
      return w.worker_group === employeeGroup;
    }
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="p-6 border-b border-gray-200 bg-slate-800 text-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-blue-400" size={32} />
            <h1 className="text-2xl font-black">Daily Attendance Entry</h1>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg flex-1 min-w-[150px]">
              <Calendar size={20} className="text-gray-300" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer w-full"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg flex-1 min-w-[150px]">
              <Filter size={20} className="text-gray-300" />
              <select value={employeeGroup} onChange={handleGroupChange}
                className="bg-transparent text-white font-bold outline-none cursor-pointer w-full"
              >
                <option value="Regular" className="text-black">Regulars (Perm/Contact)</option>
                {/* Dynamically loads your custom group names from the database */}
                {casualGroups.map(g => (
                  <option key={g} value={g} className="text-black">Casual - {g}</option>
                ))}
                {/* Fallback if no custom groups exist yet */}
                {casualGroups.length === 0 && (
                  <option value="Unassigned Only" className="text-black">Casuals (Unassigned)</option>
                )}
              </select>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg flex-1 min-w-[150px]">
              <Clock size={20} className="text-gray-300" />
              <select value={shift} onChange={e => setShift(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer w-full"
              >
                {employeeGroup === 'Regular' ? (
                  <>
                    <option value="G" className="text-black">G Shift</option>
                    <option value="A" className="text-black">Shift A</option>
                    <option value="B" className="text-black">Shift B</option>
                    <option value="C" className="text-black">Shift C</option>
                  </>
                ) : (
                  <>
                    <option value="Day" className="text-black">Day Shift</option>
                    <option value="Night" className="text-black">Night Shift</option>
                  </>
                )}
              </select>
            </div>
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
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-500">Loading employees...</td></tr>
              ) : filteredWorkers.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-500">No employees found for this selection.</td></tr>
              ) : (
                filteredWorkers.map(worker => {
                  const current = attendance[worker.id] || { status: '', late_in: false, early_out: false };
                  const isUnassigned = !worker.worker_group || worker.worker_group.trim() === '';
                  
                  return (
                    <tr key={worker.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{worker.id}</td>
                      <td className="p-4 font-bold text-blue-900">{worker.name}</td>
                      <td className="p-4">
                        {isUnassigned ? (
                           <span className="px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full text-sm font-bold">
                             Unassigned
                           </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded text-sm border border-green-200">
                            {worker.worker_group}
                          </span>
                        )}
                      </td>
                      <td className="p-4 flex flex-col items-center gap-2">
                        <div className="flex justify-center gap-3">
                          <button 
                            onClick={() => markAttendance(worker.id, 'PRESENT', current.late_in, current.early_out)}
                            className={`px-4 py-2 rounded-lg font-black transition-all ${
                              current.status === 'PRESENT' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-green-100'
                            }`}
                          >
                            PRESENT
                          </button>
                          <button 
                            onClick={() => markAttendance(worker.id, 'ABSENT', false, false)}
                            className={`px-4 py-2 rounded-lg font-black transition-all ${
                              current.status === 'ABSENT' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-red-100'
                            }`}
                          >
                            ABSENT
                          </button>
                        </div>
                        
                        {current.status === 'PRESENT' && (
                          <div className="flex gap-4 mt-1 bg-blue-50 px-3 py-1.5 rounded border border-blue-100">
                            <label className="flex items-center gap-1.5 text-sm font-bold text-blue-900 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={current.late_in}
                                onChange={(e) => markAttendance(worker.id, current.status, e.target.checked, current.early_out)}
                                className="w-4 h-4 cursor-pointer accent-blue-600"
                              />
                              Late In
                            </label>
                            <label className="flex items-center gap-1.5 text-sm font-bold text-blue-900 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={current.early_out}
                                onChange={(e) => markAttendance(worker.id, current.status, current.late_in, e.target.checked)}
                                className="w-4 h-4 cursor-pointer accent-blue-600"
                              />
                              Early Out
                            </label>
                          </div>
                        )}
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