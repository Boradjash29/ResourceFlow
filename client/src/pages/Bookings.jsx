import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Calendar, Clock, MapPin, Trash2, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Keep it up';
    if (hour < 17) return 'Doing great';
    return 'Almost done';
  };

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings');
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await api.delete(`/bookings/${id}`);
      setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    } catch (error) {
      alert('Failed to cancel booking');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100/50 text-success border-green-200/20';
      case 'pending': return 'bg-amber-100/50 text-warning border-amber-200/20';
      case 'cancelled': return 'bg-red-100/50 text-danger border-red-200/20';
      default: return 'bg-gray-100/50 text-brand-lavender border-gray-200/20';
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="px-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.2em] bg-brand-blue/5 dark:bg-zinc-900/50 px-3 py-1 rounded-lg border border-brand-blue/10">
            {getGreeting()}, {user?.name?.split(' ')[0]}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[#1B2559] dark:text-white mb-1">My Bookings</h1>
        <p className="text-sm text-brand-lavender font-medium">Review and manage your scheduled reservations.</p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 px-2">
          <Loader2 className="w-12 h-12 animate-spin text-brand-blue mb-4 opacity-20" />
          <p className="text-brand-lavender font-bold">Fetching your schedule...</p>
        </div>
      ) : bookings.length > 0 ? (
        <div className="space-y-6 px-2">
          <AnimatePresence>
            {bookings.map((booking) => (
              <motion.div 
                key={booking.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`card hover:border-brand-blue/10 transition-all ${booking.status === 'cancelled' ? 'opacity-60 grayscale' : ''}`}
              >
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[#1B2559] dark:text-white">{booking.meeting_title}</h3>
                        <span className={`inline-block mt-1 text-[10px] uppercase tracking-[0.1em] font-bold px-2.5 py-1 rounded-full border ${getStatusStyle(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                      <div className="flex items-center gap-3 text-sm font-medium text-brand-lavender">
                        <div className="w-8 h-8 bg-brand-bg dark:bg-zinc-950 rounded-xl flex items-center justify-center text-brand-blue/60">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <span>{new Date(booking.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-brand-lavender">
                        <div className="w-8 h-8 bg-brand-bg dark:bg-zinc-950 rounded-xl flex items-center justify-center text-brand-blue/60">
                          <Clock className="w-4 h-4" />
                        </div>
                        <span>{new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-brand-lavender">
                        <div className="w-8 h-8 bg-brand-bg dark:bg-zinc-950 rounded-xl flex items-center justify-center text-brand-blue/60">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="line-clamp-1">{booking.resource_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center lg:border-l lg:border-gray-50 dark:lg:border-white/5 lg:pl-8">
                    {booking.status !== 'cancelled' ? (
                      <button 
                        onClick={() => handleCancel(booking.id)}
                        className="btn bg-red-50 text-red-500 hover:bg-red-100 border-none px-8"
                      >
                        <Trash2 className="w-4 h-4" />
                        Cancel Booking
                      </button>
                    ) : (
                      <div className="text-sm font-bold text-brand-lavender flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Reservation Inactive
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="card text-center py-32 border-dashed border-2 border-brand-lavender/20 bg-transparent flex flex-col items-center justify-center">
          <Calendar className="w-16 h-16 text-brand-lavender/20 mb-4" />
          <p className="text-brand-lavender font-bold text-lg">No active bookings</p>
          <p className="text-brand-lavender/60 text-sm">Your scheduled reservations will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default Bookings;
