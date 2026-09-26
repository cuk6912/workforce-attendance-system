import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

export default function ManagerAuth({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Remembers the login so they don't have to type it on every tab click
    if (sessionStorage.getItem('manager_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // The Master PIN for Managers (You can change this password to whatever you want)
    if (password === 'Admin@123') {
      sessionStorage.setItem('manager_auth', 'true');
      setIsAuthenticated(true);
    } else {
      setError('Incorrect password');
    }
  };

  // If unlocked, show the real page
  if (isAuthenticated) return <>{children}</>;

  // If locked, show the login screen
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-sm w-full transform -translate-y-12">
        <div className="flex justify-center mb-4"><Lock size={40} className="text-blue-600" /></div>
        <h2 className="text-2xl font-black text-center text-gray-800 mb-6">Manager Access</h2>
        
        {error && <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded mb-4 text-center">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="Enter Master PIN" 
            className="w-full border-2 border-gray-300 p-3 rounded-lg font-bold outline-none focus:border-blue-500" 
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg p-3 rounded-lg shadow-md transition-colors cursor-pointer">
            Unlock Access
          </button>
        </form>
      </div>
    </div>
  );
}