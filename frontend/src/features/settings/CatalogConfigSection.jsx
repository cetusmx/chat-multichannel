import { useEffect, useState } from 'react';
import { Plug, Save, FlaskConical, FileJson } from 'lucide-react';
import { getCatalogConfig, updateCatalogConfig, testCatalogConnection } from '../../services/api.js';
import { toast } from '../../stores/useToastStore.js';
import useCatalogStore from '../../stores/useCatalogStore.js';
import { Panel, Field, Input, Select, Textarea, Switch, Button, Badge, Spinner } from '../../components/ui/index.js';

const PROVIDER_LABELS = {
  none: 'Sin catálogo',
  sealmarket: 'SealMarket (ERP de sellos)',
  generic_rest: 'API REST genérica (configurable)',
};

const TEMPLATES = {
  ferreteria: {
    label: 'Ferretería (SKU + texto + familia)',
    connection: {
      auth: { type: 'bearer' },
      search: { path: '/api/products', method: 'GET', textParam: 'q', resultsPath: 'data', staticParams: { limit: 50 } },
      options: { familias: { path: '/api/families', resultsPath: 'data', valueField: 'id', labelField: 'name' } },
      customer: { path: '/api/customers/by-rfc/{taxId}', resultsPath: 'data', fields: { taxId: 'rfc', legalName: 'name', address: 'address', isActive: 'active' } },
      mapping: { sku: 'sku', name: 'name', description: 'description', price: 'price', stockTotal: 'stock', imageUrl: 'image' },
    },
    searchSchema: {
      textSearch: { enabled: true, param: 'q', label: 'Buscar', placeholder: 'SKU o descripción' },
      attributes: [{ key: 'familia', label: 'Familia', type: 'select', optionsSource: 'remote:familias', param: 'family' }],
      display: { title: '{{name}}', subtitle: '{{sku}} · {{attributes.familia}}', badges: [] },
    },
  },
  llantas: {
    label: 'Llantas (medida, construcción, temporada)',
    connection: {
      auth: { type: 'header', name: 'x-api-key' },
      search: { path: '/v1/tires', method: 'GET', textParam: 'search', resultsPath: 'items' },
      options: { marcas: { path: '/v1/brands', resultsPath: 'items', valueField: 'id', labelField: 'name' } },
      mapping: { sku: 'sku', name: 'model', price: 'price', stockTotal: 'stock', imageUrl: 'image', attributes: { ancho: 'width', perfil: 'aspect', rin: 'rim', construccion: 'construction', temporada: 'season', marca: 'brand.name' } },
    },
    searchSchema: {
      textSearch: { enabled: true, param: 'search', label: 'Buscar', placeholder: 'Medida (205/55R16) o modelo' },
      attributes: [
        { key: 'ancho', label: 'Ancho', type: 'number', unit: 'mm', param: 'width', aiHint: 'Primer número de la medida, p. ej. 205 en 205/55R16' },
        { key: 'perfil', label: 'Perfil', type: 'number', param: 'aspect', aiHint: 'Segundo número de la medida (55)' },
        { key: 'rin', label: 'Rin', type: 'number', unit: 'in', param: 'rim', required: true, aiHint: 'Número tras la R (16)' },
        { key: 'construccion', label: 'Construcción', type: 'select', options: ['Radial', 'Convencional'], param: 'construction' },
        { key: 'temporada', label: 'Temporada', type: 'select', options: ['Todo terreno', 'Verano', 'Invierno', 'Todo clima'], param: 'season' },
        { key: 'marca', label: 'Marca', type: 'select', optionsSource: 'remote:marcas', param: 'brand' },
      ],
      display: { title: '{{attributes.marca}} {{name}}', subtitle: '{{attributes.ancho}}/{{attributes.perfil}}R{{attributes.rin}}', badges: ['construccion', 'temporada'] },
    },
  },
};

const pretty = (v) => (v == null ? '' : JSON.stringify(v, null, 2));

function parseJsonField(text, label) {
  if (!text || !text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error(`${label}: JSON inválido (${e.message})`);
    err.field = label;
    throw err;
  }
}

