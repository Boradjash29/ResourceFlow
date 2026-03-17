import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import ResourceCard from '../components/resource/ResourceCard';
import { Search, Filter, Loader2, Sparkles, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Resources = ({ onBook }) => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Find what you need';
    if (hour < 17) return 'Ready to work';
    return 'Wrapping up';
  };
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { type } = filters;
      let url = '/resources';
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (debouncedSearch) params.append('search', debouncedSearch);
      
      const response = await api.get(`${url}?${params.toString()}`);
      setResources(response.data.resources);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResources();
  }, [filters.type, debouncedSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchResources();
  };

  const handleBook = (resource) => {
    if (onBook) onBook(resource);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="px-2">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-brand-blue" />
          <span className="text-xs font-bold text-brand-lavender uppercase tracking-[0.15em] opacity-80 decoration-brand-blue/30 underline underline-offset-4">
            {getGreeting()}, {user?.name?.split(' ')[0]}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[#1B2559] dark:text-white mb-1">Available Resources</h1>
        <p className="text-sm text-brand-lavender font-medium">Find and book the tools you need to succeed.</p>
      </header>

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row gap-4 px-2">
        <div className="flex-grow flex items-center bg-white dark:bg-zinc-900 rounded-3xl p-1.5 shadow-soft dark:shadow-none border border-white dark:border-white/5">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-lavender w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name, type, or location..." 
              className="w-full bg-transparent border-none outline-none py-3 pl-12 pr-4 text-sm font-medium text-[#1B2559] dark:text-white placeholder:text-brand-lavender/50"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <button className="btn-primary px-8 py-3 rounded-2xl text-sm font-bold">
            Search
          </button>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-3xl px-6 py-4 shadow-soft dark:shadow-none border border-white dark:border-white/5 min-w-[200px]">
          <Filter className="text-brand-blue w-5 h-5" />
          <select 
            className="bg-transparent border-none outline-none text-sm font-bold text-[#1B2559] dark:text-white w-full cursor-pointer appearance-none"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="" className="dark:bg-zinc-900">All Categories</option>
            <option value="meeting_room" className="dark:bg-zinc-900">Meeting Rooms</option>
            <option value="conference_hall" className="dark:bg-zinc-900">Conference Halls</option>
            <option value="projector" className="dark:bg-zinc-900">Projectors</option>
            <option value="laptop" className="dark:bg-zinc-900">Laptops</option>
            <option value="other" className="dark:bg-zinc-900">Other Assets</option>
          </select>
        </div>
      </div>

      <div className="w-full px-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 animate-spin text-brand-blue mb-4 opacity-20" />
            <p className="text-brand-lavender font-bold">Syncing resources...</p>
          </div>
        ) : resources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {resources.map(resource => (
              <ResourceCard 
                key={resource.id} 
                resource={resource} 
                onBook={handleBook}
              />
            ))}
          </div>
        ) : (
          <div className="card text-center py-32 border-dashed border-2 border-brand-lavender/20 bg-transparent flex flex-col items-center justify-center">
            <Package className="w-16 h-16 text-brand-lavender/20 mb-4" />
            <p className="text-brand-lavender font-bold text-lg">No assets found</p>
            <p className="text-brand-lavender/60 text-sm">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Resources;
