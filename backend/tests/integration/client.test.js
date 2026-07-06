const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let adminToken;
let coordinatorToken;
let vendorToken;
let testTenantId;
let testClientId;
let testClientId2;

beforeAll(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { domain: 'demo.salesflow.app' } });
  testTenantId = tenant.id;

  adminToken = jwt.sign(
    { id: 'test-admin', tenantId: testTenantId, role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  coordinatorToken = jwt.sign(
    { id: 'test-coordinator', tenantId: testTenantId, role: 'COORDINATOR' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  vendorToken = jwt.sign(
    { id: 'test-vendor', tenantId: testTenantId, role: 'VENDOR' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  const client = await prisma.client.create({
    data: {
      phoneNumber: '1234567000',
      name: 'Block Test Client',
      tenantId: testTenantId,
    }
  });
  testClientId = client.id;

  const client2 = await prisma.client.create({
    data: {
      phoneNumber: '1234567001',
      name: 'Block Test Client 2',
      tenantId: testTenantId,
    }
  });
  testClientId2 = client2.id;
});

afterAll(async () => {
  if (testClientId) await prisma.client.delete({ where: { id: testClientId } });
  if (testClientId2) await prisma.client.delete({ where: { id: testClientId2 } });
});

describe('PATCH /api/clients/:id/block', () => {
  it('should allow ADMIN to block a client', async () => {
    const res = await request(app)
      .patch(`/api/clients/${testClientId}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBlocked: true });

    expect(res.status).toBe(200);
    expect(res.body.data.isBlocked).toBe(true);

    const client = await prisma.client.findUnique({ where: { id: testClientId } });
    expect(client.isBlocked).toBe(true);
  });

  it('should allow COORDINATOR to unblock a client', async () => {
    const res = await request(app)
      .patch(`/api/clients/${testClientId}/block`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ isBlocked: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isBlocked).toBe(false);

    const client = await prisma.client.findUnique({ where: { id: testClientId } });
    expect(client.isBlocked).toBe(false);
  });

  it('should prevent VENDOR from blocking a client', async () => {
    const res = await request(app)
      .patch(`/api/clients/${testClientId2}/block`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ isBlocked: true });

    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent client', async () => {
    const res = await request(app)
      .patch(`/api/clients/nonexistent-id/block`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ isBlocked: true });

    expect(res.status).toBe(404);
  });
});
