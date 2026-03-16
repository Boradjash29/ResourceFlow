import React from 'react';
import { Users, MapPin, Tag, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const ResourceCard = ({ resource, onBook }) => {
  const statusColors = {
    available: 'bg-green-100/50 text-success border-green-200/20',
    unavailable: 'bg-red-100/50 text-danger border-red-200/20'
  };

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <div className="card h-full flex flex-col hover:border-brand-blue/10 transition-colors">
        <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-5 border border-gray-100 dark:border-white/5 bg-brand-bg dark:bg-zinc-950 group">
          {resource.image_url ? (
            <img 
              src={resource.image_url} 
              alt={resource.name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-brand-lavender/40" />
            </div>
          )}
          {/* Premium Status Overlay */}
          <div className="absolute top-3 right-3 z-10">
            <span className={`text-[9px] uppercase tracking-[0.15em] font-bold px-3 py-1.5 rounded-xl backdrop-blur-md border shadow-lg ${
              resource.status === 'available' 
                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              {resource.status}
            </span>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#1B2559] dark:text-white leading-tight">{resource.name}</h3>
        </div>

        <div className="space-y-3 mb-8 flex-grow">
          <div className="flex items-center gap-3 text-sm font-medium text-brand-lavender">
            <div className="w-7 h-7 bg-brand-bg dark:bg-zinc-950 rounded-lg flex items-center justify-center text-brand-blue/60">
              <Tag className="w-4 h-4" />
            </div>
            <span className="capitalize">{resource.type?.replace('_', ' ')}</span>
          </div>
          {resource.capacity > 0 && (
            <div className="flex items-center gap-3 text-sm font-medium text-brand-lavender">
              <div className="w-7 h-7 bg-brand-bg dark:bg-zinc-950 rounded-lg flex items-center justify-center text-brand-blue/60">
                <Users className="w-4 h-4" />
              </div>
              <span>Up to {resource.capacity} seats</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm font-medium text-brand-lavender">
            <div className="w-7 h-7 bg-brand-bg dark:bg-zinc-950 rounded-lg flex items-center justify-center text-brand-blue/60">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="line-clamp-1">{resource.location}</span>
          </div>
        </div>

        <button 
          onClick={() => onBook(resource)}
          disabled={resource.status === 'unavailable'}
          className={`btn w-full justify-center py-3 ${resource.status === 'unavailable' ? 'bg-gray-100 dark:bg-white/5 text-brand-lavender dark:text-brand-lavender/40 cursor-not-allowed border-none' : 'btn-primary'}`}
        >
          {resource.status === 'unavailable' ? 'Out of Service' : 'Reserve Now'}
        </button>
      </div>
    </motion.div>
  );
};

export default ResourceCard;
