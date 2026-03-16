import React from 'react';
import { useAuth } from './context/AuthContext';
import { LayoutDashboard, LogOut } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="text-primary" />
            ResourceFlow
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, <strong>{user?.name}</strong></span>
            <button 
              onClick={logout}
              className="btn btn-secondary flex items-center gap-2 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card col-span-2">
            <h2 className="text-lg font-semibold mb-4">Dashboard Overview</h2>
            <p className="text-gray-600">Welcome to ResourceFlow. This is a placeholder dashboard. In Phase 2, we will implement the resource and booking system.</p>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">Total Bookings</span>
                <span className="font-bold text-blue-700">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">Available Rooms</span>
                <span className="font-bold text-green-700">0</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
