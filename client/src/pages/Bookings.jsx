import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Calendar, Clock, MapPin, Trash2, Loader2, AlertCircle, Sparkles, Search, Filter, Repeat, Download, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    sort_by: 'start_time',
    sort_order: 'desc',
    limit: 10
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [isSeriesConfirmOpen, setIsSeriesConfirmOpen] = useState(false);
  const [seriesIdToCancel, setSeriesIdToCancel] = useState(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchBookings = async (page = 1) => {
    setLoading(true);
    try {
      const { status, sort_by, sort_order } = filters;
      const params = new URLSearchParams({
        page,
        limit: filters.limit,
        sort_by,
        sort_order,
        ...(status && { status }),
        ...(debouncedSearch && { search: debouncedSearch })
      });
      const response = await api.get(`/bookings?${params.toString()}`);
      setBookings(response.data.bookings);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(1);
  }, [filters.status, filters.sort_by, filters.sort_order, filters.limit, debouncedSearch]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Keep it up';
    if (hour < 17) return 'Doing great';
    return 'Almost done';
  };

  const handleCancelClick = (booking) => {
    setBookingToCancel(booking);
    setIsConfirmOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    try {
      await api.delete(`/bookings/${bookingToCancel.id}`);
      setBookings(bookings.map(b => b.id === bookingToCancel.id ? { ...b, status: 'cancelled' } : b));
      setIsConfirmOpen(false);
      setBookingToCancel(null);
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      setIsConfirmOpen(false);
      setBookingToCancel(null);
    }
  };

  const handleCancelSeriesClick = (seriesId) => {
    setSeriesIdToCancel(seriesId);
    setIsSeriesConfirmOpen(true);
  };

  const handleConfirmCancelSeries = async () => {
    if (!seriesIdToCancel) return;
    try {
      await api.delete(`/bookings/series/${seriesIdToCancel}`);
      setBookings(bookings.map(b => b.series_id === seriesIdToCancel ? { ...b, status: 'cancelled' } : b));
      setIsSeriesConfirmOpen(false);
      setSeriesIdToCancel(null);
    } catch (error) {
      console.error('Failed to cancel series:', error);
      setIsSeriesConfirmOpen(false);
      setSeriesIdToCancel(null);
    }
  };

  const toggleSelection = (id) => {
    setSelectedBookings(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async () => {
    if (selectedBookings.length === 0) return;
    try {
      if (bulkAction === 'delete') {
        await api.delete('/bookings/bulk-delete', { data: { ids: selectedBookings } });
        setBookings(bookings.filter(b => !selectedBookings.includes(b.id)));
      } else {
        await api.patch('/bookings/bulk-status', { ids: selectedBookings, status: 'cancelled' });
        setBookings(bookings.map(b => selectedBookings.includes(b.id) ? { ...b, status: 'cancelled' } : b));
      }
      setSelectedBookings([]);
      setIsBulkConfirmOpen(false);
    } catch (error) {
      console.error('Bulk action failed:', error);
      setIsBulkConfirmOpen(false);
    }
  };

  const exportToCSV = () => {
    if (bookings.length === 0) return;
    const headers = ['Title', 'Resource', 'Start', 'End', 'Status'];
    const rows = bookings.map(b => [
      b.meeting_title,
      b.resource_name,
      new Date(b.start_time).toLocaleString(),
      new Date(b.end_time).toLocaleString(),
      b.status
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="flex justify-end gap-3 mt-4">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 text-[#1B2559] dark:text-white rounded-xl border border-gray-100 dark:border-white/5 text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </header>

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row gap-4 px-2">
        <div className="flex-grow flex items-center bg-white dark:bg-zinc-900 rounded-3xl p-1.5 shadow-soft dark:shadow-none border border-white dark:border-white/5">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-lavender w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search bookings or resources..." 
              className="w-full bg-transparent border-none outline-none py-3 pl-12 pr-4 text-sm font-medium text-[#1B2559] dark:text-white placeholder:text-brand-lavender/50"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              aria-label="Search bookings"
            />
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0" role="group" aria-label="Filter bookings by status">
          {['', 'confirmed', 'pending', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilters({ ...filters, status })}
              className={`px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
                filters.status === status 
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                  : 'bg-white dark:bg-zinc-900 text-[#1B2559] dark:text-white border border-white dark:border-white/5'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6 px-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-8">
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div className="space-y-4 flex-grow">
                  <div className="flex items-center gap-4">
                    <Skeleton variant="circle" className="w-12 h-12" />
                    <div className="space-y-2 flex-grow">
                      <Skeleton variant="text" className="w-1/3 h-6" />
                      <Skeleton variant="text" className="w-1/4 h-4" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                  </div>
                </div>
                <div className="w-full lg:w-48">
                  <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
              </div>
            </div>
          ))}
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
                className={`card hover:border-brand-blue/10 transition-all relative overflow-hidden ${booking.status === 'cancelled' ? 'opacity-60 grayscale' : ''} ${selectedBookings.includes(booking.id) ? 'border-brand-blue ring-1 ring-brand-blue/20 bg-brand-blue/[0.02]' : ''}`}
              >
                {/* Checkbox Overlay */}
                <div className="absolute top-4 left-4 z-10">
                  <input 
                    type="checkbox"
                    checked={selectedBookings.includes(booking.id)}
                    onChange={() => toggleSelection(booking.id)}
                    className="w-5 h-5 rounded-lg border-gray-300 text-brand-blue focus:ring-brand-blue cursor-pointer transition-all"
                    aria-label={`Select booking ${booking.meeting_title}`}
                  />
                </div>

                <div className="flex flex-col lg:flex-row justify-between gap-6 pl-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <Link to={`/dashboard/bookings/${booking.id}`} className="hover:text-brand-blue transition-colors">
                          <h3 className="text-xl font-semibold text-[#1B2559] dark:text-white">{booking.meeting_title}</h3>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-block text-[10px] uppercase tracking-[0.1em] font-bold px-2.5 py-1 rounded-full border ${getStatusStyle(booking.status)}`}>
                            {booking.status}
                          </span>
                          {booking.recurrence_rule && booking.recurrence_rule !== 'NONE' && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] font-bold px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                              <Repeat className="w-2.5 h-2.5" />
                              {booking.recurrence_rule}
                            </span>
                          )}
                        </div>
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

                  <div className="flex items-center gap-3 lg:border-l lg:border-gray-50 dark:lg:border-white/5 lg:pl-8">
                    <Link 
                      to={`/dashboard/bookings/${booking.id}`}
                      className="btn bg-brand-blue/5 text-brand-blue hover:bg-brand-blue hover:text-white border-none px-6"
                    >
                      Details
                    </Link>
                    {booking.status !== 'cancelled' ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleCancelClick(booking)}
                          className="btn bg-red-50 text-red-500 hover:bg-red-100 border-none px-4"
                          title="Cancel this instance"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {booking.series_id && (
                          <button 
                            onClick={() => handleCancelSeriesClick(booking.series_id)}
                            className="btn bg-red-500 text-white hover:bg-red-600 border-none px-4"
                            title="Cancel entire series"
                          >
                            <Repeat className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
          
          {/* Pagination UI */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-white dark:border-white/5 shadow-soft">
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-brand-lavender">
                Showing <span className="text-[#1B2559] dark:text-white font-bold">{(pagination.page - 1) * filters.limit + 1}-{Math.min(pagination.page * filters.limit, pagination.total)}</span> of <span className="text-[#1B2559] dark:text-white font-bold">{pagination.total}</span>
              </p>
              <div className="h-4 w-px bg-gray-200 dark:bg-white/10 mx-2"></div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-brand-lavender">Per page:</span>
                <select 
                  className="bg-transparent border-none outline-none text-sm font-bold text-[#1B2559] dark:text-white cursor-pointer"
                  value={filters.limit}
                  onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex gap-2">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => fetchBookings(p)}
                    className={`w-10 h-10 rounded-xl font-bold transition-all ${
                      pagination.page === p 
                        ? 'bg-brand-blue text-white' 
                        : 'bg-white dark:bg-zinc-900 text-[#1B2559] dark:text-white hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState 
          icon={Calendar}
          title="No bookings found"
          description={debouncedSearch || filters.status
            ? "Try adjusting your filters or search terms to find what you're looking for."
            : "You don't have any reservations scheduled yet."
          }
          actionLabel={debouncedSearch || filters.status ? "Clear All Filters" : "Book a Resource"}
          onAction={debouncedSearch || filters.status 
            ? () => setFilters({ status: '', search: '', sort_by: 'start_time', sort_order: 'desc' })
            : () => window.location.href = '/resources'
          }
        />
      )}

      <ConfirmationDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Reservation?"
        message={`Are you sure you want to cancel your booking for "${bookingToCancel?.meeting_title}"? This action will free up the resource for others.`}
        confirmLabel="Yes, Cancel it"
        variant="danger"
      />

      <ConfirmationDialog 
        isOpen={isSeriesConfirmOpen}
        onClose={() => setIsSeriesConfirmOpen(false)}
        onConfirm={handleConfirmCancelSeries}
        title="Cancel Entire Series?"
        message="Are you sure you want to cancel all future bookings in this recurring series? This action cannot be undone."
        confirmLabel="Yes, Cancel Series"
        variant="danger"
      />

      <ConfirmationDialog 
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={handleBulkAction}
        title={bulkAction === 'delete' ? 'Bulk Delete Bookings?' : 'Bulk Cancel Bookings?'}
        message={`Are you sure you want to ${bulkAction === 'delete' ? 'permanently delete' : 'cancel'} ${selectedBookings.length} selected bookings?`}
        confirmLabel={bulkAction === 'delete' ? 'Delete All' : 'Cancel All'}
        variant="danger"
      />

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedBookings.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1B2559] text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center text-[10px] font-bold">
                {selectedBookings.length}
              </div>
              <span className="text-sm font-bold whitespace-nowrap">Selected</span>
            </div>
            
            <div className="h-6 w-px bg-white/10"></div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setBulkAction('cancel'); setIsBulkConfirmOpen(true); }}
                className="px-4 py-2 hover:bg-white/10 rounded-xl transition-all text-sm font-bold flex items-center gap-2"
              >
                Cancel Selected
              </button>
              <button 
                onClick={() => { setBulkAction('delete'); setIsBulkConfirmOpen(true); }}
                className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all text-sm font-bold flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button 
                onClick={() => setSelectedBookings([])}
                className="px-4 py-2 text-white/60 hover:text-white text-sm font-bold"
              >
                Deselect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Bookings;
