import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Server, Clock, Activity, Search, AlertCircle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { api } from '../services/api';
import CreateTenantModal from '../components/CreateTenantModal';
import { toast } from 'sonner';
export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [togglingTenantIds, setTogglingTenantIds] = useState(new Set());
  const newTenantBtnRef = useRef(null);

  const abortControllerRef = useRef(null);

  const fetchTenants = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      // api.get uses standard fetch wrapper
      const response = await api.get(`/api/superadmin/tenants?page=${page}&limit=10&sortBy=createdAt&sortOrder=desc`, {
        signal: controller.signal
      });
      if (!response) return;
      setTenants(response.data);
      setMeta(response.meta);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Error al cargar los inquilinos');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [page]);

  useEffect(() => {
    fetchTenants();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTenants]);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < Math.ceil(meta.total / meta.limit)) setPage(page + 1);
  };

  const handleToggleStatus = async (tenant) => {
    if (togglingTenantIds.has(tenant.id)) return;
    
    const isCurrentlyActive = tenant.status?.toLowerCase() === 'active';
    const newStatus = isCurrentlyActive ? 'suspended' : 'active';
    const actionText = isCurrentlyActive ? 'suspender' : 'reactivar';
    
    if (!window.confirm(`¿Estás seguro de que deseas ${actionText} el inquilino "${tenant.name}"?`)) {
      return;
    }

    const previousStatus = tenant.status;

    try {
      setTogglingTenantIds(prev => new Set(prev).add(tenant.id));
      
      // Optimistic Update
      setTenants(prev => prev.map(t => 
        t.id === tenant.id ? { ...t, status: newStatus } : t
      ));

      await api.patch(`/api/superadmin/tenants/${tenant.id}/status`, { status: newStatus });
      toast.success(`Inquilino ${newStatus === 'active' ? 'reactivado' : 'suspendido'} exitosamente`);
    } catch (err) {
      // Revert Optimistic Update
      setTenants(prev => prev.map(t => 
        t.id === tenant.id ? { ...t, status: previousStatus } : t
      ));
      toast.error('Error al actualizar el estado del inquilino');
    } finally {
      setTogglingTenantIds(prev => {
        const next = new Set(prev);
        next.delete(tenant.id);
        return next;
      });
    }
  };

  return (
    <div className="w-full">
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Inquilinos</h2>
          <p className="text-slate-400 mt-1">Administración global de todos los tenants registrados.</p>
        </div>
        <button
          ref={newTenantBtnRef}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nuevo Inquilino
        </button>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o dominio..." 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
              disabled // Future implementation
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-4 px-6 font-medium">
                  <div className="flex items-center gap-2"><Users size={16} /> Nombre</div>
                </th>
                <th className="py-4 px-6 font-medium">
                  <div className="flex items-center gap-2"><Server size={16} /> Dominio</div>
                </th>
                <th className="py-4 px-6 font-medium">
                  <div className="flex items-center gap-2"><Clock size={16} /> Creación</div>
                </th>
                <th className="py-4 px-6 font-medium">
                  <div className="flex items-center gap-2"><Activity size={16} /> Estado</div>
                </th>
                <th className="py-4 px-6 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-4 px-6"><div className="h-5 bg-slate-800 rounded animate-pulse w-3/4"></div></td>
                    <td className="py-4 px-6"><div className="h-5 bg-slate-800 rounded animate-pulse w-2/3"></div></td>
                    <td className="py-4 px-6"><div className="h-5 bg-slate-800 rounded animate-pulse w-1/2"></div></td>
                    <td className="py-4 px-6"><div className="h-6 bg-slate-800 rounded-full animate-pulse w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-6 bg-slate-800 rounded animate-pulse w-16 float-right"></div></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan="5" className="py-12 px-6 text-center text-red-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} />
                      <p>{error}</p>
                    </div>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 px-6 text-center text-slate-500">
                    No se encontraron inquilinos.
                  </td>
                </tr>
              ) : (
                tenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-200">
                      <Link to={`/tenants/${tenant.id}`} className="hover:text-blue-400 hover:underline transition-colors">
                        {tenant.name}
                      </Link>
                    </td>
                    <td className="py-4 px-6 text-slate-400">{tenant.domain}</td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        tenant.status?.toLowerCase() === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {tenant.status?.toLowerCase() === 'active' ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleToggleStatus(tenant)}
                        disabled={togglingTenantIds.has(tenant.id)}
                        aria-pressed={tenant.status?.toLowerCase() !== 'active'}
                        aria-label={`${tenant.status?.toLowerCase() === 'active' ? 'Suspender' : 'Reactivar'} inquilino ${tenant.name}`}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          tenant.status?.toLowerCase() === 'active'
                            ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {togglingTenantIds.has(tenant.id) ? 'Procesando...' : (tenant.status?.toLowerCase() === 'active' ? 'Suspender' : 'Reactivar')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-sm text-slate-400">
          <div>
            Mostrando {tenants.length} de {meta.total} resultados
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevPage}
              disabled={page === 1 || loading}
              className="p-1 rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-2">Página {page} de {Math.max(1, Math.ceil(meta.total / meta.limit))}</span>
            <button 
              onClick={handleNextPage}
              disabled={page >= Math.ceil(meta.total / meta.limit) || loading}
              className="p-1 rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <CreateTenantModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          if (page === 1) fetchTenants();
          else setPage(1); // Will trigger effect to fetch
        }}
        triggerRef={newTenantBtnRef}
      />
    </div>
  );
}
