import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import ResourceCard from '../components/resource/ResourceCard';
import { Search, Filter, Loader2 } from 'lucide-react';

const Resources = ({ onBook }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
  });

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { type, search } = filters;
      let url = '/resources';
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (search) params.append('search', search);
      
      const response = await api.get(`${url}?${params.toString()}`);
      setResources(response.data.resources);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResources();
  }, [filters.type]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchResources();
  };

  const handleBook = (resource) => {
    if (onBook) onBook(resource);
  };

  return (
    <div className="px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Resources</h1>
          <p className="text-gray-600">Find and book meeting rooms, projectors, and more.</p>
        </header>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-grow flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search resources by name or location..." 
                className="input-field pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary px-6">Search</button>
          </form>

          <div className="flex items-center gap-3">
            <Filter className="text-gray-500 w-5 h-5" />
            <select 
              className="input-field"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="meeting_room">Meeting Rooms</option>
              <option value="conference_hall">Conference Halls</option>
              <option value="projector">Projectors</option>
              <option value="laptop">Laptops</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Loading resources...</p>
          </div>
        ) : resources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {resources.map(resource => (
              <ResourceCard 
                key={resource.id} 
                resource={resource} 
                onBook={handleBook}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No resources found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Resources;
