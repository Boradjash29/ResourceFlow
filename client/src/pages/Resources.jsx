import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Search, Filter, Loader2, Sparkles, Package, MapPin, Users, TrendingUp, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import ResourceCard from '../components/resource/ResourceCard';
import CustomSelect from '../components/ui/CustomSelect';
import { ChevronDown } from 'lucide-react';

const Resources = () => {
  const { user } = useAuth();
  const { searchTerm, onBook } = useOutletContext();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({
    type: '',
    location: '',
    capacity_min: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    search: searchTerm,
    limit: 10,
  });
  const [selectedResources, setSelectedResources] = useState([]);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    setFilters(prev => ({ ...prev, search: searchTerm }));
  }, [searchTerm]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Find what you need';
    if (hour < 17) return 'Ready to work';
    return 'Wrapping up';
  };
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await api.get('/resources/types');
        setResourceTypes(response.data.types);
      } catch {
        console.error('Error fetching types');
      }
    };
    fetchTypes();

    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchResources = async (page = 1) => {
    setLoading(true);
    try {
      const { type, location, capacity_min, sort_by, sort_order } = filters;
      const params = new URLSearchParams({
        page,
        limit: filters.limit,
        sort_by,
        sort_order,
        ...(type && { type }),
        ...(location && { location }),
        ...(capacity_min && { capacity_min }),
        ...(debouncedSearch && { search: debouncedSearch })
      });
      
      const response = await api.get(`/resources?${params.toString()}`);
      setResources(response.data.resources);
      setPagination(response.data.pagination);
    } catch {
      console.error('Error fetching resources');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResources(1);
  }, [filters.type, filters.location, filters.capacity_min, filters.sort_by, filters.sort_order, filters.limit, debouncedSearch]);


  const handleBook = (resource) => {
    if (onBook) onBook(resource);
  };

  const toggleSelection = (id) => {
    setSelectedResources(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async () => {
    if (selectedResources.length === 0) return;
    try {
      if (bulkAction === 'delete') {
        await api.delete('/resources/bulk-delete', { data: { ids: selectedResources } });
        setResources(resources.filter(r => !selectedResources.includes(r.id)));
      } else {
        await api.patch('/resources/bulk-status', { ids: selectedResources, status: bulkAction });
        setResources(resources.map(r => selectedResources.includes(r.id) ? { ...r, status: bulkAction } : r));
      }
      setSelectedResources([]);
      setIsBulkConfirmOpen(false);
    } catch {
      console.error('Bulk action failed');
      setIsBulkConfirmOpen(false);
    }
  };

  const exportToCSV = () => {
    if (resources.length === 0) return;
    const headers = ['Name', 'Type', 'Capacity', 'Location', 'Status'];
    const rows = resources.map(r => [
      r.name,
      r.type,
      r.capacity,
      r.location,
      r.status
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `resources_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="flex justify-end gap-3 mt-4">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 text-[#1B2559] dark:text-white rounded-xl border border-gray-100 dark:border-white/5 text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
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
              aria-label="Search resources"
            />
          </div>
          <button className="btn-primary px-8 py-3 rounded-2xl text-sm font-bold" aria-label="Perform search">
            Search
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CustomSelect
            value={filters.type}
            onChange={(val) => setFilters({ ...filters, type: val })}
            options={[
              { value: '', label: 'All Types' },
              ...resourceTypes.map(type => ({ 
                value: type, 
                label: `${type.replace(/_/g, ' ')}s` 
              }))
            ]}
            icon={Filter}
            className="flex-grow min-w-[160px]"
          />

          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-3xl px-6 py-4 shadow-soft dark:shadow-none border border-white dark:border-white/5">
            <MapPin className="text-brand-blue w-5 h-5" />
            <input 
              type="text"
              placeholder="Location..."
              className="bg-transparent border-none outline-none text-sm font-bold text-[#1B2559] dark:text-white w-full"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-3xl px-6 py-4 shadow-soft dark:shadow-none border border-white dark:border-white/5">
            <Users className="text-brand-blue w-5 h-5" />
            <input 
              type="number"
              placeholder="Min Capacity"
              className="bg-transparent border-none outline-none text-sm font-bold text-[#1B2559] dark:text-white w-full"
              value={filters.capacity_min}
              onChange={(e) => setFilters({ ...filters, capacity_min: e.target.value })}
            />
          </div>

          <CustomSelect
            value={`${filters.sort_by}-${filters.sort_order}`}
            onChange={(val) => {
              const [sort_by, sort_order] = val.split('-');
              setFilters({ ...filters, sort_by, sort_order });
            }}
            options={[
              { value: 'created_at-desc', label: 'Newest First' },
              { value: 'name-asc', label: 'Name A-Z' },
              { value: 'capacity-desc', label: 'Largest Capacity' },
              { value: 'capacity-asc', label: 'Smallest Capacity' }
            ]}
            icon={TrendingUp}
            className="flex-grow min-w-[160px]"
          />
        </div>
      </div>

      <div className="w-full px-2">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="card p-0 overflow-hidden">
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton variant="text" className="w-3/4 h-6" />
                  <Skeleton variant="text" className="w-1/2 h-4" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-24 h-10 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : resources.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-10">
              {resources.map(resource => (
                <ResourceCard 
                  key={resource.id} 
                  resource={resource} 
                  onBook={handleBook}
                  selectable={user?.role === 'admin'}
                  isSelected={selectedResources.includes(resource.id)}
                  onSelect={toggleSelection}
                />
              ))}
            </div>

            {/* Pagination UI */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-white dark:border-white/5 shadow-soft">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-brand-lavender">
                  Showing <span className="text-[#1B2559] dark:text-white font-bold">{(pagination.page - 1) * filters.limit + 1}-{Math.min(pagination.page * filters.limit, pagination.total)}</span> of <span className="text-[#1B2559] dark:text-white font-bold">{pagination.total}</span>
                </p>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/10 mx-2"></div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-brand-lavender">Per page:</span>
                  <select 
                    className="bg-transparent border-none outline-none text-sm font-bold text-[#1B2559] dark:text-white cursor-pointer"
                    value={filters.limit}
                    onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex gap-2">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => fetchResources(p)}
                    className={`w-10 h-10 rounded-xl font-bold transition-all ${
                      pagination.page === p 
                        ? 'bg-brand-blue text-white' 
                        : 'bg-white dark:bg-zinc-900 text-[#1B2559] dark:text-white hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <EmptyState 
            icon={Package}
            title="No assets found"
            description={debouncedSearch 
              ? `We couldn't find anything matching "${debouncedSearch}". Try a different term or clear filters.`
              : "There are currently no resources available in this category."
            }
            actionLabel={debouncedSearch || filters.type || filters.location ? "Clear All Filters" : null}
            onAction={() => setFilters({
              type: '',
              location: '',
              capacity_min: '',
              sort_by: 'created_at',
              sort_order: 'desc',
              search: '',
            })}
          />
        )}
      </div>

      <ConfirmationDialog 
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={handleBulkAction}
        title={bulkAction === 'delete' ? 'Bulk Delete Resources?' : 'Bulk Update Status?'}
        message={`Are you sure you want to ${bulkAction === 'delete' ? 'permanently delete' : 'update status to ' + bulkAction} for ${selectedResources.length} selected resources?`}
        confirmLabel={bulkAction === 'delete' ? 'Delete All' : 'Update All'}
        variant="danger"
      />

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedResources.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1B2559] text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center text-[10px] font-bold">
                {selectedResources.length}
              </div>
              <span className="text-sm font-bold whitespace-nowrap">Selected</span>
            </div>
            
            <div className="h-6 w-px bg-white/10"></div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setBulkAction('available'); setIsBulkConfirmOpen(true); }}
                className="px-4 py-2 hover:bg-white/10 rounded-xl transition-all text-sm font-bold flex items-center gap-2"
              >
                Set Available
              </button>
              <button 
                onClick={() => { setBulkAction('unavailable'); setIsBulkConfirmOpen(true); }}
                className="px-4 py-2 hover:bg-white/10 rounded-xl transition-all text-sm font-bold flex items-center gap-2"
              >
                Set Unavailable
              </button>
              <button 
                onClick={() => { setBulkAction('delete'); setIsBulkConfirmOpen(true); }}
                className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all text-sm font-bold flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button 
                onClick={() => setSelectedResources([])}
                className="px-4 py-2 text-white/60 hover:text-white text-sm font-bold"
              >
                Deselect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Resources;
