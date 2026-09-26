import { useState } from 'react';
import axios from 'axios';
import { UserPlus, Upload, Calendar } from 'lucide-react';
import ManagerAuth from '../components/ManagerAuth';

export default function AddEmployee() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Permanent');
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');

  const bulkEmployees = [
    { id: 'PER01', name: 'SANDEEP BAHIKAR', category: 'Permanent', date_of_joining: '2024-01-01' },
    { id: 'CCW01', name: 'SUNIL MORE', category: 'Contact', date_of_joining: '2024-01-01' },
    { id: 'CCW02', name: 'KALU AWALI', category: 'Contact', date_of_joining: '2024-01-01' },
    { id: 'CCW03', name: 'MAHENDRA GAVIT', category: 'Contact', date_of_joining: '2024-01-01' },
    { id: 'CCC01', name: 'SUNIL CHINKE', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC02', name: 'DILIP RAUT', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC03', name: 'ARUN KANVE', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC04', name: 'SURENDRA INGLE', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC05', name: 'DEEPAK KACHVE', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC06', name: 'SUNIL KUMAR', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC07', name: 'ANKUSH MENGAL', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC08', name: 'KRUSHNA PASWAN', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC09', name: 'UMESH KUMAR', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC10', name: 'ANNASAHEB RAMFALE', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC11', name: 'SUKHDEV TAYADE', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC12', name: 'SANDIP BHANVAR', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC13', name: 'ABHIJIT KALE', category: 'Casual', date_of_joining: '2024-01-01' },
    { id: 'CCC14', name: 'RAJU KHADE', category: 'Casual', date_of_joining: '2024-01-01' }
  ];

  const handleBulkImport = async () => {
    setMessage('Importing... please wait.');
    try {
      const response = await axios.post('https://graphite-api.vercel.app/api/workers/bulk', bulkEmployees);
      setMessage(response.data.message + ' 🎉');
    } catch (error: any) { setMessage(`Error: ${error.response?.data?.error || error.message}`); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('https://graphite-api.vercel.app/api/workers', { id, name, category, date_of_joining: dateOfJoining });
      setMessage('Employee added successfully! 🎉');
      setId(''); setName('');
    } catch (error: any) { setMessage(`Error: ${error.response?.data?.error || error.message}`); }
  };

  return (
    <ManagerAuth>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-4"><Upload className="text-green-600" size={28} /><h2 className="text-xl font-black text-gray-800">Quick Import Employee Master List</h2></div>
            <p className="text-gray-600 mb-4 font-medium">Instantly load all {bulkEmployees.length} employees into the database.</p>
            <button onClick={handleBulkImport} className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-black text-lg cursor-pointer">Import Excel List</button>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6"><UserPlus className="text-blue-600" size={32} /><h1 className="text-2xl font-black text-gray-800">Add Single Employee</h1></div>
            {message && <div className={`p-4 mb-6 rounded-lg font-bold ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Employee ID</label>
                  <input type="text" value={id} onChange={e => setId(e.target.value)} required placeholder="e.g. PER02" className="w-full border-2 border-gray-300 p-3 rounded-lg font-medium" />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2"><Calendar size={18}/> Date of Joining</label>
                  <input type="date" value={dateOfJoining} onChange={e => setDateOfJoining(e.target.value)} required className="w-full border-2 border-gray-300 p-3 rounded-lg font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Enter full name" className="w-full border-2 border-gray-300 p-3 rounded-lg font-medium" />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border-2 border-gray-300 p-3 rounded-lg font-medium">
                  <option value="Permanent">Permanent</option>
                  <option value="Contact">Contact</option>
                  <option value="Casual">Casual (Unassigned)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-black text-lg cursor-pointer mt-4">Save Employee</button>
            </form>
          </div>
        </div>
      </div>
    </ManagerAuth>
  );
}