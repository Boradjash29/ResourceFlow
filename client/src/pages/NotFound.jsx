import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8 bg-white p-12 rounded-[40px] shadow-xl border border-gray-100"
      >
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-brand-blue/5 rounded-full flex items-center justify-center mx-auto">
            <Compass size={48} className="text-brand-blue animate-pulse" />
          </div>
          <div className="absolute -top-2 -right-2 bg-danger text-white text-xs font-bold px-2 py-1 rounded-lg">404</div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-[#1B2559] tracking-tight">Lost in Transit?</h1>
          <p className="text-brand-lavender font-medium leading-relaxed">
            The resource you're looking for doesn't exist or has been moved to a different workspace.
          </p>
        </div>

        <Link 
          to="/dashboard" 
          className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Home size={20} /> Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
