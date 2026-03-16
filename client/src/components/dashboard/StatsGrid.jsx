import React from 'react';
import { Users, Calendar, CheckCircle, Package } from 'lucide-react';

const StatsCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </div>
);

const StatsGrid = ({ stats }) => {
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
