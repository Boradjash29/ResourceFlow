import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Calendar, Clock, MapPin, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
            <p className="text-gray-600">Review and manage your upcoming reservations.</p>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Loading your bookings...</p>
          </div>
        ) : bookings.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {bookings.map((booking) => (
                <motion.div 
                  key={booking.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`card ${booking.status === 'cancelled' ? 'opacity-60 grayscale' : ''}`}
                >
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900">{booking.meeting_title}</h3>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusStyle(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{new Date(booking.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{booking.resource_name} ({booking.resource_type.replace('_', ' ')})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {booking.status !== 'cancelled' && (
                        <button 
                          onClick={() => handleCancel(booking.id)}
                          className="btn btn-secondary text-red-600 border-red-100 hover:bg-red-50 flex items-center gap-2 w-full md:w-auto justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">You haven't made any bookings yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;
