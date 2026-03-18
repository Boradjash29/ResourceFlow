import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, AlertCircle, CheckCircle, Loader2, Info, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import api from '../../lib/api';

const bookingSchema = z.object({
  meeting_title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Time is required'),
  duration: z.string().min(1, 'Duration is required'),
  participants: z.string().optional(),
});

const BookingForm = ({ resource, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    meeting_title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    duration: '60',
    participants: '',
    recurrence_rule: 'NONE'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState({ available: true, conflicts: [] });
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [suggestions, setSuggestions] = useState([]);

  const checkAvailability = useCallback(async (data) => {
    if (!data.date || !data.startTime || !data.duration) return;
    
    setIsChecking(true);
    try {
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(data.duration) * 60000);
      
      const response = await api.get('/bookings/check-availability', {
        params: {
          resource_id: resource.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString()
        }
      });
      setAvailability(response.data);
    } catch (err) {
      console.error('Availability check failed');
    } finally {
      setIsChecking(false);
    }
  }, [resource.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability(formData);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.date, formData.startTime, formData.duration, checkAvailability]);

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

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.duration) * 60000);

    const bookingData = {
      resource_id: resource.id,
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
          <h2 className="text-xl font-bold text-gray-900">Book {resource.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Start Time
              </label>
              <input 
                required
                type="time" 
                step="1800"
                className={`input-field ${errors.startTime ? 'border-red-500' : ''}`}
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              />
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <select 
              className="input-field"
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: e.target.value})}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
            </select>
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
