import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Loader2, ShieldCheck, Globe, Zap, Mail, User, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsLoading(true);
    const result = await register(formData.name, formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-white font-sans antialiased">
      {/* Left Side: Visual/Branding (Consistent with Login) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0C1227] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-blue/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 w-full max-w-md">
          {/* Visual Identity for Registration */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="bg-white rounded-[40px] p-10 shadow-3xl border border-white/20"
          >
            <div className="flex gap-4 mb-8">
                <div className="w-14 h-14 bg-brand-blue/5 rounded-3xl flex items-center justify-center text-brand-blue border border-brand-blue/10">
                    <UserPlus className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-3xl font-extrabold text-[#1B2559] tracking-tight">Join the Flow</h2>
                    <p className="text-brand-lavender font-bold uppercase text-[10px] tracking-widest mt-1">ResourceFlow v2.0</p>
                </div>
            </div>

            <div className="space-y-6">
                {[
                  { icon: ShieldCheck, title: "Enterprise Grade Security", desc: "Your data is protected with 256-bit encryption." },
                  { icon: Globe, title: "Collaborative Ecosystem", desc: "Share assets across all departments seamlessly." },
                  { icon: Zap, title: "Instant Booking", desc: "No more waiting. Book with a single click." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-brand-bg flex items-center justify-center text-brand-blue shrink-0">
                        <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#1B2559]">{item.title}</p>
                        <p className="text-xs font-medium text-brand-lavender">{item.desc}</p>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>

          {/* Abstract small cards */}
          <div className="absolute bottom-[-40px] right-[-40px] w-48 h-48 bg-brand-blue/5 rounded-full blur-2xl -z-10"></div>
        </div>
      </div>

      {/* Right Side: Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-[420px] w-full py-12"
        >
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-sm font-extrabold text-brand-blue uppercase tracking-[0.2em] mb-4">Create Account</h1>
            <h2 className="text-4xl font-extrabold text-[#1B2559] tracking-tight mb-3">Welcome to Flow</h2>
            <p className="text-brand-lavender font-medium">Join us and start managing your workspace efficiently.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-danger p-4 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#1B2559] ml-1 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-brand-blue/60" /> Full Name
              </label>
              <input 
                name="name"
                type="text" 
                required 
                className="input-field py-4"
                placeholder="John Davis"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#1B2559] ml-1 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-brand-blue/60" /> Email Address
              </label>
              <input 
                name="email"
                type="email" 
                required 
                className="input-field py-4"
                placeholder="john@company.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1B2559] ml-1 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-brand-blue/60" /> Password
                </label>
                <input 
                  name="password"
                  type="password" 
                  required 
                  className="input-field py-4"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1B2559] ml-1 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-brand-blue/60" /> Confirm
                </label>
                <input 
                  name="confirmPassword"
                  type="password" 
                  required 
                  className="input-field py-4"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold mt-8 hover:transform hover:-translate-y-0.5 transition-all shadow-xl"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Create My Account'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-brand-lavender">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-blue hover:underline font-bold">
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
