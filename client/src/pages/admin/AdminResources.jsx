import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Settings, 
  Search, 
  Filter, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import ResourceModal from '../../components/admin/ResourceModal';

const AdminResources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [error, setError] = useState(null);

  const fetchResources = async () => {
    try {
      const response = await api.get('/resources');
      // The API returns { resources: [], pagination: {} }
      setResources(response.data.resources || []);
    } catch (err) {
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleSave = async (formData) => {
    try {
      if (editingResource) {
        await api.put(`/resources/${editingResource.id}`, formData);
      } else {
        await api.post('/resources', formData);
      }
      setModalOpen(false);
      setEditingResource(null);
      fetchResources();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving resource');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await api.delete(`/resources/${id}`);
      fetchResources();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting resource');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 font-display">Manage Resources</h1>
            <p className="text-gray-500">Add, update, or remove rooms and office equipment.</p>
          </div>
          <button 
            onClick={() => {
              setEditingResource(null);
              setModalOpen(true);
            }}
            className="btn btn-primary px-6 py-3 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Resource
          </button>
        </header>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resources.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Settings className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-bold text-gray-700">{res.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {res.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {res.location}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {res.capacity} persons
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        res.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingResource(res);
                            setModalOpen(true);
                          }}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(res.id)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ResourceModal 
          resource={editingResource} 
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default AdminResources;
