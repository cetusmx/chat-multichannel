const SealMarketProvider = require('../../src/catalog/providers/sealmarket.provider');
const GenericRestProvider = require('../../src/catalog/providers/generic-rest.provider');
const { normalizeSchema } = require('../../src/catalog/schema');
const { normalizePricing } = require('../../src/catalog/product');

function mockFetch(handler) {
  global.fetch = jest.fn(async (url, init) => {
    const { status = 200, body } = await handler(String(url), init);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: { get: () => 'application/json' },
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  });
}

afterEach(() => {
  delete global.fetch;
});

describe('SealMarketProvider', () => {
  const ctx = {
    tenantId: 't1', baseUrl: 'http://erp.test/', apiKey: 'k', connection: {},
    schema: normalizeSchema(SealMarketProvider.defaultSchema), pricing: normalizePricing(null), features: {},
  };

  const alive = { CVE_ART: 'A', DESCR: 'Sello A', PRECIO: 100, existencias: { S1: 2 }, LIN_PROD: 'PTB' };
  const dead = { CVE_ART: 'D', DESCR: 'Muerto', PRECIO: 0, existencias: {}, FCH_ULTCOM: null };
  const noStock = { CVE_ART: 'N', DESCR: 'Sin stock', PRECIO: 50, existencias: {}, FCH_ULTCOM: '2025-01-01' };

  it('sends schema params with the ERP names and normalizes products', async () => {
    mockFetch(async (url, init) => {
      expect(init.headers['x-api-key']).toBe('k');
      expect(url).toMatch(/^http:\/\/erp\.test\/api\/clavesalternas\/filter-v2\?/);
      expect(url).toMatch(/familia=ORINGS/);
      expect(url).toMatch(/diam_int=1\.3125/);
      return { body: { data: [alive, dead, noStock] } };
    });
    const p = new SealMarketProvider(ctx);
    const out = await p.search({ familia: 'ORINGS', diam_int: 1.3125 });
    expect(out.map((x) => x.sku)).toEqual(['A']); // dead dropped, in-stock preferred
    expect(out[0].priceNet).toBe(116);
    expect(out[0].stock.total).toBe(2);
    expect(out[0].imageUrl).toBe('https://sistemahidraulico.mx/Perfiles/PTB.jpg');
    expect(out[0].attributes.linea).toBe('PTB');
  });

  it('keeps previously purchased items when nothing is in stock', async () => {
    mockFetch(async () => ({ body: { data: [dead, noStock] } }));
    const out = await new SealMarketProvider(ctx).search({ familia: 'X' });
    expect(out.map((x) => x.sku)).toEqual(['N']);
  });

  it('tries text parameter aliases and filters by tokens', async () => {
    const calls = [];
    mockFetch(async (url) => {
      calls.push(url);
      if (url.includes('clave=')) return { body: { data: [] } };
      return { body: { data: [alive, { CVE_ART: 'B', DESCR: 'Otra cosa', PRECIO: 1, existencias: { S1: 1 } }] } };
    });
    const out = await new SealMarketProvider(ctx).search({ text: 'sello a' }, { textParamCandidates: ['clave', 'q'] });
    expect(calls).toHaveLength(2);
    expect(out.map((x) => x.sku)).toEqual(['A']);
  });

  it('maps families and customers', async () => {
    mockFetch(async (url) => {
      if (url.endsWith('/familias')) return { body: [{ FAMILIA: 'ORINGS' }, { FAMILIA: 'SELLOS' }] };
      if (url.includes('/clientes/rfc/XAXX010101000')) return { body: { data: [{ RFC: 'XAXX010101000', NOMBRE: 'ACME SA', STATUS: 'A', CALLE: 'Juárez', NUMEXT: '10', COLONIA: 'Centro', CODIGO: '25000', MUNICIPIO: 'Saltillo', ESTADO: 'Coahuila' }] } };
      return { status: 404, body: {} };
    });
    const p = new SealMarketProvider(ctx);
    expect(await p.getOptions('families')).toEqual([{ value: 'ORINGS', label: 'ORINGS' }, { value: 'SELLOS', label: 'SELLOS' }]);
    const c = await p.lookupCustomer('xaxx010101000');
    expect(c.legalName).toBe('ACME SA');
    expect(c.isActive).toBe(true);
    expect(c.address).toBe('Juárez, 10, Col. Centro, C.P. 25000, Saltillo, Coahuila');
    expect(await p.lookupCustomer('NOPE')).toBeNull();
  });
});

