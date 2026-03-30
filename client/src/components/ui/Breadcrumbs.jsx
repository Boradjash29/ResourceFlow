import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x && x !== 'dashboard');

  if (pathnames.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-brand-lavender">
        <Home className="w-4 h-4" />
        <span>Dashboard</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-2 text-sm font-medium" aria-label="Breadcrumb">
      <Link 
        to="/dashboard" 
        className="flex items-center gap-2 text-brand-lavender hover:text-brand-blue transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/dashboard/${pathnames.slice(0, index + 1).join('/')}`;
        
        const formatTitle = (val) => {
          // Check if the path segment is a UUID
          const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
          if (uuidRegex.test(val)) return 'Details';
          return val.replace(/-/g, ' ');
        };

        const title = formatTitle(value);

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-4 h-4 text-brand-lavender/40" aria-hidden="true" />
            {last ? (
              <span className="text-brand-blue dark:text-white capitalize font-bold">
                {title}
              </span>
            ) : (
              <Link 
                to={to} 
                className="text-brand-lavender hover:text-brand-blue transition-colors capitalize"
              >
                {title}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
