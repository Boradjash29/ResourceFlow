import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  Calendar, Clock, MapPin, Users, User, ChevronLeft, 
  Download, Trash2, Printer, AlertCircle, Loader2,
  CheckCircle, FileText, Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import Skeleton from '../components/ui/Skeleton';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await api.get(`/bookings/${id}`);
        setBooking(response.data);
      } catch {
        console.error('Error fetching booking');
        toast.error('Could not load booking details');
        navigate('/dashboard/bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, navigate]);

  const handleConfirmCancel = async () => {
    try {
      await api.delete(`/bookings/${id}`);
      setBooking({ ...booking, status: 'cancelled' });
      toast.success('Reservation cancelled');
    } catch {
      toast.error('Failed to cancel booking');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 px-2 max-w-4xl mx-auto">
        <Skeleton className="w-32 h-6" />
        <Skeleton className="w-full h-64 rounded-[32px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-48 rounded-[32px]" />
          <Skeleton className="h-48 rounded-[32px]" />
        </div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-5xl mx-auto px-2 print:p-0">
      {/* Header / Back Navigation */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-between items-center print:hidden"
      >
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-brand-lavender font-bold hover:text-brand-blue transition-colors group"
        >
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-soft group-hover:bg-brand-blue group-hover:text-white transition-all">
            <ChevronLeft className="w-5 h-5" />
          </div>
          Back to list
        </button>
      </motion.div>

      {/* Main Detail Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-0 overflow-hidden relative"
      >
        <div className="p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-brand-blue uppercase tracking-widest">Reservation Record</span>
              </div>
              <h1 className="text-4xl font-extrabold text-[#1B2559] dark:text-white tracking-tight">{booking.meeting_title}</h1>
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                booking.status === 'confirmed' ? 'bg-green-50 text-success border-green-100' :
                booking.status === 'pending' ? 'bg-amber-50 text-warning border-amber-100' :
                'bg-red-50 text-danger border-red-100'
              }`}>
                {booking.status === 'confirmed' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {booking.status}
              </div>
            </div>

            <div className="text-right print:text-left">
              <p className="text-[10px] uppercase font-extrabold text-brand-lavender tracking-[0.2em] mb-1">Booking ID</p>
              <p className="text-sm font-mono font-bold text-[#1B2559] dark:text-white opacity-50">#{booking.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-[10px] uppercase font-extrabold text-brand-lavender tracking-widest">
                <Calendar className="w-3 h-3 text-brand-blue" /> Date
              </p>
              <p className="text-lg font-bold text-[#1B2559] dark:text-white">
                {new Date(booking.start_time).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-[10px] uppercase font-extrabold text-brand-lavender tracking-widest">
                <Clock className="w-3 h-3 text-brand-blue" /> Time Block
              </p>
              <p className="text-lg font-bold text-[#1B2559] dark:text-white">
                {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-[10px] uppercase font-extrabold text-brand-lavender tracking-widest">
                <MapPin className="w-3 h-3 text-brand-blue" /> Resource
              </p>
              <p className="text-lg font-bold text-[#1B2559] dark:text-white">{booking.resource.name}</p>
              <p className="text-sm font-medium text-brand-lavender">{booking.resource.location}</p>
            </div>
          </div>
        </div>

        {/* Diagonal Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full -mr-32 -mt-32 blur-3xl -z-10"></div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Description & Participants */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-8"
        >
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-5 h-5 text-brand-blue" />
              <h3 className="text-xl font-bold text-[#1B2559] dark:text-white">Booking Overview</h3>
            </div>
            <p className="text-brand-lavender font-medium leading-relaxed">
              {booking.description || "No description provided for this booking."}
            </p>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-brand-blue" />
              <h3 className="text-xl font-bold text-[#1B2559] dark:text-white">Participants</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {booking.participants && booking.participants.length > 0 ? (
                booking.participants.map((email, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-brand-bg dark:bg-zinc-950/50 border border-gray-50 dark:border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center text-brand-blue shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-[#1B2559] dark:text-white truncate">{email}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-brand-lavender italic">No external participants invited.</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Actions & Meta */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8 print:hidden"
        >
          <div className="card h-full flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#1B2559] dark:text-white">Manage Status</h3>
              <p className="text-sm text-brand-lavender font-medium">
                You can release this resource if you no longer need it. This will notify the admin and free up the slot.
              </p>
            </div>
            
            <div className="pt-8 mt-auto">
              {booking.status !== 'cancelled' ? (
                <button 
                  onClick={() => setIsCancelOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white font-bold transition-all shadow-lg shadow-red-500/10"
                >
                  <Trash2 className="w-5 h-5" />
                  Cancel Reservation
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950 text-center text-brand-lavender font-bold text-sm">
                  This booking is already inactive.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <ConfirmationDialog 
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel this Meeting?"
        message="By cancelling, this resource will immediately become available for other team members. This action cannot be undone."
        confirmLabel="Yes, Cancel Booking"
        variant="danger"
      />

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .card { border: none !important; box-shadow: none !important; }
          .btn-primary, .sidebar, header, .ChatWidget { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default BookingDetails;
