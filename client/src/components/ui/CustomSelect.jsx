import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ value, onChange, options, placeholder = 'Select...', icon: Icon, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-3xl px-6 py-4 shadow-soft dark:shadow-none border border-white dark:border-white/5 w-full text-left transition-all hover:border-brand-blue/30 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
      >
        {Icon && <Icon className="text-brand-blue w-5 h-5 shrink-0" />}
        <span className="flex-grow text-sm font-bold text-[#1B2559] dark:text-white truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-brand-lavender transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden py-2"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-5 py-3 text-sm font-bold text-left transition-colors
                  ${value === option.value 
                    ? 'bg-brand-blue/5 text-brand-blue' 
                    : 'text-brand-lavender hover:bg-brand-bg dark:hover:bg-white/5 hover:text-brand-blue dark:text-zinc-400 dark:hover:text-white'
                  }`}
              >
                <span className="capitalize">{option.label}</span>
                {value === option.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
