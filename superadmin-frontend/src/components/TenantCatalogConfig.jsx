import { useEffect, useState, useCallback } from 'react';
import { Database, Save, FlaskConical, Loader2, FileJson, Plug, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { getTenantCatalogConfig, updateTenantCatalogConfig, testTenantCatalogConnection } from '../services/api';
import { Alert } from './ui/Alert';
import ConfirmModal from './ui/ConfirmModal';
import {
  PROVIDER_LABELS, DEFAULT_PROVIDERS, DEFAULT_FEATURES, FEATURE_LABELS, TEMPLATES, pretty, parseJsonField,
} from '../lib/catalogTemplates';

const inputCls = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50';
const textareaCls = `${inputCls} font-mono text-xs leading-relaxed`;
const labelCls = 'text-sm font-medium text-slate-300';
const hintCls = 'text-xs text-slate-500';
const checkboxCls = 'rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-950';

const INITIAL_FORM = {
  provider: 'none', isActive: true, baseUrl: '', apiKey: '',
  connection: '', searchSchema: '', aiRules: '',
  taxRate: 16, pricesIncludeTax: false, currency: 'MXN',
  features: { ...DEFAULT_FEATURES },
};

function Panel({ icon: Icon, title, description, actions, children }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2 text-white">
            {Icon && <Icon className="text-blue-400" size={20} />}
            {title}
          </h3>
          {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
      <input type="checkbox" className={checkboxCls} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function TenantCatalogConfig({ tenantId }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [exists, setExists] = useState(false);
  const [wasActive, setWasActive] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [formError, setFormError] = useState(null);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await getTenantCatalogConfig(tenantId);
      if (res.providers.length) setProviders(res.providers);
      const c = res.data;
      if (c) {
        const active = c.isActive !== false && (c.provider || 'none') !== 'none';
        setExists(true);
        setWasActive(active);
        setHasApiKey(!!c.hasApiKey);
        setForm((f) => ({
          ...f,
          provider: c.provider || 'none',
          isActive: c.isActive !== false,
          baseUrl: c.baseUrl || '',
          apiKey: '',
          connection: pretty(c.connection),
          searchSchema: pretty(c.searchSchema),
          aiRules: c.aiRules || '',
          taxRate: Math.round(((c.pricing?.taxRate ?? 0.16) * 100) * 100) / 100,
          pricesIncludeTax: !!c.pricing?.pricesIncludeTax,
          currency: c.pricing?.currency || 'MXN',
          features: { ...DEFAULT_FEATURES, ...(c.features || {}) },
        }));
      } else {
        setExists(false);
        setWasActive(false);
        setHasApiKey(false);
        setForm(INITIAL_FORM);
      }
    } catch (err) {
      setLoadError(err.message || 'No se pudo cargar la configuración del catálogo');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setFeature = (key, value) => setForm((f) => ({ ...f, features: { ...f.features, [key]: value } }));

  const applyTemplate = (key) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setForm((f) => ({ ...f, provider: 'generic_rest', connection: pretty(t.connection), searchSchema: pretty(t.searchSchema) }));
    toast.info(`Plantilla "${t.label}" cargada. Ajusta rutas, autenticación y mapeo a la API real antes de guardar.`);
  };

  const buildPayload = () => {
    const isNone = form.provider === 'none';
    const taxRate = Number(form.taxRate);
    if (!isNone && !form.baseUrl.trim()) {
      const err = new Error('URL base de la API: es obligatoria cuando hay un proveedor seleccionado');
      throw err;
    }
    if (Number.isNaN(taxRate) || taxRate < 0) throw new Error('IVA (%): debe ser un número mayor o igual a 0');
    return {
      provider: form.provider,
      isActive: form.isActive,
      baseUrl: form.baseUrl.trim() || null,
      ...(form.apiKey ? { apiKey: form.apiKey } : {}),
      connection: isNone ? {} : (parseJsonField(form.connection, 'Conexión (connection)') ?? {}),
      searchSchema: isNone ? null : (parseJsonField(form.searchSchema, 'Esquema de búsqueda (searchSchema)') ?? null),
      pricing: { taxRate: taxRate / 100, pricesIncludeTax: form.pricesIncludeTax, currency: (form.currency || 'MXN').toUpperCase() },
      features: form.features,
      aiRules: form.aiRules.trim() || null,
    };
  };

  const executeSave = async (payload) => {
    setSaving(true);
    setFormError(null);
    try {
      const saved = await updateTenantCatalogConfig(tenantId, payload);
      setExists(true);
      setHasApiKey(!!saved?.hasApiKey);
      setWasActive(payload.isActive && payload.provider !== 'none');
      set('apiKey', '');
      toast.success('Catálogo del inquilino guardado');
    } catch (err) {
      const msg = err.message || 'No se pudo guardar la configuración del catálogo';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      setFormError(err.message);
      return;
    }
    const turningOff = wasActive && (payload.provider === 'none' || !payload.isActive);
    if (turningOff) {
      setPendingPayload(payload);
      return;
    }
    await executeSave(payload);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testTenantCatalogConnection(tenantId);
      if (result.ok) toast.success(result.message || 'Conexión correcta');
      else toast.error(result.message || 'La conexión falló');
    } catch (err) {
      toast.error(err.message || 'No se pudo probar la conexión');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex justify-center">
        <Loader2 className="animate-spin text-blue-400" size={24} />
      </div>
    );
  }

  if (loadError) {
    return <Alert onRetry={load}>{loadError}</Alert>;
  }

  const isGeneric = form.provider === 'generic_rest';
  const hasCatalog = form.provider !== 'none';
  const statusActive = exists && form.isActive && hasCatalog;
  const disabled = saving;

  return (
    <form onSubmit={handleSave} className="space-y-6" noValidate>
      <Panel
        icon={Database}
        title="Catálogo de productos"
        description="Conecta el ERP o API de productos del inquilino. El esquema define qué puede buscar su equipo y qué parámetros pide el asistente IA."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              !exists ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : statusActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>
              {!exists ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
              {!exists ? 'Sin configurar' : statusActive ? 'Activo' : 'Inactivo'}
            </span>
            {hasApiKey && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-400 border-blue-500/20">
                <KeyRound size={14} /> Clave guardada
              </span>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="catalog-provider" className={labelCls}>Proveedor</label>
            <select id="catalog-provider" value={form.provider} disabled={disabled} onChange={(e) => set('provider', e.target.value)} className={inputCls}>
              {providers.map((id) => <option key={id} value={id}>{PROVIDER_LABELS[id] || id}</option>)}
            </select>
            <p className={hintCls}>Define cómo se traducen las búsquedas a la API del negocio.</p>
          </div>

          <div className="space-y-2">
            <span className={labelCls}>Estado</span>
            <div className="h-[42px] flex items-center">
              <Toggle checked={form.isActive} disabled={disabled} onChange={(v) => set('isActive', v)} label={form.isActive ? 'Catálogo activo' : 'Catálogo desactivado'} />
            </div>
          </div>

          {hasCatalog && (
            <>
              <div className="space-y-2">
                <label htmlFor="catalog-baseUrl" className={labelCls}>URL base de la API *</label>
                <input id="catalog-baseUrl" type="url" value={form.baseUrl} disabled={disabled} onChange={(e) => set('baseUrl', e.target.value)} placeholder="https://api.negocio.mx" className={`${inputCls} font-mono`} />
              </div>
              <div className="space-y-2">
                <label htmlFor="catalog-apiKey" className={labelCls}>API key</label>
                <input id="catalog-apiKey" type="password" value={form.apiKey} disabled={disabled} onChange={(e) => set('apiKey', e.target.value)} placeholder={hasApiKey ? '••••••••' : 'Clave o token'} autoComplete="new-password" className={`${inputCls} font-mono`} />
                <p className={hintCls}>{hasApiKey ? 'Déjalo vacío para conservar la clave actual.' : 'Se guarda cifrada.'}</p>
              </div>
            </>
          )}
        </div>
      </Panel>

      {hasCatalog && (
        <>
          {isGeneric && (
            <Panel
              icon={Plug}
              title="Mapeo de la API"
              description="Autenticación, endpoints, dónde están los resultados y cómo se traducen los campos de la API a producto (sku, name, price, stock…)."
              actions={
                <select
                  value=""
                  disabled={disabled}
                  aria-label="Cargar plantilla"
                  onChange={(e) => { applyTemplate(e.target.value); e.target.value = ''; }}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Cargar plantilla…</option>
                  {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                </select>
              }
            >
              <div className="space-y-2">
                <label htmlFor="catalog-connection" className={labelCls}>connection (JSON)</label>
                <textarea id="catalog-connection" rows={14} spellCheck={false} value={form.connection} disabled={disabled} onChange={(e) => set('connection', e.target.value)} className={textareaCls} />
                <p className={hintCls}>auth, search.path, search.resultsPath, mapping, options, customer, test.</p>
              </div>
            </Panel>
          )}

          <Panel
            icon={FileJson}
            title="Esquema de búsqueda"
            description="Atributos por los que se buscan productos. Genera el formulario del carrito, los parámetros de la herramienta de IA y las instrucciones al agente. Vacío = usar el esquema por defecto del proveedor."
          >
            <div className="space-y-2">
              <label htmlFor="catalog-searchSchema" className={labelCls}>searchSchema (JSON)</label>
              <textarea id="catalog-searchSchema" rows={16} spellCheck={false} value={form.searchSchema} disabled={disabled} onChange={(e) => set('searchSchema', e.target.value)} className={textareaCls} />
              <p className={hintCls}>textSearch, attributes[{'{'} key, label, type: text|number|select|boolean|range, required, unit, options|optionsSource, aiHint {'}'}], display.</p>
            </div>
          </Panel>

          <Panel title="Impuestos y moneda" description="Cómo entrega los precios la API y cómo deben mostrarse al cliente.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="catalog-taxRate" className={labelCls}>IVA (%)</label>
                <input id="catalog-taxRate" type="number" step="0.01" min="0" value={form.taxRate} disabled={disabled} onChange={(e) => set('taxRate', e.target.value)} className={`${inputCls} font-mono`} />
              </div>
              <div className="space-y-2">
                <label htmlFor="catalog-currency" className={labelCls}>Moneda</label>
                <input id="catalog-currency" type="text" maxLength={3} value={form.currency} disabled={disabled} onChange={(e) => set('currency', e.target.value.toUpperCase())} className={`${inputCls} font-mono uppercase`} />
              </div>
              <div className="space-y-2">
                <span className={labelCls}>Precios de la API</span>
                <div className="h-[42px] flex items-center">
                  <Toggle checked={form.pricesIncludeTax} disabled={disabled} onChange={(v) => set('pricesIncludeTax', v)} label={form.pricesIncludeTax ? 'Ya incluyen IVA' : 'Sin IVA (se agrega)'} />
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Funciones disponibles" description="Activa solo lo que la API del negocio soporta. Las herramientas del asistente se declaran según esto.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <Toggle key={key} checked={!!form.features[key]} disabled={disabled} onChange={(v) => setFeature(key, v)} label={label} />
              ))}
            </div>
          </Panel>

          <Panel
            title="Reglas del catálogo para el agente IA"
            description="Conocimiento de dominio que el agente necesita siempre: cómo interpretar medidas, qué dimensiones aplican a cada familia, cómo tratar existencias."
          >
            <div className="space-y-2">
              <label htmlFor="catalog-aiRules" className={labelCls}>Reglas</label>
              <textarea id="catalog-aiRules" rows={8} value={form.aiRules} disabled={disabled} onChange={(e) => set('aiRules', e.target.value)} placeholder="1. EXISTENCIAS: suma el total y no menciones sucursales salvo que el cliente pregunte…" className={inputCls} />
              <p className={hintCls}>Una regla por línea. Se inyectan en cada turno del agente.</p>
            </div>
          </Panel>
        </>
      )}

      {formError && (
        <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{formError}</p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <FileJson size={12} /> Los campos JSON se validan al guardar.
          <Plug size={12} className="ml-2" /> "Probar conexión" usa la configuración ya guardada.
        </p>
        <div className="flex items-center justify-end gap-3">
          {hasCatalog && exists && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
              {testing ? 'Probando...' : 'Probar conexión'}
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Guardando...' : 'Guardar catálogo'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingPayload)}
        title="Desactivar catálogo del inquilino"
        message="El catálogo está activo. Al desactivarlo o quitar el proveedor, la bandeja y el asistente IA del inquilino dejarán de buscar productos. ¿Deseas continuar?"
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
    </form>
  );
}
