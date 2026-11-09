import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, AlertTriangle, Mail, KeyRound, Loader2, Database, SlidersHorizontal } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import ConfirmModal from '../components/ui/ConfirmModal';
import TenantCatalogConfig from '../components/TenantCatalogConfig';

const TABS = [
  { id: 'general', label: 'Licencias y cuenta', icon: SlidersHorizontal },
  { id: 'catalog', label: 'Catálogo', icon: Database },
];

export default function TenantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('general');
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

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
      const response = await api.get(`/api/superadmin/tenants/${id}`);
      const data = response.data; // Unwrap the success() structure
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

  const executeSave = async (payload) => {
    try {
      setSaving(true);
      const response = await api.put(`/api/superadmin/tenants/${id}/licenses`, payload);
      const updatedData = response?.data || response;
      
      // Pessimistic update: only update on success
      setTenant(prev => ({
        ...prev,
        ...updatedData,
        currentActiveUsers: updatedData?.currentActiveUsers ?? prev.currentActiveUsers
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

  const handleSave = async (e) => {
    e.preventDefault();
    
    const minValidUsers = Math.max(1, tenant?.currentActiveUsers ?? 1);
    const numUsers = isUnlimitedUsers ? -1 : (maxUsers === "" ? minValidUsers : Math.max(1, Number(maxUsers)));
    const payloadTokens = licenseType === 'LIFETIME' ? 0 : (isUnlimitedTokens ? -1 : (maxAiTokens === "" ? 0 : Number(maxAiTokens)));
    const payload = {
      maxUsers: numUsers,
      maxAiTokens: payloadTokens,
      licenseType,
    };

    if (tenant) {
      const isReducingUsers = numUsers !== -1 && (tenant.maxUsers === -1 || numUsers < tenant.maxUsers);
      const isReducingTokens = payloadTokens !== -1 && (tenant.maxAiTokens === -1 || payloadTokens < tenant.maxAiTokens) && licenseType !== 'LIFETIME';

      if (isReducingUsers || isReducingTokens) {
        setPendingPayload(payload);
        return;
      }
    }

    await executeSave(payload);
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
          <p className="text-slate-400 mt-1">Licencias, cuenta de administrador y catálogo de productos</p>
        </div>
      </header>

      <div role="tablist" aria-label="Secciones del inquilino" className="flex gap-1 mb-6 border-b border-slate-800">
        {TABS.map(({ id: tabId, label, icon: Icon }) => {
          const selected = activeTab === tabId;
          return (
            <button
              key={tabId}
              type="button"
              role="tab"
              id={`tenant-tab-${tabId}`}
              aria-selected={selected}
              aria-controls={`tenant-panel-${tabId}`}
              onClick={() => setActiveTab(tabId)}
              className={`flex items-center gap-2 px-4 py-2.5 -mb-px text-sm font-medium border-b-2 transition-colors ${
                selected
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === 'catalog' && (
        <div role="tabpanel" id="tenant-panel-catalog" aria-labelledby="tenant-tab-catalog">
          <TenantCatalogConfig tenantId={id} />
        </div>
      )}

      <div role="tabpanel" id="tenant-panel-general" aria-labelledby="tenant-tab-general" hidden={activeTab !== 'general'}>
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
                  min={Math.max(1, tenant.currentActiveUsers ?? 1)}
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(e.target.value)}
                  disabled={saving || isUnlimitedUsers}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                />
                <label className="flex items-center gap-2 text-sm text-slate-300 whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-950"
                    checked={isUnlimitedUsers}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsUnlimitedUsers(checked);
                      if (!checked && maxUsers === '') {
                        setMaxUsers(Math.max(1, tenant.currentActiveUsers ?? 1));
                      }
                    }}
                    disabled={saving}
                  /> Ilimitado
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
                    <input
                      type="checkbox"
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-950"
                      checked={isUnlimitedTokens}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsUnlimitedTokens(checked);
                        if (!checked && maxAiTokens === '') {
                          setMaxAiTokens(0);
                        }
                      }}
                      disabled={saving}
                    /> Ilimitado
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

      {/* Cuenta del Administrador */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col p-6 mt-6">
        <h3 className="text-xl font-medium mb-2 flex items-center gap-2">
          <KeyRound className="text-blue-400" size={20} />
          Cuenta del Administrador Principal
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          Envía un enlace seguro de restablecimiento de contraseña al administrador del inquilino usando el servidor SMTP de plataforma.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/60 border border-slate-800 rounded-xl p-4 max-w-2xl">
          <div>
            <p className="text-sm font-medium text-slate-200">
              {tenant.adminUser?.name || 'Administrador del Inquilino'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {tenant.adminUser?.email || tenant.email || 'Correo registrado del administrador'}
            </p>
          </div>

          <button
            type="button"
            disabled={sendingReset}
            onClick={async () => {
              try {
                setSendingReset(true);
                const res = await api.post(`/api/superadmin/tenants/${id}/reset-admin-password`, {});
                const msg = res?.data?.message || 'Correo de restablecimiento enviado';
                toast.success(msg);
              } catch (err) {
                toast.error(err.message || 'No se pudo enviar el correo de restablecimiento');
              } finally {
                setSendingReset(false);
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {sendingReset ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            {sendingReset ? 'Enviando...' : 'Enviar enlace de contraseña'}
          </button>
        </div>
      </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingPayload)}
        title="Reducir límites de licencia"
        message="Estás reduciendo los límites de licencia actuales para este inquilino. ¿Deseas proceder con los cambios?"
        confirmText="Sí, guardar cambios"
        cancelText="Cancelar"
        variant="warning"
        onCancel={() => setPendingPayload(null)}
        onConfirm={() => {
          const payload = pendingPayload;
          setPendingPayload(null);
          if (payload) executeSave(payload);
        }}
      />
    </div>
  );
}
