import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight, XCircle, Users } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';

export default function ClientDirectory() {
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState(null);
  
  // Filtering and Pagination State
  const [page, setPage] = useState(1);
  const [rfcInput, setRfcInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  
  // Debounced filters
  const debouncedRfc = useDebounce(rfcInput, 500);
  const debouncedPhone = useDebounce(phoneInput, 500);

  // Async states
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(null);

  // Fetch logic
  useEffect(() => {
    // Reset page to 1 whenever filters change, except on initial render
    setPage(1);
  }, [debouncedRfc, debouncedPhone]);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchClients = async () => {
      setIsLoading(true);
      setIsError(null);

      try {
        const response = await axios.get('/api/clients', {
          params: {
            page,
            limit: 10,
            rfc: debouncedRfc || undefined,
            phoneNumber: debouncedPhone || undefined,
          },
          signal: abortController.signal,
        });

        setClients(response.data.data);
        setMeta(response.data.meta);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Error fetching clients:', err);
          setIsError('Failed to fetch clients. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();

    return () => {
      abortController.abort();
    };
  }, [page, debouncedRfc, debouncedPhone]);

  // Derived states
  const isInitialLoad = isLoading && clients.length === 0;
  const isRefetching = isLoading && clients.length > 0;
  const isEmpty = !isLoading && !isError && clients.length === 0;
  const hasActiveFilters = Boolean(debouncedRfc || debouncedPhone);

  const clearFilters = () => {
    setRfcInput('');
    setPhoneInput('');
    setPage(1);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Intl.DateTimeFormat('default', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(isoString));
    } catch {
      return 'N/A';
    }
  };

  const totalPages = meta?.totalPages || 1;

  return (
    <div className="w-full space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
          Client Directory
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by RFC..."
              className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-orange-400 text-white placeholder-gray-400 transition-all"
              value={rfcInput}
              onChange={(e) => setRfcInput(e.target.value)}
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by Phone..."
              className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-orange-400 text-white placeholder-gray-400 transition-all"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {isError && clients.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
          <XCircle className="h-5 w-5" />
          {isError}
        </div>
      )}

      {/* Table Container */}
      <div className="relative rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden">
        
        {/* Refetching Overlay */}
        {isRefetching && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
          </div>
        )}

        {/* Initial Load Skeleton */}
        {isInitialLoad ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : isError && clients.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
             <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
               <XCircle className="h-8 w-8 text-red-400" />
             </div>
             <div>
               <h3 className="text-lg font-medium text-white">Error loading clients</h3>
               <p className="text-gray-400 text-sm mt-1">Please try again or contact support.</p>
             </div>
             {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors text-sm"
              >
                Clear Filters
              </button>
             )}
          </div>
        ) : isEmpty ? (
          /* Empty State */
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-white/5 border border-white/10">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">No clients found</h3>
              <p className="text-gray-400 text-sm mt-1">
                {hasActiveFilters 
                  ? "We couldn't find any clients matching your search criteria."
                  : "Your client directory is currently empty."}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/5 border-b border-white/10 text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Name</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Phone Number</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">RFC</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Last Inbound Contact</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Last Purchase</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Last Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                      {client.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.phoneNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.cartData?.rfc || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(client.lastInboundDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(client.lastPurchaseDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.conversations?.[0]?.vendorId || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!isInitialLoad && !isEmpty && meta && (
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <p className="text-sm text-gray-400">
            Showing <span className="font-medium text-white">{clients.length}</span> results 
            (Page {page} of {totalPages})
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-gradient-to-r from-orange-400 to-rose-400 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-opacity"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
