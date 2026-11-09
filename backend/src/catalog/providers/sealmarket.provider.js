const BaseCatalogProvider = require('./base.provider');
const { makeProduct } = require('../product');

/**
 * SealMarket ERP adapter (sellos hidráulicos). Encapsulates everything that
 * used to live in sealmarket.routes.js and the AI tool handlers:
 * parametric search on /clavesalternas/filter-v2, families, customer lookup
 * by RFC, "dead item" filtering and stock-first ranking.
 */
class SealMarketProvider extends BaseCatalogProvider {
  static get name() {
    return 'sealmarket';
  }

  get capabilities() {
    return { ...super.capabilities, customerLookup: true, csfExtraction: true, stockByLocation: true, productImages: true };
  }

  headers() {
    return { 'Content-Type': 'application/json', 'x-api-key': this.apiKey || '' };
  }

  async search(params, { limit = 50, textParamCandidates } = {}) {
    const query = {};
    for (const attr of this.schema.attributes) {
      const v = params[attr.key];
      if (v != null && v !== '') query[attr.param] = typeof v === 'object' ? v.min : v;
    }

    let raw;
    if (params.text && Object.keys(query).length === 0) {
      raw = await this.searchByText(params.text, textParamCandidates);
    } else {
      if (params.text) query.q = params.text;
      raw = await this.fetchFilter(query);
    }
    return this.rank(raw).slice(0, limit).map((r) => this.toProduct(r));
  }

  async fetchFilter(query) {
    const sp = new URLSearchParams(query);
    sp.set('limit', '100');
    const data = await this.request(`${this.baseUrl}/api/clavesalternas/filter-v2?${sp}`, { headers: this.headers() });
    return Array.isArray(data?.data) ? data.data : [];
  }

  /** The ERP has no documented text endpoint; try parameter aliases and filter locally by tokens. */
  async searchByText(text, candidates) {
    const names = candidates || (this.connection.textParams || process.env.CATALOG_TEXT_PARAMS || 'clave,q,descripcion,search').split(',').map((s) => s.trim()).filter(Boolean);
    const tokens = normalize(text).split(/[\s,;]+/).filter(Boolean);
    for (const name of names) {
      try {
        const raw = await this.fetchFilter({ [name]: text });
        const matched = raw.filter((item) => {
          const hay = normalize([item.CVE_ART, item.DESC_ECOMM, item.DESCR, item.NOMBRE, item.LIN_PROD, ...(item.claves_alternas || [])].filter(Boolean).join(' '));
          return tokens.every((t) => hay.includes(t));
        });
        if (matched.length) return matched;
      } catch (err) {
        if (err.status && ![400, 404, 422].includes(err.status)) throw err;
      }
    }
    return [];
  }

  /** Drop dead items (no price, no stock, never purchased) and prefer items in stock. */
  rank(results) {
    if (!Array.isArray(results) || results.length === 0) return [];
    let out = results.filter((item) => {
      const total = sumStock(item.existencias);
      const isDead = (!item.PRECIO || item.PRECIO === 0) && total === 0 && !item.FCH_ULTCOM;
      return !isDead;
    });
    if (out.length > 1) {
      const inStock = out.filter((item) => sumStock(item.existencias) > 0);
      out = inStock.length > 0 ? inStock : out.filter((item) => item.FCH_ULTCOM);
    }
    return out;
  }

  toProduct(item) {
    const imageBase = this.connection.imageBaseUrl || 'https://sistemahidraulico.mx/Perfiles';
    return makeProduct({
      sku: item.CVE_ART,
      name: item.DESC_ECOMM || item.DESCR || item.NOMBRE,
      description: item.DESCR || item.DESC_ECOMM || '',
      price: item.PRECIO,
      stock: item.existencias ? { byLocation: item.existencias } : null,
      imageUrl: item.LIN_PROD ? `${imageBase}/${item.LIN_PROD}.jpg` : null,
      attributes: {
        familia: item.FAMILIA || item.familia || null,
        linea: item.LIN_PROD || null,
        lastPurchase: item.FCH_ULTCOM || null,
      },
      raw: item,
    }, this.pricing);
  }

