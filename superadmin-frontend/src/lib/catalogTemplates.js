// Shared between TenantCatalogConfig and CreateTenantModal. Mirrors the tenant-admin
// reference (frontend/src/features/settings/CatalogConfigSection.jsx) so both portals
// offer the same starting points.

export const PROVIDER_LABELS = {
  none: 'Sin catálogo',
  sealmarket: 'SealMarket (ERP de sellos)',
  generic_rest: 'API REST genérica (configurable)',
};

export const DEFAULT_PROVIDERS = ['none', 'sealmarket', 'generic_rest'];

export const DEFAULT_FEATURES = { customerLookup: true, csfExtraction: true, stockByLocation: false, productImages: false };

export const FEATURE_LABELS = {
  customerLookup: 'Consulta de clientes por RFC',
  csfExtraction: 'Lectura de Constancia de Situación Fiscal',
  stockByLocation: 'Existencias por sucursal',
  productImages: 'Imágenes de producto',
};

export const TEMPLATES = {
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

export const pretty = (v) => (v == null ? '' : JSON.stringify(v, null, 2));

/** Parses a JSON textarea; empty → undefined. Throws an Error with a user-facing message on invalid JSON. */
export function parseJsonField(text, label) {
  if (!text || !text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error(`${label}: JSON inválido (${e.message})`);
    err.field = label;
    throw err;
  }
}
