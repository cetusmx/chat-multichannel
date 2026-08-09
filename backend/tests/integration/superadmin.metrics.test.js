const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const { clearCache } = require('../../src/services/superadmin.metrics.service');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let superadminToken;
let normalToken;
beforeAll(async () => {
  // Create Superadmin Token
  superadminToken = jwt.sign(
    { id: 'test-superadmin', role: 'SUPERADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create Normal Admin Token
  normalToken = jwt.sign(
    { id: 'test-normal', role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
});

beforeEach(async () => {
  clearCache();
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  // Seed Tenants
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'Active Tenant 1',
      domain: 'active1.test.com',
      status: 'active',
      currentMonthAiTokens: 100,
      monthlyTokenLimit: 1000
    }
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Active Tenant 2',
      domain: 'active2.test.com',
      status: 'active',
      currentMonthAiTokens: 200,
      monthlyTokenLimit: 1000
    }
  });

  const tenant3 = await prisma.tenant.create({
    data: {
      name: 'Suspended Tenant',
      domain: 'suspended.test.com',
      status: 'suspended',
      currentMonthAiTokens: 50,
      monthlyTokenLimit: 1000
    }
  });

  // Seed Users
  await prisma.user.create({
    data: {
      name: 'Active User 1',
      email: 'active1@test.com',
      passwordHash: 'hash',
      role: 'ADMIN',
      isActive: true,
      tenantId: tenant1.id
    }
  });

  await prisma.user.create({
    data: {
      name: 'Active User 2',
      email: 'active2@test.com',
      passwordHash: 'hash',
      role: 'VENDOR',
      isActive: true,
      tenantId: tenant2.id
    }
  });

  await prisma.user.create({
    data: {
      name: 'Inactive User',
      email: 'inactive@test.com',
      passwordHash: 'hash',
      role: 'VENDOR',
      isActive: false,
      tenantId: tenant3.id
    }
  });
});

afterEach(async () => {
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
});

describe('GET /api/superadmin/metrics', () => {
  it('should return 403 for non-superadmin users', async () => {
    const res = await request(app)
      .get('/api/superadmin/metrics')
      .set('Authorization', `Bearer ${normalToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 401 for unauthenticated requests', async () => {
    const res = await request(app).get('/api/superadmin/metrics');
    expect(res.status).toBe(401);
  });

  it('should return correct global metrics for superadmin', async () => {
    const res = await request(app)
      .get('/api/superadmin/metrics')
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(res.status).toBe(200);
    
    expect(res.body.data.tenants).toBe(2);
    expect(res.body.data.users).toBe(2);
    expect(res.body.data.aiTokens).toBe(350); // 100 + 200 + 50
  });

  it('should utilize cache on subsequent requests', async () => {
    const spy = jest.spyOn(prisma.tenant, 'count');
    
    const res1 = await request(app)
      .get('/api/superadmin/metrics')
      .set('Authorization', `Bearer ${superadminToken}`);
    
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .get('/api/superadmin/metrics')
      .set('Authorization', `Bearer ${superadminToken}`);
    
    expect(res2.status).toBe(200);
    expect(res1.body.data).toEqual(res2.body.data);
    
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
