import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, LogOut, Package, Calendar as CalendarIcon, User, Settings, ShieldAlert, Moon, Sun, Menu, X, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import BookingForm from '../components/booking/BookingForm';
import NotificationBell from '../components/notifications/NotificationBell';
import ChatWidget from '../components/chat/ChatWidget';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { ArrowLeft } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Determine active tab based on URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('manage-resources')) return 'manage-resources';
    if (path.includes('audit-logs')) return 'audit-logs';
    if (path.includes('analytics')) return 'analytics';
    if (path.includes('resources')) return 'resources';
    if (path.includes('bookings')) return 'bookings';
    if (path.includes('settings')) return 'settings';
    if (path.includes('profile')) return 'profile';
    return 'overview';
  };

  const activeTab = getActiveTab();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
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
    setIsBookingModalOpen(false);
    setSelectedResource(null);
    navigate('/dashboard/bookings');
  };

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'resources', label: 'Resources', icon: Package },
    { id: 'bookings', label: 'My Bookings', icon: CalendarIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const adminItems = [
    { id: 'manage-resources', label: 'Manage Resources', icon: Package },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldAlert },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="h-screen w-full flex bg-brand-bg dark:bg-zinc-950 transition-colors duration-300 overflow-hidden relative">
        {/* Mobile Backdrop */}
        <AnimatePresence>
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-72 h-screen bg-white dark:bg-zinc-900 flex flex-col p-8 shrink-0 
          border-r border-gray-100 dark:border-zinc-800 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
        <div className="flex items-center justify-between mb-12 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
              <LayoutDashboard className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-extrabold text-[#1B2559] dark:text-white tracking-tight">ResourceFlow</h1>
          </div>
          <button 
            className="lg:hidden p-2 text-brand-lavender hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-grow space-y-2">
          {(!isAdmin ? navItems : navItems.filter(item => item.id === 'settings')).map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id === 'overview' ? '/dashboard' : `/dashboard/${item.id}`)}
              className={`sidebar-link w-full text-left ${activeTab === item.id ? 'sidebar-link-active' : ''}`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-brand-blue' : 'text-brand-lavender'}`} />
                  <span className={activeTab === item.id ? 'text-brand-blue dark:text-white' : 'text-brand-lavender dark:text-zinc-400'}>{item.label}</span>
            </button>
          ))}

          {isAdmin && (
            <div className="pt-8 space-y-2">
              <p className="px-4 text-[10px] font-extrabold text-brand-lavender uppercase tracking-widest mb-4 opacity-50">Administration</p>
              {adminItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/dashboard/${item.id}`)}
                  className={`sidebar-link w-full text-left ${activeTab === item.id ? 'sidebar-link-active' : ''}`}
                >
                  <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-brand-blue' : 'text-brand-lavender'}`} />
                  <span className={activeTab === item.id ? 'text-brand-blue dark:text-white' : 'text-brand-lavender dark:text-zinc-400'}>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="pt-8 mt-auto border-t border-gray-100 dark:border-white/5">
          <button 
            onClick={logout} 
            aria-label="Logout from account"
            className="sidebar-link w-full text-left hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 group"
          >
            <LogOut className="w-5 h-5 group-hover:text-red-500" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col bg-brand-bg dark:bg-zinc-950 h-screen overflow-y-auto overflow-x-hidden">
        {/* Unified Top header */}
        <header className="flex items-center justify-between px-4 lg:px-10 py-6 sticky top-0 z-20 bg-brand-bg/80 dark:bg-zinc-950/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-soft dark:shadow-none border border-transparent dark:border-white/5"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6 text-brand-blue" aria-hidden="true" />
            </button>
            <button 
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-soft dark:shadow-none border border-transparent dark:border-white/5 text-brand-lavender hover:text-brand-blue transition-colors"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="hidden md:block">
              <Breadcrumbs />
            </div>
          </div>

          <div className="flex items-center gap-4 bg-brand-bg/50 dark:bg-zinc-950/50 p-2 rounded-3xl border border-white dark:border-white/5">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 rounded-2xl bg-white dark:bg-zinc-900 text-brand-lavender hover:text-brand-blue transition-colors shadow-soft dark:shadow-none border border-transparent dark:border-white/5"
            >
              {isDarkMode ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
            </button>

            <NotificationBell />

            <button
              className="flex items-center gap-2 group bg-transparent border-none outline-none cursor-pointer"
              onClick={() => navigate('/dashboard/profile')}
              title="View Profile"
            >
              <div className="h-8 w-8 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue group-hover:bg-brand-blue/20 transition-colors">
                <User className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="hidden xl:block text-right pr-2">
                <p className="text-xs font-bold text-[#1B2559] dark:text-white group-hover:text-brand-blue transition-colors">{user?.name}</p>
                <p className="text-[10px] text-brand-lavender uppercase font-medium">{user?.role}</p>
              </div>
            </button>
          </div>
        </header>

        <main className="w-full px-4 lg:px-10 pb-10">
          <Outlet context={{ 
            searchTerm: '', 
            onBook: (resource) => {
              setSelectedResource(resource);
              setIsBookingModalOpen(true);
            } 
          }} />
        </main>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <BookingForm 
          resource={selectedResource} 
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedResource(null);
          }}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* AI Assistant */}
      <ChatWidget />
    </div>
  );
};

export default Dashboard;
