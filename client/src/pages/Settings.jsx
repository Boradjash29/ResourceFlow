import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Bell,
  Moon,
  Sun,
  Shield,
  Globe,
  Trash2,
  Save,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../lib/api';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('appearance');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  
  const [notifPrefs, setNotifPrefs] = useState({
    bookingConfirmations: true,
    reminders: true,
    systemUpdates: false,
    marketing: false
  });

  const [isLoading, setIsLoading] = useState(false);
  
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);

  useEffect(() => {
    const checkCalendarStatus = async () => {
      try {
         const res = await api.get('/calendar/status');
         setIsCalendarConnected(res.data.connected);
      } catch {
         console.error('Failed to fetch calendar status');
      } finally {
         setIsLoadingCalendar(false);
      }
    };
    checkCalendarStatus();
    
    // Check URL for callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('calendar') === 'success') {
      toast.success('Successfully connected to Google Calendar');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('calendar') === 'error') {
      toast.error('Failed to connect to Google Calendar');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleConnectCalendar = async () => {
    setIsLoadingCalendar(true);
    try {
      const res = await api.get('/calendar/google/connect');
      window.location.href = res.data.url;
    } catch {
      toast.error('Failed to start connection process');
      setIsLoadingCalendar(false);
    }
  };

  const handleImportEvents = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/calendar/import');
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to import external events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    setIsLoadingCalendar(true);
    try {
      await api.post('/calendar/disconnect');
      setIsCalendarConnected(false);
      toast.success('Disconnected from Google Calendar');
    } catch {
      toast.error('Failed to disconnect calendar');
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const toggleTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    }
  };

  const handleSaveNotifs = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Monitor },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Calendar },
    { id: 'system', label: 'System', icon: Globe, adminOnly: true },
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || user?.role === 'admin');

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="px-2">
        <h1 className="text-3xl font-bold text-[#1B2559] dark:text-white mb-1">Settings</h1>
        <p className="text-sm text-brand-lavender font-medium">Manage your account preferences and application settings.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 px-2">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                  : 'bg-white dark:bg-zinc-900 text-[#1B2559] dark:text-white border border-white dark:border-white/5 hover:border-brand-blue/10'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-grow">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card p-8 min-h-[400px]"
            >
              {activeTab === 'appearance' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-[#1B2559] dark:text-white mb-2">Theme Mode</h3>
                    <p className="text-sm text-brand-lavender font-medium mb-6">Choose how ResourceFlow looks to you.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => toggleTheme('light')}
                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col gap-4 text-left ${
                          !isDarkMode 
                            ? 'border-brand-blue bg-brand-blue/[0.02]' 
                            : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-zinc-950/50 hover:border-brand-blue/30'
                        }`}
                      >
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-amber-500">
                          <Sun className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-[#1B2559] dark:text-white uppercase tracking-wider text-xs">Light Mode</p>
                          <p className="text-sm text-brand-lavender mt-1">Clean and classic experience</p>
                        </div>
                      </button>

                      <button
                        onClick={() => toggleTheme('dark')}
                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col gap-4 text-left ${
                          isDarkMode 
                            ? 'border-brand-blue bg-brand-blue/[0.02]' 
                            : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-zinc-950/50 hover:border-brand-blue/30'
                        }`}
                      >
                        <div className="w-12 h-12 bg-zinc-900 rounded-2xl shadow-sm flex items-center justify-center text-brand-blue">
                          <Moon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-[#1B2559] dark:text-white uppercase tracking-wider text-xs">Dark Mode</p>
                          <p className="text-sm text-brand-lavender mt-1">Easier on the eyes in low light</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-[#1B2559] dark:text-white mb-2">Notification Preferences</h3>
                    <p className="text-sm text-brand-lavender font-medium mb-6">Control when and how you want to be notified.</p>
                    
                    <div className="space-y-4">
                      {Object.entries(notifPrefs).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-white/5">
                          <div>
                            <p className="font-bold text-[#1B2559] dark:text-white capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="text-xs text-brand-lavender">Receive updates about this activity</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={value}
                              onChange={(e) => setNotifPrefs({ ...notifPrefs, [key]: e.target.checked })}
                              className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                          </label>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleSaveNotifs}
                      disabled={isLoading}
                      className="btn-primary mt-8 px-8 py-3 rounded-2xl flex items-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                   <div className="bg-brand-blue/5 border border-brand-blue/10 p-6 rounded-3xl flex items-start gap-4">
                      <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1B2559] dark:text-white">Security Controls</h4>
                        <p className="text-sm text-brand-lavender font-medium mt-1">To update your password or enable Two-Factor Authentication, please visit your Profile page.</p>
                        <button 
                          onClick={() => window.location.href = '/profile'}
                          className="mt-4 text-sm font-bold text-brand-blue hover:underline"
                        >
                          Go to Profile →
                        </button>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-[#1B2559] dark:text-white mb-2">Connected Apps</h3>
                    <p className="text-sm text-brand-lavender font-medium mb-6">Connect external services to ResourceFlow.</p>
                    
                    <div className="flex flex-col gap-4">
                      <div className="p-6 rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-zinc-950/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center text-brand-blue">
                            <Calendar className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-[#1B2559] dark:text-white">Google Calendar</p>
                            <p className="text-sm text-brand-lavender mt-1">
                              {isCalendarConnected ? 'Connected and syncing bookings.' : 'Sync your bookings directly to your primary calendar.'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={isCalendarConnected ? handleDisconnectCalendar : handleConnectCalendar}
                          disabled={isLoadingCalendar}
                          className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                            isCalendarConnected 
                              ? 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20' 
                              : 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-hover'
                          }`}
                        >
                           {isLoadingCalendar && <Loader2 className="w-4 h-4 animate-spin" />}
                           {!isLoadingCalendar && isCalendarConnected ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                      
                      {isCalendarConnected && (
                         <div className="p-6 rounded-3xl border border-blue-100 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="text-brand-blue">
                              <p className="font-bold">Sync External Meetings</p>
                              <p className="text-sm text-brand-blue/80 mt-1">Import upcoming events from your Google Calendar into ResourceFlow.</p>
                            </div>
                            <button 
                              onClick={handleImportEvents}
                              disabled={isLoading}
                              className="bg-brand-blue text-white shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-hover px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
                            >
                               {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                               Import Now
                            </button>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-8">
                   <div>
                    <h3 className="text-xl font-bold text-[#1B2559] dark:text-white mb-2">System Administration</h3>
                    <p className="text-sm text-brand-lavender font-medium mb-6">Global application configurations (Admin only).</p>
                    
                    <div className="p-6 rounded-3xl border border-amber-100 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-start gap-4">
                      <AlertCircle className="w-5 h-5 mt-0.5" />
                      <div className="text-xs space-y-2">
                        <p className="font-bold">Caution: Systems Settings</p>
                        <p>Changes here affect all users. Currently including:</p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>Maintenance Mode</li>
                          <li>Default Resource Capacity</li>
                          <li>System-wide Broadcasts</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Settings;
