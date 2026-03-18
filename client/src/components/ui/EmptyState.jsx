import React from 'react';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = "" 
}) => {
  return (
    <div className={`card text-center py-20 px-6 border-dashed border-2 border-brand-lavender/20 bg-transparent flex flex-col items-center justify-center ${className}`}>
      {Icon && <Icon className="w-16 h-16 text-brand-lavender/20 mb-4" />}
      <h3 className="text-brand-lavender font-bold text-xl mb-2">{title}</h3>
      <p className="text-brand-lavender/60 text-sm max-w-xs mb-8">{description}</p>
      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="btn-primary px-8 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-brand-blue/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
