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
      <div className="hidden md:block w-64 border-r border-gray-200 bg-white flex-shrink-0">
        <FiltersSidebar 
          facets={meta?.facets} 
          loading={isPending}
          activeTypes={typeFilter}
          onFilterChange={handleFilterChange}
        />
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            {typeof query === "object" ? JSON.stringify(query) : query ? `Resultados para "${query}"` : 'Búsqueda Global'}
          </h1>
        </div>

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
  );
}
