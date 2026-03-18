import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const ServerError = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-8 bg-white p-12 rounded-[40px] shadow-xl border border-gray-100"
      >
        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle size={48} className="text-orange-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-[#1B2559] tracking-tight">System Hiccup</h1>
          <p className="text-brand-lavender font-medium leading-relaxed">
            Something went wrong on our end. We've been notified and are looking into it.
          </p>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold shadow-lg shadow-brand-blue/20 bg-orange-500 hover:bg-orange-600 border-none"
        >
          <RefreshCw size={20} /> Try Refreshing
        </button>
      </motion.div>
    </div>
  );
};

export default ServerError;
