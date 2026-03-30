import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Package, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      toast.success(location.state.message);
      // Clear location state to prevent toast on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Client-side validation
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach(err => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else if (result.requires2FA) {
        navigate('/login/2fa', { state: { tempToken: result.tempToken } });
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans antialiased">
      {/* Left Side: Visual/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0C1227] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-blue/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 w-full max-w-md">
          <motion.div 
            initial={{ opacity: 0, y: 40, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 shadow-2xl relative left-[-20px] top-0"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white shadow-lg">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-brand-lavender uppercase font-bold tracking-widest">Total Assets</p>
                <p className="text-xl font-bold text-white">1,284 Verified</p>
              </div>
            </div>
            <div className="flex gap-1 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="w-2/3 bg-brand-blue rounded-full"></div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[40px] p-8 shadow-2xl relative z-20 border border-white/20"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 bg-brand-bg rounded-2xl flex items-center justify-center text-brand-blue">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="px-3 py-1 bg-green-50 text-success rounded-full text-[10px] font-extrabold uppercase tracking-tighter">
                Live Status
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-[#1B2559] mb-2 leading-tight">Effortless Resource Management</h2>
            <p className="text-brand-lavender text-sm font-medium mb-6">Seamlessly book and manage office assets in real-time with full visibility.</p>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-[420px] w-full"
        >
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-sm font-extrabold text-brand-blue uppercase tracking-[0.2em] mb-4">ResourceFlow</h1>
            <h2 className="text-4xl font-extrabold text-[#1B2559] tracking-tight mb-3">Sign In</h2>
            <p className="text-brand-lavender font-medium">Enter your email and password to sign in!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#1B2559] ml-1">Email <span className="text-brand-blue">*</span></label>
              <input 
                type="email" 
                required 
                className={`input-field py-4 ${errors.email ? 'border-red-500 bg-red-50/30' : ''}`}
                placeholder="mail@website.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && <p className="text-xs font-bold text-red-500 mt-1 ml-1">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#1B2559] ml-1">Password <span className="text-brand-blue">*</span></label>
              <input 
                type="password" 
                required 
                className={`input-field py-4 ${errors.password ? 'border-red-500 bg-red-50/30' : ''}`}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && <p className="text-xs font-bold text-red-500 mt-1 ml-1">{errors.password}</p>}
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs font-bold text-brand-blue hover:underline">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold mt-8 hover:transform hover:-translate-y-0.5 transition-all shadow-lg active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-brand-lavender">
            Not registered yet?{' '}
            <Link to="/register" className="text-brand-blue hover:underline font-bold">
              Create an Account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
