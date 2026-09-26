import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Trash2, Edit, Check, X, Archive, RotateCcw } from 'lucide-react';
import ManagerAuth from '../components/ManagerAuth'; 

interface Worker {
  id: string; name: string; category: string; worker_group?: string; 
  date_of_joining?: string; is_archived?: boolean;
}

export default function ManageEmployees() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false); // Toggle View

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editGroup, setEditGroup] = useState(''); 
  const [editDOJ, setEditDOJ] = useState('');

  const fetchWorkers = async () => {
    try {
      const response = await axios.get('https://graphite-api.vercel.app/api/workers');
      setWorkers(response.data); setError('');
    } catch (err: any) { setError('Failed to load employees.'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkers(); }, []);

  // Total Service Calculator
  const calculateService = (doj?: string) => {
    if (!doj) return 'N/A';
    const start = new Date(doj); const now = new Date();
    if (isNaN(start.getTime())) return 'N/A';
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) { years--; months += 12; }
    return `${years > 0 ? years + 'y ' : ''}${months}m`;
  };

  const handleArchive = async (id: string, isCurrentlyArchived: boolean) => {
    const action = isCurrentlyArchived ? 'RESTORE' : 'ARCHIVE';
    if (!window.confirm(`Are you sure you want to ${action} employee ${id}?`)) return;
    try {
      if (isCurrentlyArchived) {
        // Restore
        const worker = workers.find(w => w.id === id);
        await axios.put(`https://graphite-api.vercel.app/api/workers/${id}`, { ...worker, is_archived: false });
      } else {
        // Archive (Soft Delete)
        await axios.delete(`https://graphite-api.vercel.app/api/workers/${id}`);
      }
      fetchWorkers(); 
    } catch (err) { alert(`Failed to ${action} employee.`); }
  };

  const startEdit = (worker: Worker) => {
    setEditingId(worker.id); setEditName(worker.name); setEditCategory(worker.category);
    setEditGroup(worker.worker_group || ''); setEditDOJ(worker.date_of_joining || '');
  };

  const saveEdit = async (worker: Worker) => {
    try {
      await axios.put(`https://graphite-api.vercel.app/api/workers/${worker.id}`, {
        name: editName, category: editCategory, worker_group: editGroup.trim(), 
        date_of_joining: editDOJ, is_archived: worker.is_archived
      });
      setEditingId(null); fetchWorkers(); 
    } catch (err) { alert('Failed to update employee.'); }
  };

  const displayedWorkers = workers.filter(w => showArchived ? w.is_archived : !w.is_archived);

  return (
    <ManagerAuth>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 text-white">
            <div className="flex items-center gap-3"><Users className="text-blue-400" size={32} /><h1 className="text-2xl font-black">Employee Directory</h1></div>
            <button onClick={() => setShowArchived(!showArchived)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${showArchived ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-200'}`}>
              <Archive size={18} /> {showArchived ? 'View Active Employees' : 'View Archives (Deleted)'}
            </button>
          </div>
          
          {error && <div className="p-4 bg-red-50 text-red-700 font-bold">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
                  <th className="p-4 font-bold border-b">ID</th>
                  <th className="p-4 font-bold border-b">Name</th>
                  <th className="p-4 font-bold border-b">Category / Group</th>
                  <th className="p-4 font-bold border-b">Date of Joining</th>
                  <th className="p-4 font-bold border-b">Total Service</th>
                  <th className="p-4 font-bold border-b text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="p-8 text-center font-bold text-gray-500">Loading...</td></tr> : 
                 displayedWorkers.length === 0 ? <tr><td colSpan={6} className="p-8 text-center font-bold text-gray-500">No employees found in this view.</td></tr> : 
                 displayedWorkers.map(worker => (
                  editingId === worker.id ? (
                    <tr key={worker.id} className="border-b bg-blue-50">
                      <td className="p-4 font-medium text-gray-900">{worker.id}</td>
                      <td className="p-4"><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border-2 border-blue-300 p-1 rounded font-bold" /></td>
                      <td className="p-4 flex flex-col gap-1">
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full border-2 border-blue-300 p-1 rounded font-bold"><option value="Permanent">Permanent</option><option value="Contact">Contact</option><option value="Casual">Casual</option></select>
                        <input type="text" value={editGroup} onChange={(e) => setEditGroup(e.target.value)} placeholder="Group Name" className="w-full border-2 border-blue-300 p-1 rounded font-bold text-sm" />
                      </td>
                      <td className="p-4"><input type="date" value={editDOJ} onChange={(e) => setEditDOJ(e.target.value)} className="w-full border-2 border-blue-300 p-1 rounded font-bold text-sm" /></td>
                      <td className="p-4 font-bold text-gray-500">--</td>
                      <td className="p-4 flex justify-center gap-2">
                        <button onClick={() => saveEdit(worker)} className="text-white bg-green-600 hover:bg-green-700 p-2 rounded shadow-sm"><Check size={18} /></button>
                        <button onClick={() => setEditingId(null)} className="text-white bg-gray-500 hover:bg-gray-600 p-2 rounded shadow-sm"><X size={18} /></button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={worker.id} className={`border-b hover:bg-gray-50 transition-colors ${worker.is_archived ? 'opacity-60 bg-gray-50' : ''}`}>
                      <td className="p-4 font-medium text-gray-900">{worker.id}</td>
                      <td className="p-4 font-bold text-blue-900">{worker.name}</td>
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold rounded">{worker.category}</span>
                          {worker.worker_group && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded border border-green-200">{worker.worker_group}</span>}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-700">{worker.date_of_joining || 'N/A'}</td>
                      <td className="p-4 font-bold text-blue-700 bg-blue-50 rounded-lg">{calculateService(worker.date_of_joining)}</td>
                      <td className="p-4 flex justify-center gap-2">
                        {!worker.is_archived && <button onClick={() => startEdit(worker)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg" title="Edit"><Edit size={20} /></button>}
                        <button onClick={() => handleArchive(worker.id, !!worker.is_archived)} className={`${worker.is_archived ? 'text-green-600 hover:bg-green-100' : 'text-red-500 hover:bg-red-50'} p-2 rounded-lg`} title={worker.is_archived ? "Restore Employee" : "Archive (Soft Delete)"}>
                          {worker.is_archived ? <RotateCcw size={20} /> : <Trash2 size={20} />}
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ManagerAuth>
  );
}