const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let adminToken;
let coordinatorToken;
let testTenantId;
let vendor1Id;
let vendor2Id;
const cleanupIds = { users: [] };

beforeAll(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { domain: 'demo.salesflow.app' } });
  testTenantId = tenant.id;

  adminToken = jwt.sign(
    { id: 'test-admin', tenantId: testTenantId, role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  coordinatorToken = jwt.sign(
    { id: 'test-coord', tenantId: testTenantId, role: 'COORDINATOR' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  const v1 = await prisma.user.create({
    data: {
      name: 'Vendor 1',
      email: 'v1@example.com',
      passwordHash: 'hash',
      role: 'VENDOR',
      tenantId: testTenantId,
    }
  });
  const v2 = await prisma.user.create({
    data: {
      name: 'Vendor 2',
      email: 'v2@example.com',
      passwordHash: 'hash',
      role: 'VENDOR',
      tenantId: testTenantId,
    }
  });
  vendor1Id = v1.id;
  vendor2Id = v2.id;
  cleanupIds.users.push(v1.id, v2.id);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: cleanupIds.users } } });
  await prisma.assignmentRule.deleteMany({ where: { tenantId: testTenantId } });
});

describe('Assignment Rules API', () => {
  it('should return default config if none exists', async () => {
    const res = await request(app)
      .get('/api/tenant/assignment-config')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.strategy).toBe('MANUAL');
    expect(res.body.data.activeVendors).toEqual([]);
  });

  it('should update config to ROUND_ROBIN and save eligible vendors', async () => {
    const res = await request(app)
      .put('/api/tenant/assignment-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        strategy: 'ROUND_ROBIN',
        activeVendorIds: [vendor1Id, vendor2Id]
      });

    expect(res.status).toBe(200);
    expect(res.body.data.strategy).toBe('ROUND_ROBIN');
    expect(res.body.data.activeVendors).toHaveLength(2);
    expect(res.body.data.activeVendors.some(v => v.id === vendor1Id)).toBe(true);
  });

  it('should deny non-admin users', async () => {
    const res = await request(app)
      .put('/api/tenant/assignment-config')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        strategy: 'MANUAL',
        activeVendorIds: []
      });

    expect(res.status).toBe(403);
  });

  it('should reject invalid strategy', async () => {
    const res = await request(app)
      .put('/api/tenant/assignment-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        strategy: 'INVALID_STRATEGY',
        activeVendorIds: []
      });

    expect(res.status).toBe(400);
  });
});
