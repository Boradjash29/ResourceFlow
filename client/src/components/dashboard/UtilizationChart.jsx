import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const UtilizationChart = ({ data }) => {
  return (
    <div className="card h-[400px]">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Recent & Upcoming Activity</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-white/5" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'currentColor', fontSize: 12 }} 
              className="text-gray-400 dark:text-brand-lavender/40"
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'currentColor', fontSize: 12 }}
              className="text-gray-400 dark:text-brand-lavender/40"
            />
            <Tooltip 
              cursor={{ fill: 'currentColor', className: 'text-gray-50/50 dark:text-zinc-800/50' }}
              contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'white' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              className="dark:!bg-zinc-900 dark:!text-white"
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 3 ? '#4318FF' : '#4318FF33'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default UtilizationChart;
