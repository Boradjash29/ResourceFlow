import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Settings, 
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import ResourceModal from '../../components/admin/ResourceModal';

const AdminResources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clear notifications after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchResources = async () => {
    try {
      const response = await api.get('/resources');
      // The API returns { resources: [], pagination: {} }
      setResources(response.data.resources || []);
    } catch {
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
      await fetchResources();
      setSuccess(`Resource ${editingResource ? 'updated' : 'created'} successfully`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving resource');
    }
  };

  const handleDelete = async (id, force = false) => {
    setIsDeleting(true);
    try {
      await api.delete(`/resources/${id}${force ? '?force=true' : ''}`);
      setDeleteConfirmId(null);
      await fetchResources();
      setSuccess('Resource deleted successfully');
    } catch (err) {
      if (err.response?.status === 409 && !force) {
        // We will show a "Force" option in the UI instead of recursive call
        setError('This resource has future bookings. Please use Force Delete.');
      } else {
        setError(err.response?.data?.message || 'Error deleting resource');
      }
    } finally {
      setIsDeleting(false);
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

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-bold">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 rounded-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-bold">{success}</span>
          </motion.div>
        )}

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
                      <div className="flex justify-end gap-3 transition-all relative">
                        {deleteConfirmId === res.id ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                            <span className="text-[10px] font-bold text-red-600 uppercase mr-1">Confirm?</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                              className="px-2 py-1 text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(res.id, false); }}
                              disabled={isDeleting}
                              className="px-2 py-1 text-[10px] font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 shadow-sm"
                            >
                              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete' }
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(res.id, true); }}
                              disabled={isDeleting}
                              title="Force delete (cancels future bookings)"
                              className="px-2 py-1 text-[10px] font-bold bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                            >
                              Force
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingResource(res);
                                setModalOpen(true);
                              }}
                              title="Edit Resource"
                              className="p-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-xl text-blue-600 transition-all border border-blue-100/50 dark:border-blue-500/20 shadow-sm"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(res.id); }}
                              title="Delete Resource"
                              className="p-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-xl text-red-600 transition-all border border-red-100/50 dark:border-red-500/20 shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
