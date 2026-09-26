import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Trash2 } from 'lucide-react';
import { API_URL } from '../config';

interface Worker {
  id: string;
  name: string;
  category: string;
}

export default function ManageEmployees() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWorkers = async () => {
    try {
      // Using proper backticks and the live API_URL variable
      const response = await axios.get(`${API_URL}/api/workers`);
      setWorkers(response.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching workers:', err);
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
      await axios.delete(`${API_URL}/api/workers/${id}`);
      fetchWorkers(); // Refresh the list automatically after deletion
    } catch (err) {
      console.error('Error deleting worker:', err);
      alert('Failed to delete employee.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <Users className="text-blue-600" size={32} />
          <h1 className="text-2xl font-black text-gray-800">Manage Employees / Workers</h1>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 text-red-700 font-bold border-b border-red-100">
            {error}
          </div>
        )}

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
                <tr>
                  <td colSpan={4} className="p-8 text-center font-bold text-gray-500 text-lg">
                    Loading employees from database...
                  </td>
                </tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center font-bold text-gray-500 text-lg">
                    No employees found. Please import them from the Add Employee screen.
                  </td>
                </tr>
              ) : (
                workers.map(worker => (
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
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleDelete(worker.id)} 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Delete Employee"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}