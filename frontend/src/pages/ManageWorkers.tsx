import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Trash2, Edit, Check, X } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  category: string;
}

export default function ManageEmployees() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const fetchWorkers = async () => {
    try {
      const response = await axios.get('https://graphite-api.vercel.app/api/workers');
      setWorkers(response.data);
      setError('');
    } catch (err: any) {
      setError('Failed to load employees. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete employee ${id}?`)) return;
    try {
      await axios.delete('https://graphite-api.vercel.app/api/workers/' + id);
      fetchWorkers(); 
    } catch (err) {
      alert('Failed to delete employee.');
    }
  };

  const startEdit = (worker: Worker) => {
    setEditingId(worker.id);
    setEditName(worker.name);
    setEditCategory(worker.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCategory('');
  };

  const saveEdit = async (id: string) => {
    try {
      await axios.put(`https://graphite-api.vercel.app/api/workers/${id}`, {
        name: editName,
        category: editCategory
      });
      setEditingId(null);
      fetchWorkers(); // Refresh list to show updates
    } catch (err) {
      console.error('Error updating worker:', err);
      alert('Failed to update employee.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <Users className="text-blue-600" size={32} />
          <h1 className="text-2xl font-black text-gray-800">Manage Employees / Workers</h1>
        </div>
        
        {error && <div className="p-4 bg-red-50 text-red-700 font-bold">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="p-4 font-bold border-b">ID</th>
                <th className="p-4 font-bold border-b">Name</th>
                <th className="p-4 font-bold border-b">Category</th>
                <th className="p-4 font-bold border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-500">Loading employees...</td></tr>
              ) : workers.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-500">No employees found.</td></tr>
              ) : (
                workers.map(worker => (
                  editingId === worker.id ? (
                    /* EDITING ROW MODE */
                    <tr key={worker.id} className="border-b bg-blue-50">
                      <td className="p-4 font-medium text-gray-900">{worker.id}</td>
                      <td className="p-4">
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full border-2 border-blue-300 p-2 rounded font-bold"
                        />
                      </td>
                      <td className="p-4">
                        <select 
                          value={editCategory} 
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full border-2 border-blue-300 p-2 rounded font-bold"
                        >
                          <option value="Permanent">Permanent</option>
                          <option value="Contact">Contact</option>
                          <option value="Casual">Casual (Unassigned)</option>
                          <option value="Casual - Group 1">Casual - Group 1</option>
                          <option value="Casual - Group 2">Casual - Group 2</option>
                        </select>
                      </td>
                      <td className="p-4 flex justify-center gap-2">
                        <button onClick={() => saveEdit(worker.id)} className="text-white bg-green-600 hover:bg-green-700 p-2 rounded-lg shadow-sm" title="Save">
                          <Check size={20} />
                        </button>
                        <button onClick={cancelEdit} className="text-white bg-gray-500 hover:bg-gray-600 p-2 rounded-lg shadow-sm" title="Cancel">
                          <X size={20} />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    /* NORMAL VIEW ROW */
                    <tr key={worker.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{worker.id}</td>
                      <td className="p-4 font-bold text-blue-900">{worker.name}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          worker.category === 'Permanent' ? 'bg-purple-100 text-purple-700' : 
                          worker.category === 'Contact' ? 'bg-orange-100 text-orange-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {worker.category}
                        </span>
                      </td>
                      <td className="p-4 flex justify-center gap-2">
                        <button 
                          onClick={() => startEdit(worker)} 
                          className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                          title="Edit Employee"
                        >
                          <Edit size={20} />
                        </button>
                        <button 
                          onClick={() => handleDelete(worker.id)} 
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}