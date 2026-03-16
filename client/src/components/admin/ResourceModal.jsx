import React, { useState } from 'react';
import { X, Save, Box, MapPin, Users, Info } from 'lucide-react';

const ResourceModal = ({ resource, onClose, onSave }) => {
  const [formData, setFormData] = useState(resource || {
    name: '',
    type: 'meeting_room',
    location: '',
    capacity: 4,
    description: '',
    status: 'available'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-primary p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Box className="w-6 h-6" />
            {resource ? 'Edit Resource' : 'Add New Resource'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Name</label>
              <input 
                required
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Conference Room A"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Type</label>
              <select 
                className="input-field"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="meeting_room">Meeting Room</option>
                <option value="equipment">Equipment</option>
                <option value="parking">Parking Space</option>
                <option value="desk">Work Desk</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                Location
              </label>
              <input 
                required
                type="text"
                className="input-field"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. 2nd Floor"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                Capacity
              </label>
              <input 
                required
                type="number"
                min="1"
                className="input-field"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              Description
            </label>
            <textarea 
              rows="3"
              className="input-field py-3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide some details about this resource..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Save className="w-5 h-5" />
              Save Resource
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResourceModal;
