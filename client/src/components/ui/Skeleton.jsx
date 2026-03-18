import React from 'react';

const Skeleton = ({ className, variant = 'rect', ...props }) => {
  const variants = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded-md h-4 w-full',
  };

  return (
    <div 
      className={`animate-pulse bg-zinc-200 dark:bg-zinc-800/50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

export default Skeleton;
