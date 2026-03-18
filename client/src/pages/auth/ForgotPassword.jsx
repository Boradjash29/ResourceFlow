import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email });
      setIsSent(true);
    } catch (err) {
      // Show the actual error message from the backend if available
      setError(err.response?.data?.message || 'Failed to connect to the server. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Link to="/login" className="flex items-center gap-2 text-brand-lavender hover:text-brand-blue mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold tracking-tight">Back to Login</span>
        </Link>

        <div className="mb-10 text-center lg:text-left">
          <h2 className="text-4xl font-extrabold text-[#1B2559] tracking-tight mb-3">Forgot Password?</h2>
          <p className="text-brand-lavender font-medium">No worries! Enter your email and we'll send you a link to reset it.</p>
        </div>

        <AnimatePresence mode='wait'>
          {isSent ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 border border-success/20 p-8 rounded-[32px] text-center shadow-sm"
            >
              <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1B2559] mb-2">Check your inbox</h3>
              <p className="text-brand-lavender text-sm font-medium mb-6 leading-relaxed">
                If an account exists for <span className="text-[#1B2559] font-bold">{email}</span>, you'll receive a password reset link shortly.
              </p>
              <Link to="/login" className="btn-primary inline-block px-8 py-3 rounded-xl text-sm font-bold shadow-lg">
                Back to Sign In
              </Link>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              onSubmit={handleSubmit} 
              className="space-y-6"
            >
              {error && (
                <div className="bg-red-50 text-danger p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1B2559] ml-1 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-brand-blue/60" /> Email Address
                </label>
                <input 
                  type="email" 
                  required 
                  autoFocus
                  className="input-field py-4"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold mt-4 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <p className="text-center text-xs font-medium text-brand-lavender pt-4">
                Did not receive the email? Check your spam folder or try another email address.
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
