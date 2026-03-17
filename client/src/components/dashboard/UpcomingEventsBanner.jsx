import React from 'react';

const UpcomingEventsBanner = ({ events = [] }) => {
  return (
    <div className="w-full relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#4A88FF] to-[#3B66FF] text-white p-8 shadow-md h-[300px] flex items-center">
      {/* Decorative vector wave in background */}
      <svg className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 1000 300" preserveAspectRatio="none">
        <path fill="currentColor" d="M0,0 C200,100 300,-50 500,50 C700,150 800,-50 1000,50 L1000,300 L0,300 Z" />
      </svg>
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-10 left-10 w-32 h-32 bg-[#2D0FCC]/20 rounded-full blur-xl"></div>

      <div className="relative z-10 w-full flex">
        {/* Events Content */}
        <div className="flex flex-col justify-center gap-6 w-1/2 pr-6 border-r border-white/20">
          {events.length === 0 ? (
            <div className="text-center opacity-80 py-4">
              <h4 className="font-bold text-lg mb-1">No upcoming events</h4>
              <p className="text-sm">You're all clear for now! Take a break.</p>
            </div>
          ) : (
            events.map((event, index) => {
              const dateObj = new Date(event.start_time);
              const dayNum = dateObj.getDate();
              const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              const isToday = new Date().toDateString() === dateObj.toDateString();
              const isTomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toDateString() === dateObj.toDateString();
              
              const tag = isToday ? 'TODAY' : (isTomorrow ? 'TOMORROW' : 'UPCOMING');

              return (
                <div key={event.id} className={`flex gap-4 ${index > 0 ? 'opacity-80 transition-opacity hover:opacity-100' : ''}`}>
                  <div className="text-center min-w-[3rem]">
                    <span className="block text-2xl font-bold">{dayNum < 10 ? `0${dayNum}` : dayNum}</span>
                    <span className="block text-xs uppercase opacity-80">{dayStr}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-tight flex items-center gap-2">
                       {event.title || 'Meeting Request'}
                       {index === 0 && ' 🚀'}
                    </h4>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-xs opacity-90">{event.resource.name} ({timeStr})</span>
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wide">{tag}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Illustration side (placeholder representation) */}
        <div className="w-1/2 flex items-center justify-center relative">
           <div className="w-48 h-32 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl flex items-center justify-center p-4">
             <div className="w-full flex justify-between items-end h-full px-2 gap-2">
                <div className="w-4 bg-white/40 rounded-t-sm h-[40%]"></div>
                <div className="w-4 bg-white/60 rounded-t-sm h-[70%]"></div>
                <div className="w-4 bg-white border border-white/20 rounded-t-sm h-[90%] shadow-lg"></div>
                <div className="w-4 bg-white/80 rounded-t-sm h-[50%]"></div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingEventsBanner;
