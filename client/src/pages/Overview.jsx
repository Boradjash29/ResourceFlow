import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import StatsGrid from '../components/dashboard/StatsGrid';
import UtilizationChart from '../components/dashboard/UtilizationChart';
import { Loader2, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Overview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [utilization, setUtilization] = useState([]);
  const [popular, setPopular] = useState([]);
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
        const [statsRes, utilRes, popRes] = await Promise.all([
          api.get('/analytics/stats'),
          api.get('/analytics/utilization'),
          api.get('/analytics/popular')
        ]);
        setStats(statsRes.data);
        setUtilization(utilRes.data);
        setPopular(popRes.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <UtilizationChart data={utilization} />
        </div>
        
        <div className="card h-full">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-brand-blue/10 rounded-lg flex items-center justify-center text-brand-blue">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#1B2559] dark:text-white">Popular Resources</h3>
          </div>
          
          <div className="space-y-4">
            {popular.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-brand-bg/40 dark:bg-zinc-950/50 rounded-3xl border border-white dark:border-white/5 hover:border-brand-blue/20 transition-all group">
                <span className="text-sm font-bold text-[#1B2559] dark:text-white">{item.name}</span>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 rounded-2xl text-brand-blue shadow-sm border border-brand-blue/5 dark:border-white/10">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs font-extrabold">{item.booking_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
