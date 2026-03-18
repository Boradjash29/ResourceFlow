import React, { useState } from 'react';
import api from '../../lib/api';
import { Shield, Smartphone, ArrowRight, Loader2, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TwoFactorSetup = ({ onComplete }) => {
  const [step, setStep] = useState('intro'); // intro, qr, verify, success
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const initiateSetup = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/2fa/setup');
      setSetupData(response.data);
      setStep('qr');
    } catch {
      setError('Failed to initiate 2FA setup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/2fa/verify-setup', { code });
      setStep('success');
      setTimeout(() => onComplete?.(), 2000);
    } catch {
      setError('Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center py-6"
          >
            <div className="w-16 h-16 bg-brand-blue/10 text-brand-blue rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#1B2559] mb-2">Secure Your Account</h3>
            <p className="text-brand-lavender text-sm font-medium mb-8 px-4">
              Two-factor authentication adds an extra layer of security. You'll need a code from an authenticator app to sign in.
            </p>
            <button 
              onClick={initiateSetup}
              disabled={isLoading}
              className="btn-primary w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Get Started'}
            </button>
          </motion.div>
        )}

        {step === 'qr' && (
          <motion.div 
            key="qr"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <h3 className="text-lg font-bold text-[#1B2559] mb-4">Scan QR Code</h3>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 inline-block mb-6 shadow-sm">
              <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
            </div>
            <div className="bg-brand-bg p-4 rounded-2xl mb-8 text-left">
              <p className="text-xs font-bold text-brand-lavender uppercase tracking-widest mb-1">Manual Entry Key</p>
              <code className="text-sm font-bold text-brand-blue">{setupData.secret}</code>
            </div>
            <button 
              onClick={() => setStep('verify')}
              className="btn-primary w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold"
            >
              I've Scanned It <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div 
            key="verify"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h3 className="text-lg font-bold text-[#1B2559] mb-2 text-center">Verify Setup</h3>
            <p className="text-sm font-medium text-brand-lavender text-center mb-6">Enter the 6-digit code from your app.</p>
            <form onSubmit={handleVerify} className="space-y-6">
              {error && <div className="p-3 bg-red-50 text-danger text-xs font-bold rounded-xl border border-red-100">{error}</div>}
              <input 
                autoFocus
                type="text"
                placeholder="000000"
                className="input-field text-center text-2xl tracking-[0.5em] font-bold py-4"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button 
                type="submit"
                disabled={isLoading || code.length < 6}
                className="btn-primary w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Enable'}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-[#1B2559] mb-2">2FA Enabled!</h3>
            <p className="text-brand-lavender font-medium">Your account is now more secure.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TwoFactorSetup;
