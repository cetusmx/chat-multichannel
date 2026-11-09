const BaseCatalogProvider = require('./base.provider');
const { makeProduct } = require('../product');

/**
 * Configurable REST adapter. Everything is data in `connection`:
 *
 * connection: {
 *   auth: { type: 'header' | 'bearer' | 'query' | 'none', name: 'x-api-key' },
 *   search: {
 *     path: '/products/search',          // relative to baseUrl
 *     method: 'GET',                      // GET (query string) | POST (JSON body)
 *     textParam: 'q',                     // where free text goes (default: schema.textSearch.param)
 *     staticParams: { limit: 50 },        // always sent
 *     resultsPath: 'data.items',          // dot path to the array in the response
 *     extraHeaders: { Accept: 'application/json' }
 *   },
 *   options: { families: { path: '/families', resultsPath: 'data', valueField: 'id', labelField: 'name' } },
 *   customer: { path: '/customers/by-rfc/{taxId}', resultsPath: 'data', fields: { taxId: 'rfc', legalName: 'name', address: 'address', isActive: 'active' } },
 *   mapping: {                             // response record -> Product fields (dot paths allowed)
 *     sku: 'sku', name: 'title', description: 'description', price: 'price',
 *     stockTotal: 'stock', stockByLocation: 'stock_by_branch', imageUrl: 'image',
 *     unit: 'unit', packSize: 'pack_size',
 *     attributes: { rin: 'specs.rim', ancho: 'specs.width' }   // or omit to copy all schema keys by name
 *   },
 *   test: { path: '/health' }
 * }
 */
class GenericRestProvider extends BaseCatalogProvider {
  static get name() {
    return 'generic_rest';
  }

  get capabilities() {
    return { ...super.capabilities, customerLookup: !!this.connection.customer?.path, productImages: !!this.connection.mapping?.imageUrl, stockByLocation: !!this.connection.mapping?.stockByLocation };
  }

  buildHeaders(extra = {}) {
    const auth = this.connection.auth || { type: 'header', name: 'x-api-key' };
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json', ...extra };
    if (this.apiKey) {
      if (auth.type === 'bearer') headers.Authorization = `Bearer ${this.apiKey}`;
      else if (auth.type === 'header' || !auth.type) headers[auth.name || 'x-api-key'] = this.apiKey;
    }
    return headers;
  }

  withAuthQuery(sp) {
    const auth = this.connection.auth || {};
    if (auth.type === 'query' && this.apiKey) sp.set(auth.name || 'api_key', this.apiKey);
    return sp;
  }

