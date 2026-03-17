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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, utilRes, eventsRes, calRes] = await Promise.all([
          api.get('/analytics/stats'),
          api.get(`/analytics/utilization?filter=${utilizationFilter}`),
          api.get('/analytics/events'),
          api.get('/analytics/calendar')
        ]);
        setStats(statsRes.data);
        setUtilization(utilRes.data);
        setEvents(eventsRes.data);
        setCalendar(calRes.data);
        console.log("Chart Data Debug:", { utilization: utilRes.data });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [utilizationFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="px-2">
        <div className="flex flex-col mb-1">
          <span className="text-xs font-bold text-brand-lavender uppercase tracking-[0.15em] opacity-80 mb-2">
            {getGreeting()}, {user?.name?.split(' ')[0]}
          </span>
          <h1 className="text-3xl font-bold text-[#1B2559] dark:text-white">Company Overview</h1>
        </div>
        <p className="text-sm text-brand-lavender font-medium">Real-time resource utilization and planning data.</p>
      </header>

      <StatsGrid stats={stats} />

      {/* New Dual Column Layout matching Think Thunder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <UpcomingEventsBanner events={events} />
          <ProgressReportChart 
            data={utilization} 
            activeFilter={utilizationFilter}
            onFilterChange={setUtilizationFilter}
          />
        </div>
        
        {/* Right Column (Span 1) */}
        <div className="lg:col-span-1 flex flex-col gap-8 h-full">
           <CalendarWidget activeDays={calendar} />
        </div>
      </div>
    </div>
  );
};

export default Overview;
