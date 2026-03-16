import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Shield, Clock, User, Activity, Loader2, Database } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('/admin/audit-logs');
        setLogs(response.data);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

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
        <header className="mb-8 flex items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-2xl">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-display">System Audit Logs</h1>
            <p className="text-gray-500">Track all administrative and security actions across the system.</p>
          </div>
        </header>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        log.action_type === 'CREATE' ? 'bg-green-100 text-green-700' :
                        log.action_type === 'DELETE' ? 'bg-red-100 text-red-700' :
                        log.action_type === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-700">{log.user_name || 'System'}</span>
                        <span className="text-xs text-gray-400">{log.user_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.details.action || 'Unknown Action'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <Database className="w-3 h-3" />
                        Table: {log.table_name}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
