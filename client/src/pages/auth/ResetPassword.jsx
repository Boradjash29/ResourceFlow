import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { Lock, Loader2, CheckCircle, ArrowRight, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const getPasswordStrength = (pwd) => {
    if (pwd.length === 0) return { score: 0, text: '', color: 'bg-gray-200' };
    if (pwd.length < 6) return { score: 1, text: 'Weak', color: 'bg-red-400' };
    if (pwd.length < 10) return { score: 2, text: 'Medium', color: 'bg-yellow-400' };
    return { score: 3, text: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', { token, password });
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Link may be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE] p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] p-12 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-brand-blue"></div>

        <div className="mb-10 text-center lg:text-left">
          <div className="w-16 h-16 bg-brand-blue/10 text-brand-blue rounded-3xl flex items-center justify-center mx-auto lg:mx-0 mb-6 transition-transform hover:rotate-12">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-4xl font-extrabold text-[#1B2559] tracking-tight mb-3">Reset Password</h2>
          <p className="text-brand-lavender font-medium">Create a new secure password for your account.</p>
        </div>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 border border-success/20 p-8 rounded-[32px] text-center"
            >
              <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1B2559] mb-2">Password Reset!</h3>
              <p className="text-brand-lavender text-sm font-medium mb-6">
                Successfully updated. Redirecting you to sign in...
              </p>
              <div className="w-full bg-success/10 h-1 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3 }}
                  className="h-full bg-success"
                />
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-danger p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1B2559] ml-1">New Password</label>
                <input 
                  type="password" 
                  required 
                  className="input-field py-4"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                
                {/* Password Strength Indicator */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-1 h-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-gray-100'}`}></div>
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${strength.color.replace('bg-', 'text-')}`}>
                    {strength.text}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1B2559] ml-1">Confirm Password</label>
                <input 
                  type="password" 
                  required 
                  className="input-field py-4"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              
              <p className="text-center text-xs font-medium text-brand-lavender">
                Remembered your password? <Link to="/login" className="text-brand-blue font-bold hover:underline">Sign In</Link>
              </p>
            </form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
