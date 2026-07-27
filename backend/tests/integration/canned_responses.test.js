const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let adminToken;
let vendorToken;
let testTenantId;
let testVendorId;
const createdCannedIds = [];
const createdUserIds = [];

beforeAll(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { domain: 'demo.salesflow.app' } });
  testTenantId = tenant.id;

  // Create a vendor to test usages
  const vendor = await prisma.user.create({
    data: {
      name: 'Test Vendor Canned',
      email: 'vendor.canned@salesflow.app',
      passwordHash: 'dummy',
      role: 'VENDOR',
      tenantId: testTenantId,
    }
  });
  testVendorId = vendor.id;
  createdUserIds.push(vendor.id);

  adminToken = jwt.sign(
    { id: 'test-admin', tenantId: testTenantId, role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  vendorToken = jwt.sign(
    { id: testVendorId, tenantId: testTenantId, role: 'VENDOR' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
});

afterAll(async () => {
  if (createdCannedIds.length > 0) {
    await prisma.cannedResponseUsage.deleteMany({
      where: { cannedResponseId: { in: createdCannedIds } }
    });
    await prisma.cannedResponse.deleteMany({
      where: { id: { in: createdCannedIds } }
    });
  }
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } }
    });
  }
});

describe('Canned Responses API', () => {
  let firstResponseId;
  let secondResponseId;

  it('POST /api/canned-responses should create a new response if admin', async () => {
    const res = await request(app)
      .post('/api/canned-responses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Saludo 1', content: 'Hola!', shortcut: '/hola' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    firstResponseId = res.body.data.id;
    createdCannedIds.push(firstResponseId);
  });

  it('POST /api/canned-responses should deny if vendor', async () => {
    const res = await request(app)
      .post('/api/canned-responses')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ title: 'Saludo 2', content: 'Hola 2', shortcut: '/hola2' });

    expect(res.status).toBe(403);
  });

  it('GET /api/canned-responses should return responses for tenant', async () => {
    const res = await request(app)
      .get('/api/canned-responses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(r => r.id === firstResponseId)).toBe(true);
  });

  it('POST /api/canned-responses should create another response', async () => {
    const res = await request(app)
      .post('/api/canned-responses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Despedida', content: 'Adios!', shortcut: '/adios' });

    expect(res.status).toBe(201);
    secondResponseId = res.body.data.id;
    createdCannedIds.push(secondResponseId);
  });

  it('POST /api/canned-responses/:id/use should record usage for vendor', async () => {
    // Record usage multiple times for second response
    await request(app)
      .post(`/api/canned-responses/${secondResponseId}/use`)
      .set('Authorization', `Bearer ${vendorToken}`);
    
    const res = await request(app)
      .post(`/api/canned-responses/${secondResponseId}/use`)
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.useCount).toBe(2);
  });

  it('GET /api/canned-responses/my-usage should return ordered responses (most used first)', async () => {
    const res = await request(app)
      .get('/api/canned-responses/my-usage')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    
    // We expect both responses to be returned
    const data = res.body.data;
    const firstIndex = data.findIndex(r => r.id === firstResponseId);
    const secondIndex = data.findIndex(r => r.id === secondResponseId);

    // secondResponseId should appear before firstResponseId because it has more usages
    expect(secondIndex).toBeLessThan(firstIndex);
    expect(data[secondIndex].useCount).toBe(2);
    expect(data[firstIndex].useCount).toBe(0);
  });

  it('PUT /api/canned-responses/:id should update response if admin', async () => {
    const res = await request(app)
      .put(`/api/canned-responses/${firstResponseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Saludo Nuevo', content: 'Hola Nuevo!', shortcut: '/holanuevo' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Saludo Nuevo');
  });

  it('DELETE /api/canned-responses/:id should delete response if admin', async () => {
    const res = await request(app)
      .delete(`/api/canned-responses/${firstResponseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
  });
});
