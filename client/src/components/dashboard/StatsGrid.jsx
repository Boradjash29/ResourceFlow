import React from 'react';
import { Users, Calendar, CheckCircle, Package } from 'lucide-react';

const StatsCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="card flex items-center gap-4 py-5 px-6">
    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${colorClass.replace('text-', 'bg-').split(' ')[0]}/10 ${colorClass.split(' ')[1]} dark:bg-zinc-950/50 dark:border dark:border-white/5`}>
      <Icon className="w-7 h-7" />
    </div>
    <div>
      <p className="text-sm font-extrabold text-[#1B2559]/60 dark:text-zinc-400 mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-extrabold text-[#1B2559] dark:text-white">{value}</p>
    </div>
  </div>
);

const StatsGrid = ({ stats }) => {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard 
        title="Total Resources" 
        value={stats.totalResources} 
        icon={Package} 
        colorClass="bg-blue-50 text-blue-600" 
      />
      <StatsCard 
        title="Total Bookings" 
        value={stats.totalBookings} 
        icon={Calendar} 
        colorClass="bg-green-50 text-green-600" 
      />
      <StatsCard 
        title="Active Now" 
        value={stats.activeBookings} 
        icon={Users} 
        colorClass="bg-purple-50 text-purple-600" 
      />
      <StatsCard 
        title="Available Rooms" 
        value={stats.availableResources} 
        icon={CheckCircle} 
        colorClass="bg-emerald-50 text-emerald-600" 
      />
    </div>
  );
};

export default StatsGrid;
