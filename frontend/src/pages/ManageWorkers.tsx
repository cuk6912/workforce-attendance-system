import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Edit2, Trash2, X, Check } from 'lucide-react';

export default function ManageWorkers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Fetch all workers
  const fetchWorkers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/workers');
      setWorkers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching workers:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this worker?')) {
      try {
        await axios.delete(`http://localhost:5000/api/workers/${id}`);
        fetchWorkers();
      } catch (error) {
        console.error('Error deleting worker:', error);
        alert('Failed to delete worker');
      }
    }
  };

  // Start Editing
  const startEdit = (worker: any) => {
    setEditingId(worker.id);
    setEditName(worker.name);
    setEditCategory(worker.category);
  };

  // Save Edit
  const saveEdit = async (id: string) => {
    try {
      await axios.put(`http://localhost:5000/api/workers/${id}`, {
        name: editName,
        category: editCategory
      });
      setEditingId(null);
      fetchWorkers();
    } catch (error) {
      console.error('Error updating worker:', error);
      alert('Failed to update worker');
    }
  };

  if (loading) {
    return <div className="p-8 text-xl font-bold">Loading Workers...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-blue-600" size={32} />
          <h1 className="text-2xl font-black text-gray-800">Manage Employees / Workers</h1>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                <th className="p-3 font-bold">ID</th>
                <th className="p-3 font-bold">Name</th>
                <th className="p-3 font-bold">Category</th>
                <th className="p-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(worker => (
                <tr key={worker.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-bold text-gray-600">{worker.id}</td>
                  
                  <td className="p-3">
                    {editingId === worker.id ? (
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)}
                        className="border border-gray-300 p-1 rounded w-full font-medium"
                      />
                    ) : (
                      <span className="font-bold text-gray-800">{worker.name}</span>
                    )}
                  </td>

                  <td className="p-3">
                    {editingId === worker.id ? (
                      <select 
                        value={editCategory} 
                        onChange={e => setEditCategory(e.target.value)}
                        className="border border-gray-300 p-1 rounded w-full font-medium"
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Contract">Contract</option>
                        <option value="Casual">Casual</option>
                      </select>
                    ) : (
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-bold">
                        {worker.category}
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    {editingId === worker.id ? (
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => saveEdit(worker.id)}
                          className="bg-green-600 text-white p-1.5 rounded hover:bg-green-700 cursor-pointer"
                          title="Save"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="bg-gray-400 text-white p-1.5 rounded hover:bg-gray-500 cursor-pointer"
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => startEdit(worker)}
                          className="bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100 cursor-pointer font-bold"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(worker.id)}
                          className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100 cursor-pointer font-bold"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}