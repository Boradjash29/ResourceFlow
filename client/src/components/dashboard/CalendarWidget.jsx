import React, { useState } from 'react';

const CalendarWidget = ({ activeDays = [] }) => {
  const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  
  const todayDate = new Date();
  const [viewDate, setViewDate] = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Generate calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const dates = [];
  let currentWeek = [];
  
  // Padding for first week
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      dates.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // Padding for last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    dates.push(currentWeek);
  }

  // Check if we are viewing the current real month to show active dots correctly
  const isCurrentRealMonth = year === todayDate.getFullYear() && month === todayDate.getMonth();
  const todayDay = isCurrentRealMonth ? todayDate.getDate() : null;

  return (
    <div className="card w-full p-6 rounded-[2rem] shadow-premium border-none mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-[#1B2559]">
          {viewDate.toLocaleString('default', { month: 'short' })} <span className="font-medium text-gray-400">{year}</span>
        </h3>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={handleNextMonth} className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4 text-center">
        {days.map(day => (
          <div key={day} className="text-xs font-bold text-brand-blue tracking-wide">{day}</div>
        ))}
      </div>

      <div className="space-y-3">
        {dates.map((week, i) => (
          <div key={i} className="grid grid-cols-7 gap-2 text-center">
            {week.map((date, idx) => {
              if (date === null) {
                return <div key={`empty-${idx}`} className="h-8 w-8"></div>;
              }

              const isActive = date === todayDay;
              const hasBooking = isCurrentRealMonth ? activeDays.includes(date) : false;
              const isPast = isCurrentRealMonth && date < todayDay;

              return (
                <div key={date} className="relative flex justify-center items-center h-8">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all
                    ${isActive ? 'bg-[#1B2559] text-white shadow-lg shadow-brand-blue/30' : 
                      isPast ? 'text-gray-300 font-medium' : 'text-[#1B2559] hover:bg-gray-50 cursor-pointer'}
                  `}>
                    {date < 10 ? `0${date}` : date}
                  </div>
                  {/* Indicators below dates */}
                  {hasBooking && <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#05CD99]"></div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><div className="w-2 h-2 rounded-full bg-[#05CD99]"></div> Booking ({activeDays.length})</div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><div className="w-2 h-2 rounded-full bg-[#1B2559]"></div> Today</div>
      </div>
    </div>
  );
};

export default CalendarWidget;
