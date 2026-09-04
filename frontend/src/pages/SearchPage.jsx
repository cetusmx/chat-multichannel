import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import SearchResultsLayout from '../components/search/SearchResultsLayout';
import FiltersSidebar from '../components/search/FiltersSidebar';
import ErrorBoundary from '../components/search/ErrorBoundary';
import { Filter, X } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  // Operational Filters
  const currentFilters = {
    vendorId: searchParams.get('vendorId') || '',
    clientId: searchParams.get('clientId') || '',
    rfc: searchParams.get('rfc') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    status: searchParams.get('status') || '',
  };
  
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPending, startTransition] = useTransition();
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    if (!query) return;

    const controller = new AbortController();
    setError(null);

    const fetchResults = async () => {
      try {
        const params = new URLSearchParams();
        params.append('q', query);
        params.append('page', page);
        
        if (currentFilters.vendorId) params.append('vendorId', currentFilters.vendorId);
        if (currentFilters.clientId) params.append('clientId', currentFilters.clientId);
        if (currentFilters.rfc) params.append('rfc', currentFilters.rfc);
        if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
        if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);
        if (currentFilters.status) params.append('status', currentFilters.status);

        const res = await axios.get(`/api/search?${params.toString()}`, {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        startTransition(() => {
          setData(res.data.data);
          setMeta(res.data.meta);
        });
      } catch (err) {
        if (axios.isCancel(err)) return;
        startTransition(() => {
          const apiError = err.response?.data?.error;
          const errMsg = typeof apiError === 'object' ? apiError.message : apiError;
          setError(errMsg || 'Error de red al cargar resultados');
        });
      }
    };

    fetchResults();

    return () => controller.abort();
  }, [query, page, currentFilters.vendorId, currentFilters.clientId, currentFilters.rfc, currentFilters.dateFrom, currentFilters.dateTo, currentFilters.status, token]);

  const handleApplyFilters = (newFilters) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k]) {
        params.set(k, newFilters[k]);
      } else {
        params.delete(k);
      }
    });
    
    setSearchParams(params);
  };

  const removeFilter = (key) => {
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    params.set('q', query);
    setSearchParams(params);
  };

  const hasActiveFilters = Object.values(currentFilters).some(v => v !== '');

  const getVendorName = (id) => {
    const v = meta?.facets?.asesores?.find(x => x.id === id);
    return v ? v.name : id;
  };

  const getClientName = (id) => {
    const c = meta?.facets?.clientes?.find(x => x.id === id);
    return c ? c.name : id;
  };

  const renderPill = (key, label, value) => {
    if (!value) return null;
    return (
      <span key={key} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200 shadow-sm">
        <span className="font-medium">{label}:</span> {value}
        <button onClick={() => removeFilter(key)} className="hover:bg-blue-200 rounded-full p-0.5 ml-1 transition-colors" aria-label={`Quitar filtro ${label}`}>
          <X size={14} />
        </button>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden pt-14">
      {/* Search Header Row */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm z-10 flex-shrink-0">
        <div className="w-full px-2">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <button 
                  className="flex items-center justify-center p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  onClick={() => setSidebarOpen(true)}
                  title="Mostrar Filtros"
                >
                  <Filter size={18} /> 
                  {hasActiveFilters && (
                    <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-blue-500 rounded-full border-2 border-white transform translate-x-1/2 -translate-y-1/2"></span>
                  )}
                </button>
              )}
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                {query ? `Resultados para "${query}"` : 'Búsqueda Global'}
                {meta?.pagination?.hasMore !== undefined && (
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                    Página {meta.pagination.page}
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Active Filters Pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center mt-3">
              <span className="text-sm font-medium text-gray-500 mr-1">Filtros:</span>
              {renderPill('vendorId', 'Asesor', getVendorName(currentFilters.vendorId))}
              {renderPill('clientId', 'Cliente', getClientName(currentFilters.clientId))}
              {renderPill('rfc', 'RFC', currentFilters.rfc)}
              {renderPill('dateFrom', 'Desde', currentFilters.dateFrom)}
              {renderPill('dateTo', 'Hasta', currentFilters.dateTo)}
              
              <button 
                onClick={clearAllFilters}
                className="text-sm text-red-500 hover:text-red-700 font-medium ml-2 hover:underline transition-all"
              >
                Limpiar todo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area (3 Columns) */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        <FiltersSidebar 
          isOpen={sidebarOpen}
          currentFilters={currentFilters}
          onApply={handleApplyFilters}
          onClose={() => setSidebarOpen(false)}
          facets={meta?.facets}
        />
        
        <div className="flex-1 overflow-auto bg-gray-50 p-2 md:p-4">
          <ErrorBoundary>
            <SearchResultsLayout 
              data={data} 
              loading={isPending} 
              error={error} 
              query={query} 
              meta={meta}
              onPageChange={(newPage) => {
                const params = new URLSearchParams(searchParams);
                params.set('page', newPage.toString());
                setSearchParams(params);
              }}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
