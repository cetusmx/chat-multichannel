import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../../../services/api';
import { Search, ChevronLeft, ChevronRight, XCircle, Users } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { Avatar, Button, EmptyState, Eyebrow, IconButton, Input, PageHeader, Spinner } from '../../../components/ui/index.js';
import { formatDate, formatRelativeTime } from '../../../utils/formatDate.js';
import { cn } from '../../../utils/cn.js';

const COLUMNS = ['Cliente', 'Teléfono', 'RFC', 'Último contacto', 'Última compra', 'Último asesor'];

export default function ClientDirectory() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState(null);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');

  const debouncedSearch = useDebounce(searchInput, 500);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchClients = async () => {
      setIsLoading(true);
      setIsError(null);

      try {
        const params = new URLSearchParams({
          page,
          limit: 10,
        });
        if (debouncedSearch) params.append('search', debouncedSearch);

        const response = await get(`/clients?${params.toString()}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setClients(data.data);
        setMeta(data.meta);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error al obtener clientes:', err);
          setIsError('Ocurrió un error al cargar el directorio de clientes. Por favor, intenta de nuevo.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();

    return () => {
      abortController.abort();
    };
  }, [page, debouncedSearch]);

  const isInitialLoad = isLoading && clients.length === 0;
  const isRefetching = isLoading && clients.length > 0;
  const isEmpty = !isLoading && !isError && clients.length === 0;
  const hasActiveFilters = Boolean(debouncedSearch);

  const clearFilters = () => {
    setSearchInput('');
    setPage(1);
  };

  const totalPages = meta?.totalPages || 1;

  return (
    <div>
      <PageHeader
        eyebrow="Directorio"
        title="Clientes"
        description="Personas que han conversado con tu equipo, con su último contacto y compra."
        actions={
          <div className="w-72 sm:w-80">
            <Input
              leftIcon={Search}
              placeholder="Buscar por nombre, teléfono o RFC"
              aria-label="Buscar clientes"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        }
      />

      {isError && clients.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger" role="alert">
          <XCircle size={15} aria-hidden />
          {isError}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {isInitialLoad ? (
          <div className="space-y-3 p-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-surface-2" />
            ))}
          </div>
        ) : isError && clients.length === 0 ? (
          <EmptyState
            icon={XCircle}
            title="Error al cargar clientes"
            description="Por favor intenta nuevamente o contacta a soporte."
            action={hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Limpiar filtros</Button>}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={Users}
            title="No se encontraron clientes"
            description={
              hasActiveFilters
                ? 'No encontramos ningún cliente que coincida con tu búsqueda.'
                : 'Tu directorio de clientes está vacío.'
            }
            action={hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Limpiar filtros</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={cn('w-full text-sm transition-opacity', isRefetching && 'opacity-60')}>
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col} className="whitespace-nowrap border-b border-border px-4 py-2.5 text-left">
                      <Eyebrow tone="muted">{col}</Eyebrow>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-surface-2/60"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={client.name} size="sm" tone="neutral" />
                        <span className="font-medium text-fg">{client.name || 'Sin nombre'}</span>
                      </div>
                    </td>
                    <td className="tnum whitespace-nowrap px-4 py-3 font-mono text-xs text-fg-muted">
                      {client.phoneNumber || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-fg-muted">
                      {client.cartData?.rfc || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {client.lastInboundDate ? formatRelativeTime(client.lastInboundDate) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {client.lastPurchaseDate ? formatDate(client.lastPurchaseDate) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {client.lastVendor?.name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isInitialLoad && !isEmpty && meta && (
        <div className="mt-4 flex items-center justify-between text-sm text-fg-muted">
          <p className="flex items-center gap-2">
            {isRefetching && <Spinner size={14} />}
            <span>
              Mostrando <span className="tnum font-medium text-fg">{clients.length}</span> resultados · página{' '}
              <span className="tnum">{page}</span> de <span className="tnum">{totalPages}</span>
            </span>
          </p>
          <div className="flex gap-1">
            <IconButton
              icon={ChevronLeft}
              label="Página anterior"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            />
            <IconButton
              icon={ChevronRight}
              label="Página siguiente"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            />
          </div>
        </div>
      )}
    </div>
  );
}
