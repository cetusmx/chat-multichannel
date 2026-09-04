import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import SearchResultsLayout from '../components/search/SearchResultsLayout';
import FiltersSidebar from '../components/search/FiltersSidebar';
import FiltersDrawer from '../components/search/FiltersDrawer';
import ErrorBoundary from '../components/search/ErrorBoundary';
import { Filter, X } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const typeFilter = searchParams.getAll('type');
  const vendorIdFilter = searchParams.get('vendorId');
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
        typeFilter.forEach(t => params.append('type', t));
        if (vendorIdFilter) params.append('vendorId', vendorIdFilter);

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
  }, [query, page, typeFilter.join(','), vendorIdFilter, token]);

  const handleFilterChange = (filterKey, value) => {
    const newParams = new URLSearchParams(searchParams);
    
    // reset page to 1
    newParams.set('page', '1');
    
    if (filterKey === 'type') {
      const current = newParams.getAll('type');
      newParams.delete('type');
      if (current.includes(value)) {
        // remove
        current.filter(t => t !== value).forEach(t => newParams.append('type', t));
      } else {
        // add
        current.forEach(t => newParams.append('type', t));
        newParams.append('type', value);
      }
    } else if (value) {
      newParams.set(filterKey, value);
    } else {
      newParams.delete(filterKey);
    }
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    newParams.set('q', query);
    setSearchParams(newParams);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden pt-14">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 border-r border-gray-200 bg-white flex-shrink-0">
        <FiltersSidebar 
          facets={meta?.facets} 
          loading={isPending}
          activeTypes={typeFilter}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            {typeof query === "object" ? JSON.stringify(query) : query ? `Resultados para "${query}"` : 'Búsqueda Global'}
          </h1>
          <button 
            className="md:hidden flex items-center gap-2 text-blue-600 font-medium p-2"
            onClick={() => setDrawerOpen(true)}
          >
            <Filter size={18} /> Filtros
          </button>
        </div>

        {/* Active Filters Pills */}
        {(typeFilter.length > 0 || vendorIdFilter) && (
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <span className="text-sm text-gray-500">Filtros activos:</span>
            {typeFilter.map(t => (
              <span key={typeof t === "object" ? JSON.stringify(t) : t} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200">
                Tipo: {typeof t === "object" ? JSON.stringify(t) : t}
                <button onClick={() => handleFilterChange('type', t)} className="hover:bg-blue-200 rounded-full p-0.5">
                  <X size={14} />
                </button>
              </span>
            ))}
            {vendorIdFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200">
                Vendedor: {typeof vendorIdFilter === "object" ? JSON.stringify(vendorIdFilter) : vendorIdFilter}
                <button onClick={() => handleFilterChange('vendorId', null)} className="hover:bg-blue-200 rounded-full p-0.5">
                  <X size={14} />
                </button>
              </span>
            )}
            <button 
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-800 underline ml-2"
            >
              Borrar todos
            </button>
          </div>
        )}

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

      {/* Mobile Drawer */}
      <FiltersDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)}
        facets={meta?.facets}
        activeTypes={typeFilter}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}
