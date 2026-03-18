import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Monitor, Smartphone, Globe, X, Loader2, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SessionsList = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/auth/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id) => {
    setRevokingId(id);
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error revoking session:', error);
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return <Globe className="w-5 h-5" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) return <Smartphone className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  const formatUA = (userAgent) => {
    if (!userAgent) return 'Unknown Device';
    if (userAgent.includes('Windows')) return 'Chrome on Windows';
    if (userAgent.includes('Macintosh')) return 'Safari on Mac';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('Android')) return 'Android Device';
    return userAgent.split(' ').slice(0, 2).join(' ');
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-brand-blue" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#1B2559]">Active Sessions</h3>
          <p className="text-sm font-medium text-brand-lavender">Manage the devices currently logged into your account.</p>
        </div>
        <Shield className="w-5 h-5 text-brand-blue/40" />
      </div>

      <AnimatePresence mode="popLayout">
        {sessions.map((session) => (
          <motion.div
            key={session.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
              session.isCurrent ? 'bg-brand-blue/5 border-brand-blue' : 'bg-gray-50 border-gray-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                session.isCurrent ? 'bg-brand-blue text-white' : 'bg-white text-[#1B2559] border'
              }`}>
                {getDeviceIcon(session.userAgent)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#1B2559]">{formatUA(session.userAgent)}</span>
                  {session.isCurrent && (
                    <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-[10px] font-extrabold uppercase rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-medium text-brand-lavender flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {session.ipAddress || 'Unknown IP'}
                  </span>
                  <span className="text-xs font-medium text-brand-lavender flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {!session.isCurrent && (
              <button
                onClick={() => handleRevoke(session.id)}
                disabled={revokingId === session.id}
                className="p-2 hover:bg-red-50 text-brand-lavender hover:text-danger rounded-lg transition-colors"
                title="Revoke Session"
              >
                {revokingId === session.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default SessionsList;
