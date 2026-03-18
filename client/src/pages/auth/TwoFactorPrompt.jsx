import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Loader2, Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const TwoFactorPrompt = () => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { validate2FA } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const tempToken = location.state?.tempToken;

  useEffect(() => {
    if (!tempToken) {
      navigate('/login');
    }
  }, [tempToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await validate2FA(code, tempToken);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
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
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-brand-lavender hover:text-brand-blue mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold tracking-tight">Back to Login</span>
        </button>

        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-brand-blue/10 text-brand-blue rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-4xl font-extrabold text-[#1B2559] tracking-tight mb-3">Two-Step Verification</h2>
          <p className="text-brand-lavender font-medium">Enter the 6-digit code from your authenticator app to verify your identity.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-4 bg-red-50 text-danger text-xs font-bold rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-1">{error}</div>}
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#1B2559] ml-1 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-brand-blue/60" /> Authentication Code
            </label>
            <input 
              autoFocus
              type="text" 
              required 
              className="input-field py-5 text-center text-3xl tracking-[0.6em] font-bold"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || code.length < 6}
            className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold mt-4 shadow-xl"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-medium text-brand-lavender space-y-1">
          <p>Lost your device?</p>
          <a href="mailto:support@resourceflow.com" className="text-brand-blue font-bold hover:underline">Contact Administrator</a>
        </p>
      </motion.div>
    </div>
  );
};

export default TwoFactorPrompt;
