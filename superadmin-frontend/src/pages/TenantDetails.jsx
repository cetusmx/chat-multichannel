import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function TenantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [maxUsers, setMaxUsers] = useState(0);
  const [isUnlimitedUsers, setIsUnlimitedUsers] = useState(false);
  const [maxAiTokens, setMaxAiTokens] = useState(0);
  const [isUnlimitedTokens, setIsUnlimitedTokens] = useState(false);
  const [licenseType, setLicenseType] = useState('SUBSCRIPTION');

  const fetchTenantDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/api/superadmin/tenants/${id}`);
      setTenant(data);
      setMaxUsers(data.maxUsers === -1 ? '' : data.maxUsers);
      setIsUnlimitedUsers(data.maxUsers === -1);
      setMaxAiTokens(data.maxAiTokens === -1 ? '' : data.maxAiTokens);
      setIsUnlimitedTokens(data.maxAiTokens === -1);
      setLicenseType(data.licenseType || 'SUBSCRIPTION');
    } catch (err) {
      if (!tenant) setError(err.message || 'Error al cargar el inquilino');
      toast.error('Error al cargar datos del inquilino');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTenantDetails();
  }, [fetchTenantDetails]);

  const handleLicenseTypeChange = (e) => {
    const newType = e.target.value;
    setLicenseType(newType);
    if (newType === 'LIFETIME') {
      setMaxAiTokens(0);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const numUsers = isUnlimitedUsers ? -1 : (maxUsers === "" ? 0 : Number(maxUsers));
    const payloadTokens = licenseType === 'LIFETIME' ? 0 : (isUnlimitedTokens ? -1 : (maxAiTokens === "" ? 0 : Number(maxAiTokens)));

    if (tenant) {
      const isReducingUsers = numUsers !== -1 && (tenant.maxUsers === -1 || numUsers < tenant.maxUsers);
      const isReducingTokens = payloadTokens !== -1 && (tenant.maxAiTokens === -1 || payloadTokens < tenant.maxAiTokens) && licenseType !== 'LIFETIME';

      if (isReducingUsers || isReducingTokens) {
        if (!window.confirm("Estás reduciendo los límites de licencia actuales para este inquilino. ¿Proceder?")) {
          return;
        }
      }
    }

    try {
      setSaving(true);
      const response = await api.put(`/api/superadmin/tenants/${id}/licenses`, {
        maxUsers: numUsers,
        maxAiTokens: payloadTokens,
        licenseType
      });
      
      // Pessimistic update: only update on success
      setTenant(prev => ({
        ...prev,
        ...response,
        currentActiveUsers: prev.currentActiveUsers // preserve unless backend returns it in PUT
      }));
      toast.success('Licencias actualizadas exitosamente');
    } catch (err) {
      toast.error(err.message || 'Error al actualizar licencias');
      if (err.data?.error?.code === 'BELOW_ACTIVE_USERS') {
        // Recover state by re-fetching
        fetchTenantDetails();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/4 mb-10"></div>
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="w-full text-center py-12">
        <p className="text-red-400 mb-4">{error || 'Inquilino no encontrado'}</p>
        <button onClick={() => navigate('/tenants')} className="text-blue-500 hover:underline">
          Volver a inquilinos
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <header className="mb-10 flex items-center gap-4">
        <button 
          onClick={() => navigate('/tenants')}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">{tenant.name}</h2>
          <p className="text-slate-400 mt-1">Configuración de Licencias y Detalles</p>
        </div>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col p-6">
        <h3 className="text-xl font-medium mb-6 flex items-center gap-2">
          <AlertTriangle className="text-yellow-500" size={20} />
          Licenciamiento y Límites
        </h3>
        
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Tipo de Licencia</label>
              <select 
                value={licenseType}
                onChange={handleLicenseTypeChange}
                disabled={saving}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="SUBSCRIPTION">Suscripción (Mensual/Anual)</option>
                <option value="LIFETIME">Lifetime (Vitalicia)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Límite de Usuarios 
                <span className="text-xs text-slate-500 ml-2">(Actuales: {tenant.currentActiveUsers ?? 0})</span>
              </label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number"
                  min={tenant.currentActiveUsers ?? 0}
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(e.target.value)}
                  disabled={saving || isUnlimitedUsers}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                />
                <label className="flex items-center gap-2 text-sm text-slate-300 whitespace-nowrap cursor-pointer">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-950" checked={isUnlimitedUsers} onChange={(e) => setIsUnlimitedUsers(e.target.checked)} disabled={saving} /> Ilimitado
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Límite Mensual Tokens IA
              </label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number"
                  min="0"
                  value={licenseType === 'LIFETIME' ? 0 : maxAiTokens}
                  onChange={(e) => setMaxAiTokens(e.target.value)}
                  disabled={saving || licenseType === 'LIFETIME' || isUnlimitedTokens}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                />
                {licenseType !== 'LIFETIME' && (
                  <label className="flex items-center gap-2 text-sm text-slate-300 whitespace-nowrap cursor-pointer">
                    <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-950" checked={isUnlimitedTokens} onChange={(e) => setIsUnlimitedTokens(e.target.checked)} disabled={saving} /> Ilimitado
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
