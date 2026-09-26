import ManagerAuth from '../components/ManagerAuth';
import { useState } from 'react';
import axios from 'axios';
import { UserPlus, Upload } from 'lucide-react';

export default function AddEmployee() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Permanent');
  const [message, setMessage] = useState('');

  // Casuals reset to basic "Casual" so you can manually assign groups later
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
      const response = await axios.post('https://graphite-api.vercel.app/api/workers/bulk', bulkEmployees);
      setMessage(response.data.message + ' 🎉');
    } catch (error: any) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('https://graphite-api.vercel.app/api/workers', { id, name, category });
      setMessage('Employee added successfully! 🎉');
      setId('');
      setName('');
    } catch (error: any) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

 return (
  <ManagerAuth>
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      {/* ... the rest of the code ... */}
    </div>
  </ManagerAuth>
);