describe('GenericRestProvider', () => {
  const schema = normalizeSchema({
    textSearch: { param: 'search' },
    attributes: [
      { key: 'rin', type: 'number', param: 'rim' },
      { key: 'carga', type: 'range', param: 'load' },
      { key: 'marca', type: 'select', optionsSource: 'remote:brands' },
    ],
  });
  const base = { tenantId: 't2', baseUrl: 'https://api.llantas.test', apiKey: 'secret', schema, pricing: normalizePricing({ pricesIncludeTax: true }), features: {} };

  it('GET search with header auth, mapping and dot paths', async () => {
    mockFetch(async (url, init) => {
      expect(init.headers['X-Token']).toBe('secret');
      expect(url).toBe('https://api.llantas.test/v1/tires?per_page=20&search=michelin&rim=16&load_min=91&load_max=94');
      return { body: { result: { items: [{ id: 'T1', title: 'Pilot Sport', pricing: { list: 2320 }, inventory: 4, specs: { rim: 16, width: 205 }, brand: { name: 'Michelin' } }] } } };
    });
    const p = new GenericRestProvider({
      ...base,
      connection: {
        auth: { type: 'header', name: 'X-Token' },
        search: { path: '/v1/tires', staticParams: { per_page: 20 }, resultsPath: 'result.items' },
        mapping: { sku: 'id', name: 'title', price: 'pricing.list', stockTotal: 'inventory', attributes: { rin: 'specs.rim', ancho: 'specs.width', marca: 'brand.name' } },
      },
    });
    const out = await p.search({ text: 'michelin', rin: 16, carga: { min: 91, max: 94 } });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ sku: 'T1', name: 'Pilot Sport', priceNet: 2320, pricePreTax: 2000, attributes: { rin: 16, ancho: 205, marca: 'Michelin' } });
    expect(out[0].stock.total).toBe(4);
    expect(p.capabilities.customerLookup).toBe(false);
  });

  it('POST search with bearer auth and top-level array response', async () => {
    mockFetch(async (url, init) => {
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer secret');
      expect(JSON.parse(init.body)).toEqual({ search: 'tornillo', rim: 5 });
      return { body: [{ sku: 'F-1', name: 'Tornillo', price: 10 }] };
    });
    const p = new GenericRestProvider({ ...base, connection: { auth: { type: 'bearer' }, search: { path: '/search', method: 'POST' } } });
    const out = await p.search({ text: 'tornillo', rin: 5 });
    expect(out[0].sku).toBe('F-1');
  });

  it('remote options and customer lookup with configured fields', async () => {
    mockFetch(async (url) => {
      if (url.startsWith('https://api.llantas.test/brands?key=secret')) return { body: { data: [{ code: 'MI', label: 'Michelin' }] } };
      if (url.startsWith('https://api.llantas.test/customers/ABC010101AAA')) return { body: { customer: { rfc: 'ABC010101AAA', razon: 'Llantas SA', dir: 'Av. 1', estado: 'active' } } };
      return { status: 404, body: {} };
    });
    const p = new GenericRestProvider({
      ...base,
      connection: {
        auth: { type: 'query', name: 'key' },
        search: { path: '/s' },
        options: { brands: { path: '/brands', resultsPath: 'data', valueField: 'code', labelField: 'label' } },
        customer: { path: '/customers/{taxId}', resultsPath: 'customer', fields: { taxId: 'rfc', legalName: 'razon', address: 'dir', isActive: 'estado' } },
      },
    });
    expect(p.capabilities.customerLookup).toBe(true);
    expect(await p.getOptions('brands')).toEqual([{ value: 'MI', label: 'Michelin' }]);
    expect(await p.lookupCustomer('abc010101aaa')).toMatchObject({ taxId: 'ABC010101AAA', legalName: 'Llantas SA', address: 'Av. 1', isActive: true });
    expect(await p.lookupCustomer('ZZZ')).toBeNull();
  });

  it('fails clearly when misconfigured or upstream errors', async () => {
    const p = new GenericRestProvider({ ...base, connection: {} });
    await expect(p.search({ text: 'x' })).rejects.toMatchObject({ code: 'CATALOG_MISCONFIGURED', status: 503 });
    mockFetch(async () => ({ status: 500, body: {} }));
    const q = new GenericRestProvider({ ...base, connection: { search: { path: '/s' } } });
    await expect(q.search({ text: 'x' })).rejects.toMatchObject({ code: 'CATALOG_UPSTREAM_ERROR', status: 502 });
  });
});
