import { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Filter, X } from 'lucide-react';
import SearchResultsLayout from '../components/search/SearchResultsLayout';
import FiltersSidebar from '../components/search/FiltersSidebar';
import ErrorBoundary from '../components/search/ErrorBoundary';
import useAuthStore from '../stores/useAuthStore';
import { Badge, Button, Eyebrow, IconButton } from '../components/ui/index.js';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
          headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      <Badge key={key} tone="accent" className="gap-1 pr-0.5">
        <span className="text-fg-muted">{label}:</span>
        <span className="normal-case tracking-normal text-fg">{value}</span>
        <button
          type="button"
          onClick={() => removeFilter(key)}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm text-accent transition-colors hover:bg-accent/20"
          aria-label={`Quitar filtro ${label}`}
        >
          <X size={11} />
        </button>
      </Badge>
    );
  };

  const total = meta?.facets?.chats || 0;

  return (
    <div className="flex h-full min-w-0 flex-col bg-bg">
      <div className="z-10 shrink-0 border-b border-border bg-surface px-5 py-3.5">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <div className="relative">
              <IconButton
                icon={Filter}
                label="Mostrar filtros"
                variant="outline"
                size="lg"
                onClick={() => setSidebarOpen(true)}
                aria-expanded={sidebarOpen}
              />
              {hasActiveFilters && (
                <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" aria-hidden />
              )}
            </div>
          )}
          <div className="min-w-0">
            <Eyebrow tone="muted">Búsqueda</Eyebrow>
            <h1 className="mt-0.5 flex items-baseline gap-2 text-base font-semibold text-fg leading-tight">
              {query ? (
                <>
                  <span className="truncate">Resultados para “{query}”</span>
                  <span className="tnum shrink-0 font-mono text-xs font-normal text-fg-subtle">{total}</span>
                </>
              ) : (
                'Búsqueda global'
              )}
            </h1>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Eyebrow tone="muted">Filtros</Eyebrow>
            {renderPill('vendorId', 'Asesor', getVendorName(currentFilters.vendorId))}
            {renderPill('clientId', 'Cliente', getClientName(currentFilters.clientId))}
            {renderPill('rfc', 'RFC', currentFilters.rfc)}
            {renderPill('dateFrom', 'Desde', currentFilters.dateFrom)}
            {renderPill('dateTo', 'Hasta', currentFilters.dateTo)}
            <Button variant="ghost" size="xs" onClick={clearAllFilters}>
              Limpiar todo
            </Button>
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <FiltersSidebar
          isOpen={sidebarOpen}
          currentFilters={currentFilters}
          onApply={handleApplyFilters}
          onClose={() => setSidebarOpen(false)}
          facets={meta?.facets}
        />

        <div className="min-w-0 flex-1 overflow-hidden p-4">
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
