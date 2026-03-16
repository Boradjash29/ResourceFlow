import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, LogOut, Package, Calendar as CalendarIcon, User, Settings, ShieldAlert, Moon, Sun } from 'lucide-react';
import Resources from './Resources';
import Bookings from './Bookings';
import Overview from './Overview';
import AdminResources from './admin/AdminResources';
import AuditLogs from './admin/AuditLogs';
import BookingForm from '../components/booking/BookingForm';
import NotificationBell from '../components/notifications/NotificationBell';
import ChatWidget from '../components/chat/ChatWidget';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedResource, setSelectedResource] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const isAdmin = user?.role === 'admin';

  const handleBookingSuccess = () => {
    setSelectedResource(null);
    setActiveTab('bookings');
  };

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'resources', label: 'Resources', icon: Package },
    { id: 'bookings', label: 'My Bookings', icon: CalendarIcon },
  ];

  const adminItems = [
    { id: 'manage-resources', label: 'Manage Resources', icon: Settings },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-zinc-950 flex p-6 gap-6 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-zinc-900 rounded-4xl shadow-soft dark:shadow-none flex flex-col p-8 sticky top-6 h-[calc(100vh-3rem)] border border-transparent dark:border-white/5">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-[#1B2559] dark:text-white tracking-tight">ResourceFlow</h1>
        </div>

        <nav className="flex-grow space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-link w-full text-left ${activeTab === item.id ? 'sidebar-link-active' : ''}`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-brand-blue' : 'text-brand-lavender'}`} />
              <span className={activeTab === item.id ? 'dark:text-brand-blue' : 'dark:text-brand-lavender'}>{item.label}</span>
            </button>
          ))}

          {isAdmin && (
            <div className="pt-8 space-y-2">
              <p className="px-4 text-[10px] font-extrabold text-brand-lavender uppercase tracking-widest mb-4 opacity-50">Administration</p>
              {adminItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`sidebar-link w-full text-left ${activeTab === item.id ? 'sidebar-link-active' : ''}`}
                >
                  <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-brand-blue' : 'text-brand-lavender'}`} />
                  <span className={activeTab === item.id ? 'dark:text-brand-blue' : 'dark:text-brand-lavender'}>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="pt-8 border-t border-gray-100 dark:border-white/5">
          <button onClick={logout} className="sidebar-link w-full text-left hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 group">
            <LogOut className="w-5 h-5 group-hover:text-red-500" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col gap-6">
        {/* Unified Top header */}
        <header className="glass-card flex items-center justify-between px-6 py-4">
          <div className="text-sm font-medium text-brand-lavender">
            Pages / <span className="text-brand-blue capitalize font-bold">{activeTab.replace('-', ' ')}</span>
          </div>

          <div className="flex items-center gap-4 bg-brand-bg/50 dark:bg-zinc-950/50 p-2 rounded-3xl border border-white dark:border-white/5">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none py-1.5 pl-4 pr-10 text-sm w-64 placeholder:text-brand-lavender dark:text-white"
              />
            </div>
            
            <div className="h-6 w-px bg-gray-200 dark:bg-white/10"></div>
            
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-2xl bg-white dark:bg-zinc-900 text-brand-lavender hover:text-brand-blue transition-colors shadow-soft dark:shadow-none border border-transparent dark:border-white/5"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <NotificationBell />
            
            <div className="h-8 w-8 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue">
              <User className="w-4 h-4" />
            </div>
            
            <div className="hidden xl:block text-right pr-2">
              <p className="text-xs font-bold text-[#1B2559] dark:text-white">{user?.name}</p>
              <p className="text-[10px] text-brand-lavender uppercase font-medium">{user?.role}</p>
            </div>
          </div>
        </header>

        <main className="w-full">
          {activeTab === 'overview' && <Overview />}
          {activeTab === 'resources' && (
            <Resources onBook={(resource) => setSelectedResource(resource)} />
          )}
          {activeTab === 'bookings' && <Bookings />}
          {activeTab === 'manage-resources' && isAdmin && <AdminResources />}
          {activeTab === 'audit-logs' && isAdmin && <AuditLogs />}
        </main>
      </div>

      {/* Booking Modal */}
      {selectedResource && (
        <BookingForm 
          resource={selectedResource} 
          onClose={() => setSelectedResource(null)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* AI Assistant */}
      <ChatWidget />
    </div>
  );
};

export default Dashboard;