  async search(params, { limit = 50 } = {}) {
    const cfg = this.connection.search || {};
    if (!cfg.path) throw configError('connection.search.path');

    const query = { ...(cfg.staticParams || {}) };
    if (params.text) query[cfg.textParam || this.schema.textSearch.param] = params.text;
    for (const attr of this.schema.attributes) {
      const v = params[attr.key];
      if (v == null || v === '') continue;
      if (attr.type === 'range' && typeof v === 'object') {
        query[`${attr.param}_min`] = v.min;
        query[`${attr.param}_max`] = v.max;
      } else {
        query[attr.param] = v;
      }
    }

    const method = (cfg.method || 'GET').toUpperCase();
    let data;
    if (method === 'POST') {
      const sp = this.withAuthQuery(new URLSearchParams());
      data = await this.request(`${this.baseUrl}${cfg.path}${sp.toString() ? `?${sp}` : ''}`, {
        method, headers: this.buildHeaders(cfg.extraHeaders), body: JSON.stringify(query),
      });
    } else {
      const sp = this.withAuthQuery(new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])));
      data = await this.request(`${this.baseUrl}${cfg.path}?${sp}`, { headers: this.buildHeaders(cfg.extraHeaders) });
    }

    const list = pick(data, cfg.resultsPath);
    const records = Array.isArray(list) ? list : Array.isArray(data) ? data : [];
    return records.slice(0, limit).map((r) => this.toProduct(r));
  }

  toProduct(record) {
    const m = this.connection.mapping || {};
    const attributes = {};
    if (m.attributes && typeof m.attributes === 'object') {
      for (const [key, path] of Object.entries(m.attributes)) attributes[key] = pick(record, path);
    } else {
      for (const a of this.schema.attributes) if (record[a.key] != null) attributes[a.key] = record[a.key];
    }
    const byLocation = m.stockByLocation ? pick(record, m.stockByLocation) : null;
    const total = m.stockTotal ? Number(pick(record, m.stockTotal)) : null;
    return makeProduct({
      sku: pick(record, m.sku || 'sku'),
      name: pick(record, m.name || 'name'),
      description: pick(record, m.description || 'description'),
      price: pick(record, m.price || 'price'),
      stock: byLocation || total != null ? { total: isFinite(total) ? total : undefined, byLocation: byLocation || null } : null,
      imageUrl: m.imageUrl ? pick(record, m.imageUrl) : null,
      unit: m.unit ? pick(record, m.unit) : null,
      packSize: m.packSize ? pick(record, m.packSize) : null,
      attributes,
      raw: record,
    }, this.pricing);
  }

  async getOptions(sourceName) {
    const cfg = this.connection.options?.[sourceName];
    if (!cfg?.path) return [];
    const sp = this.withAuthQuery(new URLSearchParams());
    const data = await this.request(`${this.baseUrl}${cfg.path}${sp.toString() ? `?${sp}` : ''}`, { headers: this.buildHeaders() });
    const list = pick(data, cfg.resultsPath) ?? data;
    if (!Array.isArray(list)) return [];
    return list.map((o) => {
      if (o && typeof o === 'object') {
        const value = pick(o, cfg.valueField || 'value') ?? pick(o, cfg.labelField || 'label');
        const label = pick(o, cfg.labelField || 'label') ?? value;
        return value != null ? { value: String(value), label: String(label) } : null;
      }
      return { value: String(o), label: String(o) };
    }).filter(Boolean);
  }

  async lookupCustomer(taxId) {
    const cfg = this.connection.customer;
    if (!cfg?.path) return null;
    const rfc = String(taxId || '').trim().toUpperCase();
    if (!rfc) return null;
    const path = cfg.path.includes('{taxId}') ? cfg.path.replace('{taxId}', encodeURIComponent(rfc)) : cfg.path;
    const sp = this.withAuthQuery(new URLSearchParams(cfg.path.includes('{taxId}') ? {} : { [cfg.param || 'rfc']: rfc }));
    let data;
    try {
      data = await this.request(`${this.baseUrl}${path}${sp.toString() ? `?${sp}` : ''}`, { headers: this.buildHeaders() });
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
    let rec = pick(data, cfg.resultsPath) ?? data;
    if (Array.isArray(rec)) rec = rec[0];
    if (!rec || typeof rec !== 'object') return null;
    const f = cfg.fields || {};
    const active = f.isActive ? pick(rec, f.isActive) : true;
    return {
      taxId: String(pick(rec, f.taxId || 'rfc') || rfc),
      legalName: String(pick(rec, f.legalName || 'name') || ''),
      address: String(pick(rec, f.address || 'address') || ''),
      isActive: active === true || active === 'A' || active === 1 || active === 'true' || active === 'active',
      raw: rec,
    };
  }

  async testConnection() {
    const path = this.connection.test?.path || this.connection.search?.path;
    if (!path) return { ok: false, message: 'Falta connection.search.path' };
    try {
      const sp = this.withAuthQuery(new URLSearchParams(this.connection.test?.params || {}));
      await this.request(`${this.baseUrl}${path}${sp.toString() ? `?${sp}` : ''}`, { headers: this.buildHeaders(), timeoutMs: 8000 });
      return { ok: true, message: 'Conexión correcta' };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }
}

/** Dot-path getter: pick({a:{b:[1]}}, 'a.b.0') -> 1 */
function pick(obj, path) {
  if (obj == null || path == null || path === '') return obj == null ? undefined : path === '' ? obj : undefined;
  return String(path).split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function configError(field) {
  const err = new Error(`Configuración de catálogo incompleta: falta ${field}`);
  err.status = 503;
  err.code = 'CATALOG_MISCONFIGURED';
  return err;
}

module.exports = GenericRestProvider;
