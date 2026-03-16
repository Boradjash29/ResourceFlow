import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, LogOut, Package, Calendar as CalendarIcon, User } from 'lucide-react';
import Resources from './Resources';
import Bookings from './Bookings';
import Overview from './Overview';
import BookingForm from '../components/booking/BookingForm';
import NotificationBell from '../components/notifications/NotificationBell';
import ChatWidget from '../components/chat/ChatWidget';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedResource, setSelectedResource] = useState(null);

  const handleBookingSuccess = () => {
    setSelectedResource(null);
    setActiveTab('bookings');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar / Top Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="text-primary" />
              ResourceFlow
            </h1>
            
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('resources')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'resources' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Resources
                </div>
              </button>
              <button 
                onClick={() => setActiveTab('bookings')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'bookings' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  My Bookings
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 font-medium">{user?.name}</span>
              <span className="text-[10px] uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                {user?.role}
              </span>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'resources' && (
          <Resources onBook={(resource) => setSelectedResource(resource)} />
        )}
        {activeTab === 'bookings' && <Bookings />}
      </main>

      {/* Booking Modal */}
        />
      )}

      {/* AI Assistant */}
      <ChatWidget />
    </div>
  );
};

export default Dashboard;
