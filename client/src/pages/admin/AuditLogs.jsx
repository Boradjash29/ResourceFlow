import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { History, Search, Filter, Shield, User, Globe, Activity, Loader2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');

  // Debounce filter changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilter(filter);
    }, 500);
    return () => clearTimeout(handler);
  }, [filter]);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/audit-logs?page=${page}&action=${debouncedFilter}`);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [debouncedFilter]);

  const getActionColor = (action) => {
    if (action.includes('FAILURE') || action.includes('LOCKOUT')) return 'bg-danger/10 text-danger border-danger/20';
    if (action.includes('SUCCESS')) return 'bg-success/10 text-success border-success/20';
    if (action.includes('ENABLE') || action.includes('DISABLE')) return 'bg-brand-blue/10 text-brand-blue border-brand-blue/20';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-[#1B2559] tracking-tight mb-2 flex items-center gap-3">
              <History className="w-10 h-10 text-brand-blue" /> Audit Logs
            </h1>
            <p className="text-brand-lavender font-medium">Security event monitoring and system accountability.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-lavender" />
              <input 
                type="text"
                placeholder="Filter by action..."
                className="pl-11 pr-4 py-3 rounded-2xl border border-gray-100 bg-white shadow-sm text-sm font-bold text-[#1B2559] focus:ring-2 focus:ring-brand-blue/20 outline-none w-64"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-xs font-extrabold text-brand-lavender uppercase tracking-widest">Event</th>
                  <th className="px-8 py-5 text-xs font-extrabold text-brand-lavender uppercase tracking-widest">User</th>
                  <th className="px-8 py-5 text-xs font-extrabold text-brand-lavender uppercase tracking-widest">Context</th>
                  <th className="px-8 py-5 text-xs font-extrabold text-brand-lavender uppercase tracking-widest">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-blue" />
                        <span className="text-sm font-bold text-brand-lavender">Loading security events...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center text-brand-lavender font-bold">No events found.</td>
                  </tr>
                ) : logs.map((log) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    key={log.id} 
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${getActionColor(log.action)}`}>
                          {log.action}
                        </div>
                        <span className="text-sm font-bold text-[#1B2559]">{log.entity_type}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1B2559]">{log.user?.name || 'System'}</p>
                          <p className="text-xs font-medium text-brand-lavender">{log.user?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-lavender">
                          <Globe className="w-3.5 h-3.5" /> {log.ip_address}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-brand-lavender/60 max-w-[200px] truncate">
                          <Activity className="w-3 h-3" /> {log.user_agent}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#1B2559]">{new Date(log.created_at).toLocaleDateString()}</span>
                        <span className="text-xs font-medium text-brand-lavender">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-brand-lavender uppercase tracking-widest">
              Showing page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button 
                disabled={pagination.page === 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-[#1B2559] hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <button 
                disabled={pagination.page === pagination.pages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-[#1B2559] hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
