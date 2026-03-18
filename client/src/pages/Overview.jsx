import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import StatsGrid from '../components/dashboard/StatsGrid';
import UpcomingEventsBanner from '../components/dashboard/UpcomingEventsBanner';
import ProgressReportChart from '../components/dashboard/ProgressReportChart';
import CalendarWidget from '../components/dashboard/CalendarWidget';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Overview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [utilization, setUtilization] = useState([]);
  const [utilizationFilter, setUtilizationFilter] = useState('week');
  const [events, setEvents] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const [loadingUtilization, setLoadingUtilization] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/analytics/stats');
      setStats(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchUtilization = async () => {
    setLoadingUtilization(true);
    try {
      const res = await api.get(`/analytics/utilization?filter=${utilizationFilter}`);
      setUtilization(res.data);
    } catch (e) { console.error(e); }
    setLoadingUtilization(false);
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get('/analytics/events');
      setEvents(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchCalendar = async () => {
    try {
      const res = await api.get('/analytics/calendar');
      setCalendar(res.data);
    } catch (e) { console.error(e); }
  };

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchUtilization(),
        fetchEvents(),
        fetchCalendar()
      ]);
      setLoading(false);
    };
    loadAll();
  }, []);

  // Filter-only load
  useEffect(() => {
    if (!loading) {
      fetchUtilization();
    }
  }, [utilizationFilter]);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="px-2">
        <div className="flex flex-col mb-1">
          <span className="text-xs font-extrabold text-[#1B2559] dark:text-zinc-400 uppercase tracking-[0.2em] mb-2">
            {getGreeting()}, {user?.name?.split(' ')[0]}
          </span>
          <h1 className="text-3xl font-bold text-[#1B2559] dark:text-white">Company Overview</h1>
        </div>
        <p className="text-sm text-[#1B2559]/70 dark:text-zinc-400 font-medium">Real-time resource utilization and planning data.</p>
      </header>

      {!stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/50 dark:bg-zinc-900/50 animate-pulse rounded-3xl" />)}
        </div>
      ) : (
        <StatsGrid stats={stats} />
      )}

      {/* New Dual Column Layout matching Think Thunder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {!events ? (
             <div className="h-40 bg-white/50 dark:bg-zinc-900/50 animate-pulse rounded-3xl" />
          ) : (
            <UpcomingEventsBanner events={events} />
          )}
          
          <div className="relative">
            <ProgressReportChart 
              data={utilization} 
              activeFilter={utilizationFilter}
              onFilterChange={setUtilizationFilter}
            />
            {(loadingUtilization || !utilization.length) && (
              <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 flex items-center justify-center rounded-3xl z-10">
                <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column (Span 1) */}
        <div className="lg:col-span-1 flex flex-col gap-8 h-full">
           {!calendar ? (
              <div className="flex-grow bg-white/50 dark:bg-zinc-900/50 animate-pulse rounded-3xl min-h-[400px]" />
           ) : (
             <CalendarWidget activeDays={calendar} />
           )}
        </div>
      </div>
    </div>
  );
};

export default Overview;
