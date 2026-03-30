import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../lib/api';
import { CheckCircle, XCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token found. Please use the link sent to your email.');
        return;
      }


      try {
        const response = await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.data.message || 'Your email has been verified successfully!');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed or link expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE] p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] p-12 shadow-2xl shadow-brand-blue/10 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-brand-blue"></div>

        <AnimatePresence mode="wait">
          {status === 'verifying' && (
            <motion.div 
              key="verifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-brand-blue/10 rounded-full"></div>
                <Loader2 className="w-20 h-20 text-brand-blue animate-spin absolute top-0 left-0" />
              </div>
              <h2 className="text-3xl font-extrabold text-[#1B2559] tracking-tight">Verifying your email...</h2>
              <p className="text-brand-lavender font-medium">We're checking your credentials. Just a moment.</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-extrabold text-[#1B2559] tracking-tight">Email Verified!</h2>
              <p className="text-brand-lavender font-medium leading-relaxed">{message}</p>
              <Link to="/login" className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold shadow-lg hover:scale-[1.02] transition-transform">
                Go to Sign In <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-20 h-20 bg-danger/10 text-danger rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-extrabold text-[#1B2559] tracking-tight">Verification Failed</h2>
              <p className="text-brand-lavender font-medium leading-relaxed">{message}</p>
              <div className="flex flex-col w-full gap-3 mt-4">
                <Link to="/register" className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold shadow-lg">
                  <RefreshCw className="w-4 h-4" /> Request New Link
                </Link>
                <Link to="/login" className="text-[#1B2559] font-bold text-sm hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