export default function CatalogConfigSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [providers, setProviders] = useState(['none', 'sealmarket', 'generic_rest']);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [exists, setExists] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    provider: 'none', isActive: true, baseUrl: '', apiKey: '',
    connection: '', searchSchema: '', aiRules: '',
    taxRate: 16, pricesIncludeTax: false, currency: 'MXN',
    features: { customerLookup: true, csfExtraction: true, stockByLocation: false, productImages: false },
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await getCatalogConfig();
        if (res.providers) setProviders(res.providers);
        const c = res.data;
        if (c) {
          setExists(true);
          setHasApiKey(!!c.hasApiKey);
          setForm((f) => ({
            ...f,
            provider: c.provider || 'none',
            isActive: c.isActive !== false,
            baseUrl: c.baseUrl || '',
            connection: pretty(c.connection),
            searchSchema: pretty(c.searchSchema),
            aiRules: c.aiRules || '',
            taxRate: Math.round(((c.pricing?.taxRate ?? 0.16) * 100) * 100) / 100,
            pricesIncludeTax: !!c.pricing?.pricesIncludeTax,
            currency: c.pricing?.currency || 'MXN',
            features: { ...f.features, ...(c.features || {}) },
          }));
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setFeature = (key, value) => setForm((f) => ({ ...f, features: { ...f.features, [key]: value } }));

  const applyTemplate = (key) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setForm((f) => ({ ...f, provider: 'generic_rest', connection: pretty(t.connection), searchSchema: pretty(t.searchSchema) }));
    toast.info(`Plantilla "${t.label}" cargada`, { description: 'Ajusta rutas, autenticación y mapeo a la API real antes de guardar.' });
  };

  const buildPayload = () => ({
    provider: form.provider,
    isActive: form.isActive,
    baseUrl: form.baseUrl || null,
    ...(form.apiKey ? { apiKey: form.apiKey } : {}),
    connection: form.provider === 'none' ? {} : (parseJsonField(form.connection, 'Conexión') ?? {}),
    searchSchema: form.provider === 'none' ? null : (parseJsonField(form.searchSchema, 'Esquema de búsqueda') ?? null),
    pricing: { taxRate: Number(form.taxRate) / 100, pricesIncludeTax: form.pricesIncludeTax, currency: form.currency || 'MXN' },
    features: form.features,
    aiRules: form.aiRules || null,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const saved = await updateCatalogConfig(buildPayload());
      setExists(true);
      setHasApiKey(!!saved.hasApiKey);
      set('apiKey', '');
      await useCatalogStore.getState().load({ force: true });
      toast.success('Catálogo guardado', { description: 'Los cambios aplican a la bandeja y al asistente IA.' });
    } catch (err) {
      setError(err.message);
      toast.error('No se pudo guardar', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testCatalogConnection();
      if (result.ok) toast.success('Conexión correcta', { description: result.message });
      else toast.error('La conexión falló', { description: result.message });
    } catch (err) {
      toast.error('No se pudo probar la conexión', { description: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const isGeneric = form.provider === 'generic_rest';
  const hasCatalog = form.provider !== 'none';

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Panel
        eyebrow="Integración"
        title="Catálogo de productos"
        description="Conecta el ERP o API de productos del negocio. El esquema define qué puede buscar el equipo y qué parámetros pide el asistente IA."
        actions={
          <div className="flex items-center gap-2">
            {exists ? <Badge tone={form.isActive && hasCatalog ? 'success' : 'neutral'} dot>{form.isActive && hasCatalog ? 'Activo' : 'Inactivo'}</Badge> : <Badge tone="warning">Sin configurar</Badge>}
            {hasApiKey && <Badge tone="info">Clave guardada</Badge>}
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Proveedor" hint="Define cómo se traducen las búsquedas a la API del negocio.">
            {(p) => (
              <Select {...p} value={form.provider} onChange={(e) => set('provider', e.target.value)}>
                {providers.map((id) => <option key={id} value={id}>{PROVIDER_LABELS[id] || id}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Estado">
            {() => <div className="flex h-9 items-center"><Switch checked={form.isActive} onChange={(v) => set('isActive', v)} label={form.isActive ? 'Catálogo activo' : 'Catálogo desactivado'} /></div>}
          </Field>
          {hasCatalog && (
            <>
              <Field label="URL base de la API" required>
                {(p) => <Input {...p} mono value={form.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} placeholder="https://api.negocio.mx" />}
              </Field>
              <Field label="API key" hint={hasApiKey ? 'Déjalo vacío para conservar la clave actual.' : 'Se guarda cifrada.'}>
                {(p) => <Input {...p} type="password" mono value={form.apiKey} onChange={(e) => set('apiKey', e.target.value)} placeholder={hasApiKey ? '••••••••' : 'Clave o token'} autoComplete="new-password" />}
              </Field>
            </>
          )}
        </div>
      </Panel>

      {hasCatalog && (
        <>
          {isGeneric && (
            <Panel
              eyebrow="Conexión"
              title="Mapeo de la API"
              description="Autenticación, endpoints, dónde están los resultados y cómo se traducen los campos de la API a producto (sku, name, price, stock…)."
              actions={
                <Select size="sm" value="" onChange={(e) => { applyTemplate(e.target.value); e.target.value = ''; }} aria-label="Cargar plantilla">
                  <option value="">Cargar plantilla…</option>
                  {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                </Select>
              }
            >
              <Field label="connection (JSON)" hint="auth, search.path, search.resultsPath, mapping, options, customer, test.">
                {(p) => <Textarea {...p} value={form.connection} onChange={(e) => set('connection', e.target.value)} rows={14} className="font-mono text-xs" spellCheck={false} />}
              </Field>
            </Panel>
          )}

          <Panel
            eyebrow="Búsqueda"
            title="Esquema de búsqueda"
            description="Atributos por los que se buscan productos. Genera el formulario del carrito, los parámetros de la herramienta de IA y las instrucciones al agente. Vacío = usar el esquema por defecto del proveedor."
          >
            <Field label="searchSchema (JSON)" hint="textSearch, attributes[{ key, label, type: text|number|select|boolean|range, required, unit, options|optionsSource, aiHint }], display.">
              {(p) => <Textarea {...p} value={form.searchSchema} onChange={(e) => set('searchSchema', e.target.value)} rows={16} className="font-mono text-xs" spellCheck={false} />}
            </Field>
          </Panel>

          <Panel eyebrow="Precios" title="Impuestos y moneda" description="Cómo entrega los precios la API y cómo deben mostrarse al cliente.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="IVA (%)">
                {(p) => <Input {...p} mono type="number" step="0.01" min="0" value={form.taxRate} onChange={(e) => set('taxRate', e.target.value)} />}
              </Field>
              <Field label="Moneda">
                {(p) => <Input {...p} mono value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} maxLength={3} />}
              </Field>
              <Field label="Precios de la API">
                {() => <div className="flex h-9 items-center"><Switch checked={form.pricesIncludeTax} onChange={(v) => set('pricesIncludeTax', v)} label={form.pricesIncludeTax ? 'Ya incluyen IVA' : 'Sin IVA (se agrega)'} /></div>}
              </Field>
            </div>
          </Panel>

          <Panel eyebrow="Capacidades" title="Funciones disponibles" description="Activa solo lo que la API del negocio soporta. Las herramientas del asistente se declaran según esto.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Switch checked={form.features.customerLookup} onChange={(v) => setFeature('customerLookup', v)} label="Consulta de clientes por RFC" />
              <Switch checked={form.features.csfExtraction} onChange={(v) => setFeature('csfExtraction', v)} label="Lectura de Constancia de Situación Fiscal" />
              <Switch checked={form.features.stockByLocation} onChange={(v) => setFeature('stockByLocation', v)} label="Existencias por sucursal" />
              <Switch checked={form.features.productImages} onChange={(v) => setFeature('productImages', v)} label="Imágenes de producto" />
            </div>
          </Panel>

          <Panel
            eyebrow="Asistente IA"
            title="Reglas del catálogo para el agente"
            description="Conocimiento de dominio que el agente necesita siempre (no depende de la base de conocimiento): cómo interpretar medidas, qué dimensiones aplican a cada familia, cómo tratar existencias."
          >
            <Field label="Reglas" hint="Una regla por línea. Se inyectan en cada turno del agente.">
              {(p) => <Textarea {...p} value={form.aiRules} onChange={(e) => set('aiRules', e.target.value)} rows={8} placeholder="1. EXISTENCIAS: suma el total y no menciones sucursales salvo que el cliente pregunte…" />}
            </Field>
          </Panel>
        </>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        {hasCatalog && exists && (
          <Button type="button" variant="secondary" icon={FlaskConical} loading={testing} onClick={handleTest}>Probar conexión</Button>
        )}
        <Button type="submit" variant="primary" icon={Save} loading={saving}>Guardar</Button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-fg-subtle"><FileJson size={12} /> Los campos JSON se validan al guardar. <Plug size={12} className="ml-2" /> "Probar conexión" usa la configuración ya guardada.</p>
    </form>
  );
}
