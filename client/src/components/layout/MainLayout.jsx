import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, LogOut, Package, Calendar as CalendarIcon, User, Settings, ShieldAlert, Moon, Sun } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';
import ChatWidget from '../chat/ChatWidget';

const MainLayout = ({ children, activeTabOverride }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Determine active tab based on path or override
  let activeTab = activeTabOverride;
  if (!activeTab) {
    if (location.pathname === '/dashboard') activeTab = 'overview';
    else if (location.pathname === '/profile') activeTab = 'profile';
    else activeTab = location.pathname.split('/').pop();
  }

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'resources', label: 'Resources', icon: Package, path: '/dashboard?tab=resources' },
    { id: 'bookings', label: 'My Bookings', icon: CalendarIcon, path: '/dashboard?tab=bookings' },
  ];

  const adminItems = [
    { id: 'manage-resources', label: 'Manage Resources', icon: Settings, path: '/dashboard?tab=manage-resources' },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldAlert, path: '/dashboard?tab=audit-logs' },
  ];

  const handleNavClick = (item) => {
    if (item.path.startsWith('/dashboard')) {
        const urlParams = new URLSearchParams(item.path.split('?')[1]);
        const tab = urlParams.get('tab') || 'overview';
        navigate('/dashboard', { state: { activeTab: tab } });
    } else {
        navigate(item.path);
    }
  };

  return (
    <div className="h-screen w-full flex bg-brand-bg dark:bg-brand-dark transition-colors duration-300 overflow-hidden relative font-sans">
      {/* Sidebar */}
      <aside className="w-72 h-screen bg-brand-blue dark:bg-zinc-950 flex flex-col p-8 shrink-0 z-10 border-r border-white/10">
        <div className="flex items-center gap-3 mb-12 px-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-blue shadow-lg shadow-black/20">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">ResourceFlow</h1>
        </div>

        <nav className="flex-grow space-y-2">
          {!isAdmin ? (
            navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-medium ${activeTab === item.id ? 'bg-white/10 text-white shadow-none font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-white/40'}`} />
                <span>{item.label}</span>
              </button>
            ))
          ) : (
            <>
              <p className="px-4 text-[10px] font-extrabold text-white/40 uppercase tracking-widest mb-4">Management</p>
              {adminItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-medium ${activeTab === item.id ? 'bg-white/10 text-white shadow-none font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                  <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-white/40'}`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="pt-8 mt-auto border-t border-white/10">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-medium text-white/60 hover:bg-red-500/10 hover:text-red-400 w-full text-left group">
            <LogOut className="w-5 h-5 group-hover:text-red-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col bg-[#F4F7FE] dark:bg-brand-dark-bg h-screen overflow-y-auto overflow-x-hidden">
        {/* Unified Top header */}
        <header className="flex items-center justify-between px-10 py-6 sticky top-0 z-20 bg-[#F4F7FE]/80 dark:bg-brand-dark-bg/80 backdrop-blur-md">
          <div className="text-sm font-medium text-brand-lavender">
            Pages / <span className="text-brand-blue capitalize font-bold">{activeTab.replace('-', ' ')}</span>
          </div>

          <div className="flex items-center gap-4 bg-white/50 dark:bg-zinc-900/50 p-2 rounded-3xl border border-white dark:border-white/5">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-2xl bg-white dark:bg-zinc-900 text-brand-lavender hover:text-brand-blue transition-colors shadow-soft dark:shadow-none border border-transparent dark:border-white/5"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <NotificationBell />

            <button
              className={`flex items-center gap-2 group bg-transparent border-none outline-none cursor-pointer p-1 rounded-2xl transition-all ${activeTab === 'profile' ? 'bg-brand-blue/5' : ''}`}
              onClick={() => navigate('/profile')}
              title="View Profile"
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${activeTab === 'profile' ? 'bg-brand-blue text-white' : 'bg-brand-blue/10 text-brand-blue group-hover:bg-brand-blue/20'}`}>
                <User className="w-4 h-4" />
              </div>
              <div className="hidden xl:block text-right pr-2">
                <p className={`text-xs font-bold transition-colors ${activeTab === 'profile' ? 'text-brand-blue' : 'text-[#1B2559] dark:text-white group-hover:text-brand-blue'}`}>{user?.name}</p>
                <p className="text-[10px] text-brand-lavender uppercase font-medium">{user?.role}</p>
              </div>
            </button>
          </div>
        </header>

        <main className="w-full px-10 pb-10">
          {children}
        </main>
      </div>

      {/* AI Assistant */}
      <ChatWidget />
    </div>
  );
};

export default MainLayout;
