import { API_URL } from '../config';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function OperatorEntry() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('First Shift (06:00 - 14:00)');
  const [loading, setLoading] = useState(true);

  // Fetch workers and existing attendance whenever date or shift changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const workersRes = await axios.get('${API_URL}/api/workers');
        const attendanceRes = await axios.get(`${API_URL}/api/attendance?date=${date}&shift=${encodeURIComponent(shift)}`);
        
        // Create lookup map for already saved attendance
        const attendanceMap: { [key: string]: string } = {};
        attendanceRes.data.forEach((att: any) => {
          attendanceMap[att.worker_id] = att.status;
        });

        // Merge: If saved, use status. Otherwise, set status to '' (blank/unselected)
        const mergedData = workersRes.data.map((w: any) => ({
          ...w,
          status: attendanceMap[w.id] || '' 
        }));

        setWorkers(mergedData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, [date, shift]);

  // Function to change status
  const markStatus = (id: string, status: string) => {
    setWorkers(workers.map(w => w.id === id ? { ...w, status } : w));
  };

  // Submit attendance records (only submits employees that have an explicit status)
  const handleSubmit = async () => {
    const unassigned = workers.filter(w => !w.status);
    if (unassigned.length > 0) {
      const confirmProceed = window.confirm(`${unassigned.length} employees have no status selected. Do you want to submit anyway?`);
      if (!confirmProceed) return;
    }

    try {
      for (const worker of workers) {
        if (worker.status) {
          await axios.post('${API_URL}/api/attendance', {
            worker_id: worker.id,
            date: date,
            shift: shift,
            status: worker.status
          });
        }
      }
      alert(`Attendance for ${shift} on ${date} successfully saved! 🎉`);
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance.');
    }
  };

  const markedCount = workers.filter(w => w.status).length;
  const presentCount = workers.filter(w => w.status === 'PRESENT').length;
  const absentCount = workers.filter(w => w.status === 'ABSENT').length;
  const offCount = workers.filter(w => w.status === 'WEEKLY OFF').length;

  if (loading) {
    return <div className="p-8 text-xl font-bold">Loading Attendance...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Sticky Header with Date & Shift Selector */}
        <div className="sticky top-0 bg-white shadow-lg p-4 mb-6 rounded-xl z-10 border border-gray-200 flex flex-wrap justify-between items-center gap-4">
          <div className="flex gap-4 flex-wrap">
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="border-2 border-gray-300 p-2 rounded-lg font-bold text-gray-700" 
            />
            <select 
              value={shift} 
              onChange={e => setShift(e.target.value)} 
              className="border-2 border-gray-300 p-2 rounded-lg font-bold text-gray-700 bg-blue-50"
            >
              <optgroup label="Standard 8-Hour Shifts">
                <option value="First Shift (06:00 - 14:00)">First Shift (06:00 - 14:00)</option>
                <option value="Second Shift (14:00 - 22:00)">Second Shift (14:00 - 22:00)</option>
                <option value="Night Shift (22:00 - 06:00)">Night Shift (22:00 - 06:00)</option>
              </optgroup>
              <optgroup label="Casual 12-Hour Shifts">
                <option value="Casual Day Shift (06:30 - 18:30)">Casual Day Shift (06:30 - 18:30)</option>
                <option value="Casual Night Shift (18:30 - 06:30)">Casual Night Shift (18:30 - 06:30)</option>
              </optgroup>
            </select>
          </div>
          
          <div className="text-xs md:text-sm font-black text-gray-700 bg-gray-100 px-4 py-2 rounded-lg flex gap-3">
            <span>Total: {workers.length}</span>
            <span>|</span>
            <span className="text-green-600">Present: {presentCount}</span>
            <span>|</span>
            <span className="text-red-600">Absent: {absentCount}</span>
            <span>|</span>
            <span className="text-blue-600">Off: {offCount}</span>
          </div>
          
          <button 
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-black shadow-md transition-all text-lg cursor-pointer"
          >
            Submit Shift Attendance ({markedCount}/{workers.length})
          </button>
        </div>

        {/* Worker Cards Grid (Starts blank, highlights only when operator selects) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workers.map(worker => {
            const status = worker.status;
            let cardBg = 'border-gray-200 bg-white'; // Default blank state
            if (status === 'PRESENT') cardBg = 'border-green-500 bg-green-50 shadow-sm';
            if (status === 'ABSENT') cardBg = 'border-red-500 bg-red-50 shadow-sm';
            if (status === 'WEEKLY OFF') cardBg = 'border-blue-400 bg-blue-50 shadow-sm';

            return (
              <div key={worker.id} className={`p-5 border-2 rounded-xl flex flex-col gap-4 transition-all ${cardBg}`}>
                <div>
                  <h3 className="font-black text-xl text-gray-800">{worker.name}</h3>
                  <span className="text-sm font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block border border-gray-200">
                    {worker.id} • {worker.category}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-auto">
                  <button 
                    onClick={() => markStatus(worker.id, 'PRESENT')}
                    className={`py-3 rounded-lg font-black text-sm transition-all cursor-pointer ${
                      status === 'PRESENT' ? 'bg-green-600 text-white shadow-inner' : 'bg-gray-50 text-gray-600 hover:bg-green-100 border border-gray-200'
                    }`}
                  >
                    PRESENT
                  </button>
                  <button 
                    onClick={() => markStatus(worker.id, 'ABSENT')}
                    className={`py-3 rounded-lg font-black text-sm transition-all cursor-pointer ${
                      status === 'ABSENT' ? 'bg-red-600 text-white shadow-inner' : 'bg-gray-50 text-gray-600 hover:bg-red-100 border border-gray-200'
                    }`}
                  >
                    ABSENT
                  </button>
                  <button 
                    onClick={() => markStatus(worker.id, 'WEEKLY OFF')}
                    className={`py-3 rounded-lg font-black text-sm transition-all cursor-pointer ${
                      status === 'WEEKLY OFF' ? 'bg-blue-600 text-white shadow-inner' : 'bg-gray-50 text-gray-600 hover:bg-blue-100 border border-gray-200'
                    }`}
                  >
                    OFF
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}