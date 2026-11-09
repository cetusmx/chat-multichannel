process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '01234567890123456789012345678901';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const env = require('../../src/config/env');
const catalogService = require('../../src/services/catalog.service');

const TENANT_DOMAIN = 'catalog-sa.test.com';
const CREATED_SLUG = 'catalog-sa-created';
const CREATED_EMAIL = 'admin@catalog-sa-created.test';

let superadminToken;
let tenant;

const auth = (req) => req.set('Authorization', `Bearer ${superadminToken}`);

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: CREATED_EMAIL } });
  await prisma.tenant.deleteMany({ where: { domain: { in: [TENANT_DOMAIN, CREATED_SLUG] } } });
  catalogService.invalidate();
}

beforeAll(async () => {
  superadminToken = jwt.sign({ id: 'test-superadmin', role: 'SUPERADMIN' }, env.superadminJwtSecret, { expiresIn: '1h' });
});

beforeEach(async () => {
  await cleanup();
  tenant = await prisma.tenant.create({
    data: { name: 'Catalog SA Tenant', domain: TENANT_DOMAIN, status: 'active' },
  });
});

afterEach(cleanup);

afterAll(async () => {
  await prisma.$disconnect();
});

const validGenericConfig = {
  provider: 'generic_rest',
  isActive: true,
  baseUrl: 'https://api.ferreteria.test/',
  apiKey: 'super-secret-token',
  connection: {
    auth: { type: 'bearer' },
    search: { path: '/api/products', method: 'GET', textParam: 'q', resultsPath: 'data' },
    mapping: { sku: 'sku', name: 'name', price: 'price', stockTotal: 'stock' },
  },
  searchSchema: {
    textSearch: { enabled: true, param: 'q', label: 'Buscar' },
    attributes: [{ key: 'familia', label: 'Familia', type: 'select', options: ['Tornillería', 'Pintura'] }],
  },
  pricing: { taxRate: 0.16, pricesIncludeTax: false, currency: 'MXN' },
  features: { customerLookup: false, csfExtraction: false, stockByLocation: true, productImages: false },
  aiRules: '1. Siempre confirma la familia.',
};

