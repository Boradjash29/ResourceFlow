import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, AlertCircle, CheckCircle, Loader2, Info, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import api from '../../lib/api';

const bookingSchema = z.object({
  meeting_title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  date: z.string().min(1, 'Date is required'),
  startHour: z.string(),
  startMinute: z.string(),
  startPeriod: z.enum(['AM', 'PM']),
  endHour: z.string(),
  endMinute: z.string(),
  endPeriod: z.enum(['AM', 'PM']),
  participants: z.string().optional(),
});

const BookingForm = ({ resource, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    meeting_title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startHour: '09',
    startMinute: '00',
    startPeriod: 'AM',
    endHour: '10',
    endMinute: '00',
    endPeriod: 'AM',
    participants: '',
    recurrence_rule: 'NONE'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState({ available: true, conflicts: [] });
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [suggestions, setSuggestions] = useState([]);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];
  
  // NEW: Support for selecting a resource if none provided
  const [allResources, setAllResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState(resource?.id || '');
  const [isFetchingResources, setIsFetchingResources] = useState(false);

  const to24h = (h, m, period) => {
    let hh = parseInt(h);
    if (period === 'PM' && hh < 12) hh += 12;
    if (period === 'AM' && hh === 12) hh = 0;
    return `${hh.toString().padStart(2, '0')}:${m}`;
  };

  const checkAvailability = useCallback(async (data, resId) => {
    const targetId = resId || selectedResourceId;
    const startTime24 = to24h(data.startHour, data.startMinute, data.startPeriod);
    const endTime24 = to24h(data.endHour, data.endMinute, data.endPeriod);

    if (!data.date || !startTime24 || !endTime24 || !targetId) return;
    
    setIsChecking(true);
    try {
      const startDateTime = new Date(`${data.date}T${startTime24}`);
      const endDateTime = new Date(`${data.date}T${endTime24}`);
      
      if (endDateTime <= startDateTime) {
        setAvailability({ available: false, error: 'End time must be after start time' });
        return;
      }

      const response = await api.get('/bookings/check-availability', {
        params: {
          resource_id: targetId,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString()
        }
      });
      setAvailability(response.data);
    } catch {
      console.error('Availability check failed');
    } finally {
      setIsChecking(false);
    }
  }, [selectedResourceId]);

  useEffect(() => {
    if (!resource) {
      const fetchAll = async () => {
        setIsFetchingResources(true);
        try {
          const res = await api.get('/resources?limit=100');
          setAllResources(res.data.resources);
          if (res.data.resources.length > 0 && !selectedResourceId) {
            setSelectedResourceId(res.data.resources[0].id);
          }
        } catch (e) { console.error(e); }
        setIsFetchingResources(false);
      };
      fetchAll();
    }
  }, [resource]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability(formData, selectedResourceId);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData, selectedResourceId, checkAvailability]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setErrors({});
    setSuggestions([]);

    const validation = bookingSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach(err => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    const startTime24 = to24h(formData.startHour, formData.startMinute, formData.startPeriod);
    const endTime24 = to24h(formData.endHour, formData.endMinute, formData.endPeriod);

    const startDateTime = new Date(`${formData.date}T${startTime24}`);
    const endDateTime = new Date(`${formData.date}T${endTime24}`);

    if (endDateTime <= startDateTime) {
      setErrors({ endTime: 'End time must be after start time' });
      setIsLoading(false);
      return;
    }

    const targetId = resource?.id || selectedResourceId;
    if (!targetId) {
      toast.error('Please select a resource');
      setIsLoading(false);
      return;
    }

    const bookingData = {
      resource_id: targetId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      meeting_title: formData.meeting_title,
      description: formData.description,
      participants: formData.participants.split(',').map(p => p.trim()).filter(p => p)
    };

    try {
      await api.post('/bookings', bookingData);
      toast.success('Booking confirmed!');
      onSuccess();
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.error);
        setSuggestions(err.response.data.suggestions || []);
        toast.error('Schedule conflict detected');
      } else {
        // Global interceptor will handle non-409 errors with toasts,
        // but we can add a local one if we want specific phrasing
        toast.error(err.response?.data?.message || 'Failed to create booking');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {resource ? `Book ${resource.name}` : 'New Booking'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!resource && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Resource</label>
              <div className="relative">
                {isFetchingResources ? (
                   <div className="flex items-center gap-2 text-xs text-brand-lavender p-3 bg-gray-50 rounded-xl">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading resources...
                   </div>
                ) : (
                  <select 
                    className="input-field appearance-none cursor-pointer"
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                  >
                    <option value="" disabled>Choose a room or asset...</option>
                    {allResources.map(res => (
                      <option key={res.id} value={res.id}>{res.name} ({res.location})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">{error}</p>
                {suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="font-medium text-red-600">Alternative suggestions:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const d = new Date(s.start_time);
                            setFormData({
                              ...formData,
                              date: d.toISOString().split('T')[0],
                              startTime: d.toTimeString().split(' ')[0].substring(0, 5)
                            });
                            setError(null);
                            setSuggestions([]);
                          }}
                          className="text-left text-xs bg-white border border-red-200 p-2 rounded-lg hover:border-red-400 transition-colors"
                        >
                          <span className="font-bold">{s.resource_name || 'This resource'}:</span> {new Date(s.start_time).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Title</label>
            <input 
              required
              type="text" 
              className={`input-field ${errors.meeting_title ? 'border-red-500' : ''}`}
              placeholder="e.g. Quarterly Sync"
              value={formData.meeting_title}
              onChange={(e) => setFormData({...formData, meeting_title: e.target.value})}
            />
            {errors.meeting_title && <p className="text-xs text-red-500 mt-1">{errors.meeting_title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date
            </label>
            <input 
              required
              type="date" 
              min={new Date().toISOString().split('T')[0]}
              className={`input-field ${errors.date ? 'border-red-500' : ''}`}
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Start Time
              </label>
              <div className="flex items-center gap-2">
                <select 
                  className="flex-grow bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-brand-blue/20 outline-none"
                  value={formData.startHour}
                  onChange={(e) => setFormData({ ...formData, startHour: e.target.value })}
                >
                  {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="font-bold text-gray-300">:</span>
                <select 
                  className="flex-grow bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-brand-blue/20 outline-none"
                  value={formData.startMinute}
                  onChange={(e) => setFormData({ ...formData, startMinute: e.target.value })}
                >
                  {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-0.5">
                  {['AM', 'PM'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, startPeriod: p })}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                        formData.startPeriod === p ? 'bg-brand-blue text-white shadow-sm' : 'text-brand-lavender hover:text-[#1B2559]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> End Time
              </label>
              <div className="flex items-center gap-2">
                <select 
                  className="flex-grow bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-brand-blue/20 outline-none"
                  value={formData.endHour}
                  onChange={(e) => setFormData({ ...formData, endHour: e.target.value })}
                >
                  {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="font-bold text-gray-300">:</span>
                <select 
                  className="flex-grow bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-brand-blue/20 outline-none"
                  value={formData.endMinute}
                  onChange={(e) => setFormData({ ...formData, endMinute: e.target.value })}
                >
                  {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-0.5">
                  {['AM', 'PM'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, endPeriod: p })}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                        formData.endPeriod === p ? 'bg-brand-blue text-white shadow-sm' : 'text-brand-lavender hover:text-[#1B2559]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Repeat className="w-3 h-3 text-brand-blue" /> Recurrence
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'].map((rule) => (
                <button
                  key={rule}
                  type="button"
                  onClick={() => setFormData({ ...formData, recurrence_rule: rule })}
                  className={`py-2 px-1 text-[10px] font-bold rounded-xl border transition-all ${
                    formData.recurrence_rule === rule
                      ? 'bg-brand-blue text-white border-brand-blue'
                      : 'bg-white dark:bg-zinc-900 text-brand-lavender border-gray-100 dark:border-white/5 hover:border-brand-blue/30'
                  }`}
                >
                  {rule === 'NONE' ? 'One-time' : rule}
                </button>
              ))}
            </div>
            {formData.recurrence_rule !== 'NONE' && (
              <p className="text-[10px] text-brand-lavender italic">
                * This will create a series of bookings.
              </p>
            )}
          </div>

          {!availability.available && (
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center gap-3 text-amber-700 text-xs">
              <Info className="w-4 h-4 shrink-0" />
              <p>This slot is currently occupied. Please choose another time.</p>
            </div>
          )}

          {isChecking && (
            <div className="flex items-center gap-2 text-[10px] text-brand-lavender italic">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Participants (comma separated emails)</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="alice@company.com, bob@company.com"
              value={formData.participants}
              onChange={(e) => setFormData({...formData, participants: e.target.value})}
            />
            <p className="text-[10px] text-brand-lavender mt-1">Separate multiple emails with commas.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="btn btn-secondary flex-grow"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading || isChecking || !availability.available}
              className="btn btn-primary flex-grow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;
