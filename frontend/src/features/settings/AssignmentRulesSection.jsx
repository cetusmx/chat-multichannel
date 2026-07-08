import { useState, useEffect } from 'react';
import { getAssignmentConfig, updateAssignmentConfig, getUsers } from '../../services/api.js';

/**
 * AssignmentRulesSection component allows administrators to configure
 * the client assignment strategy (MANUAL vs ROUND_ROBIN) and select
 * the eligible vendors for automatic assignment.
 * 
 * @component
 * @returns {JSX.Element} The rendered component
 */
export default function AssignmentRulesSection() {
  const [strategy, setStrategy] = useState('MANUAL');
  const [activeVendorIds, setActiveVendorIds] = useState([]);
  const [vendors, setVendors] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [configRes, usersRes] = await Promise.all([
          getAssignmentConfig(),
          getUsers('role=VENDOR&limit=100')
        ]);
        
        if (!configRes.ok || !usersRes.ok) {
          throw new Error('No se pudo cargar la configuración o los usuarios.');
        }
        
        const configData = await configRes.json();
        const usersData = await usersRes.json();
        
        if (configData.data) {
          setStrategy(configData.data.strategy);
          setActiveVendorIds((configData.data.activeVendors || []).map(v => v.id));
        }

        if (usersData.data) {
          setVendors(usersData.data);
        }
      } catch (err) {
        setError(err.message);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const validVendorIds = activeVendorIds.filter(id => (vendors || []).some(v => v.id === id));
      const res = await updateAssignmentConfig({
        strategy,
        activeVendorIds: strategy === 'ROUND_ROBIN' ? validVendorIds : [],
      });
      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error('Error al procesar la respuesta del servidor');
      }
      
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Error saving assignment configuration');
      }

      setStrategy(data.data.strategy);
      setActiveVendorIds((data.data?.activeVendors || []).map(v => v.id));
      setSuccess('Configuración de asignación guardada con éxito.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVendorToggle = (id) => {
    setActiveVendorIds((prev) => 
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
    setSuccess('');
  };

  const handleStrategyChange = (e) => {
    setStrategy(e.target.value);
    setSuccess('');
  };

  if (loading) return <div className="text-sales-slate-400">Loading assignment rules...</div>;

  if (fetchError) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6">
        <h2 className="mb-4 text-lg font-medium text-sales-slate-100">Reglas de Asignación de Clientes</h2>
        <div className="rounded-lg bg-red-900/50 p-3 text-sm text-red-400 border border-red-900/50">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6">
      <h2 className="mb-4 text-lg font-medium text-sales-slate-100">Reglas de Asignación de Clientes</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        {error && (
          <div className="rounded-lg bg-red-900/50 p-3 text-sm text-red-400 border border-red-900/50">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-900/50 p-3 text-sm text-emerald-400 border border-emerald-900/50">
            {success}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-sales-slate-300">
            Estrategia de Asignación
          </label>
          <select
            value={strategy}
            onChange={handleStrategyChange}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sales-slate-100 focus:border-sales-coral focus:outline-none"
          >
            <option value="MANUAL">Manual (El coordinador asigna manualmente o los vendedores toman los chats)</option>
            <option value="ROUND_ROBIN">Round-Robin (Asignación automática equitativa)</option>
          </select>
        </div>

        {strategy === 'ROUND_ROBIN' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-sales-slate-300">
              Vendedores Elegibles (Round-Robin)
            </label>
            <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-800/50 p-4 max-h-64 overflow-y-auto">
              {(vendors || []).length === 0 ? (
                <p className="text-sm text-sales-slate-400">No hay vendedores disponibles.</p>
              ) : (
                vendors.map((vendor) => (
                  <label key={vendor.id} className="flex items-center space-x-3 text-sm text-sales-slate-200">
                    <input
                      type="checkbox"
                      checked={activeVendorIds.includes(vendor.id)}
                      onChange={() => handleVendorToggle(vendor.id)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sales-coral focus:ring-sales-coral focus:ring-offset-slate-900"
                    />
                    <span>{vendor.name} ({vendor.email})</span>
                  </label>
                ))
              )}
            </div>
            <p className="mt-2 text-xs text-sales-slate-400">
              Selecciona los vendedores que recibirán chats automáticamente.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || (strategy === 'ROUND_ROBIN' && activeVendorIds.length === 0)}
          className="rounded-lg bg-sales-coral px-4 py-2 font-medium text-white transition-colors hover:bg-sales-coral/90 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Reglas'}
        </button>
      </form>
    </div>
  );
}
