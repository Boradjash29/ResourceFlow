import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Users, Clock, Package, Download, 
  Calendar, AlertCircle, Loader2, Filter, Activity
} from 'lucide-react';
import Skeleton from '../components/ui/Skeleton';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/analytics/stats');
        setData(response.data);
      } catch {
        console.error('Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="space-y-8 px-2">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[400px] rounded-3xl" />
        <Skeleton className="h-[400px] rounded-3xl" />
      </div>
    </div>
  );

  if (!data || !data.summary) return (
    <div className="flex flex-col items-center justify-center h-[60vh] bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
      <AlertCircle className="w-12 h-12 text-brand-lavender mb-4" />
      <h3 className="text-xl font-bold text-[#1B2559] dark:text-white mb-2">No Analytics Data</h3>
      <p className="text-brand-lavender text-center max-w-xs">We couldn't load the platform performance data. Please try again later.</p>
    </div>
  );

  const COLORS = ['#4318FF', '#6AD2FF', '#EFF4FB', '#1B2559'];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="px-2 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-brand-blue" />
            <span className="text-[10px] font-bold text-brand-lavender uppercase tracking-[0.2em]">Platform Performance</span>
          </div>
          <h1 className="text-3xl font-bold text-[#1B2559] dark:text-white mb-1">Analytics Dashboard</h1>
          <p className="text-sm text-brand-lavender font-medium">Deep insights into resource utilization and booking behavior.</p>
        </div>
        <button className="btn btn-primary px-6 py-2.5 flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 px-2">
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 bg-[#F4F7FE] dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-brand-blue">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-brand-lavender uppercase mb-1">Total Assets</p>
            <p className="text-2xl font-bold text-[#1B2559] dark:text-white">{data.summary.totalResources}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 bg-[#F4F7FE] dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-brand-blue">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-brand-lavender uppercase mb-1">Total Bookings</p>
            <p className="text-2xl font-bold text-[#1B2559] dark:text-white">{data.summary.totalBookings}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 bg-green-50 dark:bg-green-900/10 rounded-2xl flex items-center justify-center text-green-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-brand-lavender uppercase mb-1">Active (30d)</p>
            <p className="text-2xl font-bold text-[#1B2559] dark:text-white">{data.summary.activeBookings}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/10 rounded-2xl flex items-center justify-center text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-brand-lavender uppercase mb-1">Utilization</p>
            <p className="text-2xl font-bold text-[#1B2559] dark:text-white">78%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-2">
        {/* Booking Trends Area Chart */}
        <div className="card">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-lg font-bold text-[#1B2559] dark:text-white">Monthly Trends</h3>
              <p className="text-xs text-brand-lavender">Booking volume over the last 6 months</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrends}>
                <defs>
                  <linearGradient id="colorTrends" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4318FF" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4318FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9EDF7" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#A3AED0', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#A3AED0', fontSize: 12}} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#4318FF', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="count" stroke="#4318FF" strokeWidth={3} fillOpacity={1} fill="url(#colorTrends)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours PeakChart */}
        <div className="card">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-lg font-bold text-[#1B2559] dark:text-white">Peak Hours</h3>
              <p className="text-xs text-brand-lavender">Distribution of bookings by hour of day</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.peakHours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9EDF7" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#A3AED0', fontSize: 10}} dy={10} interval={2} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#A3AED0', fontSize: 12}} dx={-10} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.peakHours.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 10 ? '#4318FF' : '#6AD2FF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-2">
        {/* Most Used Resources Bar Chart */}
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-bold text-[#1B2559] dark:text-white mb-8">Asset Utilization</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.resourceUtilization} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E9EDF7" />
                <XAxis type="number" axisLine={false} tickLine={false} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#1B2559', fontWeight: 600, fontSize: 12}} width={100} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" fill="#4318FF" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Distribution Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-bold text-[#1B2559] dark:text-white mb-2">Daily Distribution</h3>
          <p className="text-xs text-brand-lavender mb-8">Bookings by day of week</p>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.dailyBookings}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {data.dailyBookings.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="text-2xl font-bold text-[#1B2559] dark:text-white">Day</span>
              <span className="text-[10px] text-brand-lavender uppercase font-bold">Split</span>
            </div>
          </div>
          <div className="space-y-4 pt-4">
             {data.dailyBookings.slice(1, 4).map((item, i) => (
               <div key={item.name} className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                   <span className="text-sm font-bold text-brand-lavender">{item.name}</span>
                 </div>
                 <span className="text-sm font-bold text-[#1B2559] dark:text-white font-mono">{item.count}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
