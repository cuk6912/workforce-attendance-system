import { useState } from 'react';
import axios from 'axios';
import { UserPlus, Upload } from 'lucide-react';
import { API_URL } from '../config';

export default function AddEmployee() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Permanent');
  const [message, setMessage] = useState('');

  const bulkEmployees = [
    { id: 'PER01', name: 'SANDEEP BAHIKAR', category: 'Permanent' },
    { id: 'CCW01', name: 'SUNIL MORE', category: 'Contact' },
    { id: 'CCW02', name: 'KALU AWALI', category: 'Contact' },
    { id: 'CCW03', name: 'MAHENDRA GAVIT', category: 'Contact' },
    { id: 'CCC01', name: 'SUNIL CHINKE', category: 'Casual' },
    { id: 'CCC02', name: 'DILIP RAUT', category: 'Casual' },
    { id: 'CCC03', name: 'ARUN KANVE', category: 'Casual' },
    { id: 'CCC04', name: 'SURENDRA INGLE', category: 'Casual' },
    { id: 'CCC05', name: 'DEEPAK KACHVE', category: 'Casual' },
    { id: 'CCC06', name: 'SUNIL KUMAR', category: 'Casual' },
    { id: 'CCC07', name: 'ANKUSH MENGAL', category: 'Casual' },
    { id: 'CCC08', name: 'KRUSHNA PASWAN', category: 'Casual' },
    { id: 'CCC09', name: 'UMESH KUMAR', category: 'Casual' },
    { id: 'CCC10', name: 'ANNASAHEB RAMFALE', category: 'Casual' },
    { id: 'CCC11', name: 'SUKHDEV TAYADE', category: 'Casual' },
    { id: 'CCC12', name: 'SANDIP BHANVAR', category: 'Casual' },
    { id: 'CCC13', name: 'ABHIJIT KALE', category: 'Casual' },
    { id: 'CCC14', name: 'RAJU KHADE', category: 'Casual' }
  ];

  const handleBulkImport = async () => {
    setMessage('Importing... please wait.');
    try {
      const response = await axios.post(`${API_URL}/api/workers/bulk`, bulkEmployees);
      setMessage(response.data.message + ' 🎉');
    } catch (error: any) {
      console.error('Import Error:', error);
      // This line is updated to pull the exact database crash reason from the backend
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/workers`, { id, name, category });
      setMessage('Employee added successfully! 🎉');
      setId('');
      setName('');
    } catch (error: any) {
      console.error('Add Error:', error);
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="text-green-600" size={28} />
            <h2 className="text-xl font-black text-gray-800">Quick Import Employee Master List</h2>
          </div>
          <p className="text-gray-600 mb-4 font-medium">Instantly load all {bulkEmployees.length} employees into the database.</p>
          <button 
            onClick={handleBulkImport}
            className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-black text-lg cursor-pointer shadow-md"
          >
            Import Excel List ({bulkEmployees.length} Employees)
          </button>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus className="text-blue-600" size={32} />
            <h1 className="text-2xl font-black text-gray-800">Add Single Employee</h1>
          </div>

          {message && (
            <div className={`p-4 mb-6 rounded-lg font-bold ${message.toLowerCase().includes('error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-bold mb-2">Employee ID</label>
              <input 
                type="text" value={id} onChange={e => setId(e.target.value)} required
                placeholder="e.g. PER02"
                className="w-full border-2 border-gray-300 p-3 rounded-lg font-medium"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Full Name</label>
              <input 
                type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="Enter full name"
                className="w-full border-2 border-gray-300 p-3 rounded-lg font-medium"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Category</label>
              <select 
                value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border-2 border-gray-300 p-3 rounded-lg font-medium"
              >
                <option value="Permanent">Permanent</option>
                <option value="Contact">Contact</option>
                <option value="Casual">Casual</option>
              </select>
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-black text-lg cursor-pointer shadow-md mt-4"
            >
              Save Employee
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}