  async getOptions(sourceName) {
    if (sourceName !== 'families') return [];
    const data = await this.request(`${this.baseUrl}/familias`, { headers: this.headers() });
    const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return list.map((f) => (typeof f === 'string' ? f : f.FAMILIA)).filter(Boolean).map((v) => ({ value: v, label: v }));
  }

  async lookupCustomer(taxId) {
    const rfc = String(taxId || '').trim().toUpperCase();
    if (!rfc) return null;
    let data;
    try {
      data = await this.request(`${this.baseUrl}/api/clientes/rfc/${encodeURIComponent(rfc)}`, { headers: this.headers() });
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
    const c = data?.data?.[0];
    if (!c) return null;
    const address = [c.CALLE, c.NUMEXT, c.COLONIA ? `Col. ${c.COLONIA}` : '', c.CODIGO ? `C.P. ${c.CODIGO}` : '', c.MUNICIPIO, c.ESTADO]
      .filter(Boolean).join(', ').replace(/\s+,/g, ',');
    return { taxId: c.RFC || rfc, legalName: c.NOMBRE || '', address, isActive: c.STATUS === 'A', raw: c };
  }

  async testConnection() {
    try {
      const families = await this.getOptions('families');
      return { ok: true, message: `Conexión correcta · ${families.length} familias` };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }
}

function sumStock(existencias) {
  return Object.values(existencias || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

function normalize(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Search schema seeded for the SealMarket tenant; mirrors the previous hardcoded form. */
SealMarketProvider.defaultSchema = {
  textSearch: { enabled: true, param: 'q', label: 'Buscar', placeholder: 'Clave o descripción' },
  attributes: [
    { key: 'familia', label: 'Familia', type: 'select', optionsSource: 'remote:families', required: true, aiHint: 'Nombre EXACTO de la familia tal como aparece en el contexto; nunca inventes familias' },
    { key: 'sist_med', label: 'Sistema de medida', type: 'select', options: [{ value: 'std', label: 'Pulgadas (STD)' }, { value: 'mm', label: 'Milímetros (mm)' }], defaultValue: 'std', aiHint: 'Si el cliente da fracciones (ej. 1 5/16) es std; si dice mm, usa mm para todas las medidas' },
    { key: 'diam_int', label: 'Diámetro interior', type: 'number', aiHint: 'Convierte fracciones a decimal en milésimas (1 5/16 → 1.312)' },
    { key: 'diam_ext', label: 'Diámetro exterior', type: 'number' },
    { key: 'altura', label: 'Altura', type: 'number', aiHint: 'No aplica a ORINGS ni RESPALDOS' },
    { key: 'seccion', label: 'Sección', type: 'number', aiHint: 'Espesor; aplica p. ej. a SELLOS DE PISTON y LIMPIADORES (ej. 0.250)' },
    { key: 'perfil', label: 'Perfil', type: 'text', aiHint: 'Código de perfil del sello si el cliente lo conoce (ej. PTB, K501)' },
    { key: 'lista_precios', label: 'Lista de precios', type: 'text', aiHint: 'NO lo envíes salvo que el cliente especifique una lista de precios particular' },
  ],
  display: { title: '{{name}}', subtitle: '{{sku}} · {{attributes.familia}}', badges: [] },
};

SealMarketProvider.defaultAiRules = `1. EXISTENCIAS: el catálogo devuelve inventario por sucursal. Por defecto SUMA el total y dile al cliente ÚNICAMENTE el total global, sin mencionar sucursales. EXCEPCIÓN: si pregunta por una ciudad o sucursal concreta, confirma solo si hay o no hay ahí (nunca la cantidad exacta) y pregúntale si conoce la dirección.
2. SIN STOCK: aunque la existencia sea 0, ofrece la información y el precio.
3. SIN PRECIO: si el precio es 0 o nulo, no lo muestres; indica que un asesor lo contactará con el precio exacto y ofrece seguir buscando.
4. FORMATO: muestra solo clave, descripción breve, precio neto (IVA incluido) y existencia total. No satures el chat.`;

module.exports = SealMarketProvider;
