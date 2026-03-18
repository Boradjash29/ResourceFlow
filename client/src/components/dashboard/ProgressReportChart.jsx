import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const ProgressReportChart = ({ data = [], activeFilter = 'week', onFilterChange }) => {
  return (
    <div className="card h-[380px] w-full p-8 rounded-[2rem] shadow-premium border-none relative">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-[#1B2559]">Progress Report</h3>
        <div className="flex gap-4 text-xs font-bold text-gray-400">
           <button 
             onClick={() => onFilterChange?.('all')}
             className={`transition-colors hover:text-brand-blue ${activeFilter === 'all' ? 'text-[#1B2559]' : ''}`}>
             All Time
           </button>
           <button 
             onClick={() => onFilterChange?.('year')}
             className={`transition-colors hover:text-brand-blue ${activeFilter === 'year' ? 'text-[#1B2559]' : ''}`}>
             This Year
           </button>
           <button 
             onClick={() => onFilterChange?.('week')}
             className={`transition-colors hover:text-brand-blue ${activeFilter === 'week' ? 'text-[#1B2559]' : ''}`}>
             This Week
           </button>
        </div>
      </div>
      
      <div className="flex gap-6 mb-8 text-sm font-bold text-[#1B2559]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1B2559]"></div>
          Resource Utilization
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#05CD99]"></div>
          Bookings Created
        </div>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: -10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#68769F', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#A3AED0', fontSize: 12, fontWeight: 600 }} 
              allowDecimals={false}
            />
            <Tooltip
               contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold', color: '#1B2559' }}
            />
            <Line 
              type="monotone" 
              dataKey="utilized" 
              stroke="#1B2559" 
              strokeWidth={3} 
              dot={false}
              activeDot={{ r: 6, fill: '#1B2559', stroke: '#fff', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="created" 
              stroke="#05CD99" 
              strokeWidth={3} 
              dot={false} 
              activeDot={{ r: 6, fill: '#05CD99', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressReportChart;
