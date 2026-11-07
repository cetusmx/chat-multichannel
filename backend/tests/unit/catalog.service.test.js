process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '01234567890123456789012345678901';

jest.mock('../../src/config/database', () => ({
  catalogConfig: { findUnique: jest.fn(), upsert: jest.fn() },
}));

const { encrypt } = require('../../src/utils/encryption');
let prisma;

describe('catalog.service', () => {
  let service;
  const savedEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...savedEnv };
    delete process.env.CATALOG_API_KEY;
    delete process.env.VITE_INTERNAL_SECRET;
    prisma = require('../../src/config/database');
    service = require('../../src/services/catalog.service');
    prisma.catalogConfig.findUnique.mockReset();
    prisma.catalogConfig.upsert.mockReset();
  });

  afterAll(() => {
    process.env = savedEnv;
  });

  it('resolves to the none provider when there is no config and no env key', async () => {
    prisma.catalogConfig.findUnique.mockResolvedValue(null);
    const d = await service.describe('t1');
    expect(d.provider).toBe('none');
    expect(d.isConfigured).toBe(false);
    expect(d.capabilities.customerLookup).toBe(false);
    const ai = await service.describeForAi('t1');
    expect(ai.isConfigured).toBe(false);
    expect(ai.toolParameters).toBeNull();
  });

  it('falls back to the legacy SealMarket env connection when no row exists', async () => {
    process.env.CATALOG_API_KEY = 'env-key';
    prisma.catalogConfig.findUnique.mockResolvedValue(null);
    const r = await service.resolve('t1');
    expect(r.providerName).toBe('sealmarket');
    expect(r.legacy).toBe(true);
    expect(r.provider.apiKey).toBe('env-key');
    expect(r.schema.attributes.map((a) => a.key)).toContain('familia');
    expect(r.aiRules).toMatch(/EXISTENCIAS/);
  });

  it('builds a generic_rest provider from a stored row with an encrypted key', async () => {
    prisma.catalogConfig.findUnique.mockResolvedValue({
      tenantId: 't2', provider: 'generic_rest', isActive: true, baseUrl: 'https://x.test/',
      apiKey: encrypt('row-key'), connection: { search: { path: '/s' } },
      searchSchema: { attributes: [{ key: 'rin', type: 'number', required: true }] },
      pricing: { taxRate: 0.08 }, features: { customerLookup: false }, aiRules: 'Regla X',
    });
    const r = await service.resolve('t2');
    expect(r.providerName).toBe('generic_rest');
    expect(r.provider.apiKey).toBe('row-key');
    expect(r.provider.baseUrl).toBe('https://x.test');
    expect(r.pricing.taxRate).toBe(0.08);
    expect(r.features.customerLookup).toBe(false);
    const ai = await service.describeForAi('t2');
    expect(ai.toolParameters.required).toEqual(['rin']);
    expect(ai.aiRules).toBe('Regla X');
    expect(prisma.catalogConfig.findUnique).toHaveBeenCalledTimes(1); // cached
  });

  it('treats an inactive row as none', async () => {
    prisma.catalogConfig.findUnique.mockResolvedValue({ tenantId: 't3', provider: 'sealmarket', isActive: false });
    expect((await service.describe('t3')).provider).toBe('none');
  });

  it('validates and encrypts on upsert, then invalidates the cache', async () => {
    prisma.catalogConfig.findUnique.mockResolvedValue(null);
    await service.resolve('t4');
    prisma.catalogConfig.upsert.mockImplementation(async ({ create }) => ({ id: 'c1', tenantId: 't4', ...create }));
    prisma.catalogConfig.findUnique.mockResolvedValue({ id: 'c1', tenantId: 't4', provider: 'generic_rest', apiKey: 'enc' });

    const cfg = await service.upsertConfig('t4', { provider: 'generic_rest', apiKey: 'plain', baseUrl: 'https://a.test///', searchSchema: { attributes: [] } });
    const call = prisma.catalogConfig.upsert.mock.calls[0][0];
    expect(call.create.apiKey).not.toBe('plain');
    expect(call.create.baseUrl).toBe('https://a.test');
    expect(cfg.hasApiKey).toBe(true);
    expect(cfg.apiKey).toBeUndefined();
    expect(prisma.catalogConfig.findUnique).toHaveBeenCalledTimes(2); // resolve + getConfig; cache was invalidated

    await expect(service.upsertConfig('t4', { provider: 'martian' })).rejects.toThrow(/desconocido/);
    await expect(service.upsertConfig('t4', { searchSchema: { attributes: [{ key: '1bad' }] } })).rejects.toThrow(/inválido/);
  });
});
