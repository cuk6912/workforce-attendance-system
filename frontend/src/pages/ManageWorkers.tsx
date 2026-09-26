import ManagerAuth from '../components/ManagerAuth';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Trash2, Edit, Check, X } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  category: string;
  worker_group?: string; // New custom group field
}

export default function ManageEmployees() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editGroup, setEditGroup] = useState(''); // State for custom group name

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
    setEditGroup(worker.worker_group || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      await axios.put(`https://graphite-api.vercel.app/api/workers/${id}`, {
        name: editName,
        category: editCategory,
        worker_group: editGroup.trim()
      });
      setEditingId(null);
      fetchWorkers(); 
    } catch (err) {
      alert('Failed to update employee.');
    }
  };

return (
  <ManagerAuth>
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      {/* ... the rest of the code ... */}
    </div>
  </ManagerAuth>
);