describe('Superadmin tenant catalog config', () => {
  describe('auth', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get(`/api/superadmin/tenants/${tenant.id}/catalog-config`);
      expect(res.status).toBe(401);
    });

    it('returns 403 for a non-superadmin token', async () => {
      const normalToken = jwt.sign({ id: 'u1', role: 'ADMIN', tenantId: tenant.id }, env.superadminJwtSecret, { expiresIn: '1h' });
      const res = await request(app)
        .get(`/api/superadmin/tenants/${tenant.id}/catalog-config`)
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /:id/catalog-config', () => {
    it('returns data null and the provider list when the tenant has no config', async () => {
      const res = await auth(request(app).get(`/api/superadmin/tenants/${tenant.id}/catalog-config`));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      expect(res.body.providers).toEqual(expect.arrayContaining(['none', 'sealmarket', 'generic_rest']));
    });

    it('returns 404 for an unknown tenant', async () => {
      const res = await auth(request(app).get('/api/superadmin/tenants/cmvyov3dt0000m501k3ny6wkf/catalog-config'));
      expect(res.status).toBe(404);
    });

    it('returns 400 for a malformed tenant id', async () => {
      const res = await auth(request(app).get('/api/superadmin/tenants/not-an-id/catalog-config'));
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /:id/catalog-config', () => {
    it('saves a valid config, reports hasApiKey and never exposes the key', async () => {
      const res = await auth(request(app).put(`/api/superadmin/tenants/${tenant.id}/catalog-config`)).send(validGenericConfig);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        tenantId: tenant.id,
        provider: 'generic_rest',
        isActive: true,
        baseUrl: 'https://api.ferreteria.test',
        hasApiKey: true,
        pricing: { taxRate: 0.16, pricesIncludeTax: false, currency: 'MXN' },
        features: { customerLookup: false, csfExtraction: false, stockByLocation: true, productImages: false },
        aiRules: '1. Siempre confirma la familia.',
      });
      expect(res.body.data.apiKey).toBeUndefined();
      expect(res.body.data.searchSchema.attributes[0].key).toBe('familia');

      const row = await prisma.catalogConfig.findUnique({ where: { tenantId: tenant.id } });
      expect(row.apiKey).not.toBe('super-secret-token');
      expect(row.apiKey).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);

      const getRes = await auth(request(app).get(`/api/superadmin/tenants/${tenant.id}/catalog-config`));
      expect(getRes.body.data.hasApiKey).toBe(true);
      expect(getRes.body.data.apiKey).toBeUndefined();
    });

    it('keeps the stored API key when the payload omits it', async () => {
      await auth(request(app).put(`/api/superadmin/tenants/${tenant.id}/catalog-config`)).send(validGenericConfig);
      const before = await prisma.catalogConfig.findUnique({ where: { tenantId: tenant.id } });

      const res = await auth(request(app).put(`/api/superadmin/tenants/${tenant.id}/catalog-config`)).send({ aiRules: 'Nueva regla' });
      expect(res.status).toBe(200);
      expect(res.body.data.hasApiKey).toBe(true);
      expect(res.body.data.aiRules).toBe('Nueva regla');

      const after = await prisma.catalogConfig.findUnique({ where: { tenantId: tenant.id } });
      expect(after.apiKey).toBe(before.apiKey);
    });

    it('rejects an unknown provider with 400', async () => {
      const res = await auth(request(app).put(`/api/superadmin/tenants/${tenant.id}/catalog-config`)).send({ provider: 'oracle_erp' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Proveedor de catálogo desconocido/);
      expect(await prisma.catalogConfig.findUnique({ where: { tenantId: tenant.id } })).toBeNull();
    });

    it('rejects an invalid searchSchema with 400', async () => {
      const res = await auth(request(app).put(`/api/superadmin/tenants/${tenant.id}/catalog-config`)).send({
        provider: 'generic_rest',
        searchSchema: { attributes: [{ key: 'marca', type: 'select' }] },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/requiere options u optionsSource/);
    });

    it('rejects unknown fields with 400', async () => {
      const res = await auth(request(app).put(`/api/superadmin/tenants/${tenant.id}/catalog-config`)).send({ provider: 'none', hacked: true });
      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown tenant', async () => {
      const res = await auth(request(app).put('/api/superadmin/tenants/cmvyov3dt0000m501k3ny6wkf/catalog-config')).send({ provider: 'none' });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /:id/catalog-config/test', () => {
    it('returns ok for provider none', async () => {
      await auth(request(app).put(`/api/superadmin/tenants/${tenant.id}/catalog-config`)).send({ provider: 'none' });

      const res = await auth(request(app).post(`/api/superadmin/tenants/${tenant.id}/catalog-config/test`));

      expect(res.status).toBe(200);
      expect(res.body.data.ok).toBe(true);
      expect(typeof res.body.data.message).toBe('string');
    });

    it('returns 404 for an unknown tenant', async () => {
      const res = await auth(request(app).post('/api/superadmin/tenants/cmvyov3dt0000m501k3ny6wkf/catalog-config/test'));
      expect(res.status).toBe(404);
    });
  });

  describe('POST / with catalogConfig', () => {
    const basePayload = {
      name: 'Catalog Created Corp',
      slug: CREATED_SLUG,
      firstName: 'Ana',
      lastName: 'Lopez',
      email: CREATED_EMAIL,
      password: 'Password123!',
    };

    it('creates the tenant and its catalog config in one call', async () => {
      const res = await auth(request(app).post('/api/superadmin/tenants')).send({
        ...basePayload,
        catalogConfig: { provider: 'generic_rest', baseUrl: 'https://api.created.test', apiKey: 'k', connection: validGenericConfig.connection, searchSchema: validGenericConfig.searchSchema },
      });

      expect(res.status).toBe(201);
      expect(res.body.data.tenant.domain).toBe(CREATED_SLUG);
      expect(res.body.data.catalogConfig).toMatchObject({ provider: 'generic_rest', hasApiKey: true, baseUrl: 'https://api.created.test' });
      expect(res.body.data.catalogConfig.apiKey).toBeUndefined();

      const row = await prisma.catalogConfig.findUnique({ where: { tenantId: res.body.data.tenant.id } });
      expect(row.provider).toBe('generic_rest');
    });

    it('still works without catalogConfig', async () => {
      const res = await auth(request(app).post('/api/superadmin/tenants')).send(basePayload);

      expect(res.status).toBe(201);
      expect(res.body.data.catalogConfig).toBeUndefined();
      expect(await prisma.catalogConfig.findUnique({ where: { tenantId: res.body.data.tenant.id } })).toBeNull();
    });

    it('rejects an invalid catalog provider without creating the tenant', async () => {
      const res = await auth(request(app).post('/api/superadmin/tenants')).send({ ...basePayload, catalogConfig: { provider: 'nope' } });

      expect(res.status).toBe(400);
      expect(await prisma.tenant.findUnique({ where: { domain: CREATED_SLUG } })).toBeNull();
    });
  });
});
