import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import OperatorEntry from './pages/OperatorEntry';
import ManagerDashboard from './pages/ManagerDashboard';
import AddEmployee from './pages/AddEmployee';
import ManageWorkers from './pages/ManageWorkers';

export default function App() {
  return (
    <BrowserRouter>
      {/* Top Navigation Menu */}
      <nav className="bg-gray-900 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          
          {/* Brand */}
          <div className="font-black text-xl tracking-tight">
            <span className="text-blue-400">ATTENDANCE</span>SYS
          </div>

          {/* Role-Based Links */}
          <div className="flex gap-6 items-center flex-wrap">
            {/* Operator Portal */}
            <Link to="/" className="font-bold text-gray-300 hover:text-white transition-colors bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
              Operator Screen
            </Link>

            {/* Manager Portal Section */}
            <div className="flex gap-4 items-center pl-4 border-l border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Manager Login:</span>
              <Link to="/manager" className="font-bold text-gray-300 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link to="/add-employee" className="font-bold text-gray-300 hover:text-white transition-colors">
                + Add Employee
              </Link>
              <Link to="/manage-employees" className="font-bold text-gray-300 hover:text-white transition-colors">
                Manage Employees
              </Link>
            </div>
          </div>

        </div>
      </nav>

      {/* The Changing Screens */}
      <Routes>
        <Route path="/" element={<OperatorEntry />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/add-employee" element={<AddEmployee />} />
        <Route path="/manage-employees" element={<ManageWorkers />} />
      </Routes>
    </BrowserRouter>
  );
}