/**
 * Contract every catalog provider implements. Methods not supported by a
 * given ERP keep the default behaviour (empty results / null) so callers
 * never need provider-specific branches; capabilities are declared through
 * `features` so tools and UI can be hidden when a feature is unavailable.
 */
class BaseCatalogProvider {
  /**
   * @param {object} ctx
   * @param {string} ctx.tenantId
   * @param {string|null} ctx.baseUrl
   * @param {string|null} ctx.apiKey   decrypted
   * @param {object} ctx.connection    adapter-specific settings
   * @param {object} ctx.schema        normalized search schema
   * @param {object} ctx.pricing       normalized pricing
   * @param {object} ctx.features
   */
  constructor(ctx) {
    this.tenantId = ctx.tenantId;
    this.baseUrl = (ctx.baseUrl || '').replace(/\/+$/, '');
    this.apiKey = ctx.apiKey || null;
    this.connection = ctx.connection || {};
    this.schema = ctx.schema;
    this.pricing = ctx.pricing;
    this.features = ctx.features || {};
  }

  static get name() {
    return 'base';
  }

  /** Capabilities exposed to the AI and the UI. Providers may override. */
  get capabilities() {
    return {
      textSearch: this.schema.textSearch.enabled,
      attributeSearch: this.schema.attributes.length > 0,
      customerLookup: !!this.features.customerLookup,
      csfExtraction: !!this.features.csfExtraction,
      stockByLocation: !!this.features.stockByLocation,
      productImages: !!this.features.productImages,
    };
  }

  /**
   * Searches products. `params` is already coerced by schema.coerceParams:
   * { text?, <attributeKey>: value, ... }. Returns Product[] (see product.js).
   */
  async search(params, options = {}) { // eslint-disable-line no-unused-vars
    return [];
  }

  /** Options for a select attribute with optionsSource 'remote:<name>'. Returns [{ value, label }]. */
  async getOptions(sourceName) { // eslint-disable-line no-unused-vars
    return [];
  }

  /**
   * Looks up a customer by tax id (RFC). Returns
   * { taxId, legalName, address, isActive, raw } or null when not found.
   */
  async lookupCustomer(taxId) { // eslint-disable-line no-unused-vars
    return null;
  }

  /** Lightweight connectivity probe used by the admin UI. */
  async testConnection() {
    return { ok: true, message: 'Proveedor sin verificación de conexión' };
  }

  /** Shared HTTP helper with timeout and consistent errors. */
  async request(url, { method = 'GET', headers = {}, body, timeoutMs = 15000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, headers, body, signal: controller.signal });
      if (!res.ok) {
        const err = new Error(`El catálogo devolvió ${res.status} ${res.statusText}`);
        err.status = res.status >= 500 ? 502 : res.status;
        err.code = 'CATALOG_UPSTREAM_ERROR';
        throw err;
      }
      const ct = res.headers.get('content-type') || '';
      return ct.includes('application/json') ? res.json() : res.text();
    } catch (e) {
      if (e.name === 'AbortError') {
        const err = new Error('El catálogo no respondió a tiempo');
        err.status = 504;
        err.code = 'CATALOG_TIMEOUT';
        throw err;
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = BaseCatalogProvider;
