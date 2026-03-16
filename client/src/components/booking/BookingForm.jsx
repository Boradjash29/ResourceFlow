import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import api from '../../lib/api';

const BookingForm = ({ resource, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    meeting_title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    duration: '60',
    participants: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuggestions([]);
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
      onSuccess();
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.error);
        setSuggestions(err.response.data.suggestions || []);
      } else {
        setError(err.response?.data?.message || 'Failed to create booking');
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
              className="input-field" 
              placeholder="e.g. Quarterly Sync"
              value={formData.meeting_title}
              onChange={(e) => setFormData({...formData, meeting_title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date
              </label>
              <input 
                required
                type="date" 
                className="input-field"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Start Time
              </label>
              <input 
                required
                type="time" 
                className="input-field"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              />
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Participants (comma separated emails)</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="alice@company.com, bob@company.com"
              value={formData.participants}
              onChange={(e) => setFormData({...formData, participants: e.target.value})}
            />
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
              disabled={isLoading}
              className="btn btn-primary flex-grow flex items-center justify-center gap-2"
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
