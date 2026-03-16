import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Loader2, Package, Calendar, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-white font-sans antialiased">
      {/* Left Side: Visual/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0C1227] relative overflow-hidden items-center justify-center p-12">
        {/* Abstract Background elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-blue/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 w-full max-w-md">
          {/* Floating Card Mock 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 40, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.8, delay: 0.2 }}
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

          {/* Floating Card Mock 2 (Primary focus) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
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
            
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-brand-bg/60 rounded-3xl border border-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-brand-blue border border-gray-100">JD</div>
                    <span className="text-xs font-bold text-[#1B2559]">John's Meeting Room {i}</span>
                  </div>
                  <Users className="w-4 h-4 text-brand-lavender" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom small float */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-6 flex gap-4"
          >
             <div className="bg-white/10 backdrop-blur-md px-5 py-4 rounded-3xl border border-white/10 flex items-center gap-3">
                <TrendingUp className="text-success w-5 h-5" />
                <span className="text-white text-xs font-bold font-sans">98% Utilization Rate</span>
             </div>
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
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 text-danger p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-danger"></div>
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#1B2559] ml-1">Email<span className="text-brand-blue ml-0.5">*</span></label>
              <input 
                type="email" 
                required 
                className="input-field py-4"
                placeholder="mail@website.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#1B2559] ml-1">Password<span className="text-brand-blue ml-0.5">*</span></label>
              <input 
                type="password" 
                required 
                className="input-field py-4"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold mt-8 hover:transform hover:-translate-y-0.5 transition-all shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                </>
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
