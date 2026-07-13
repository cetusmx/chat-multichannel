const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let adminToken;
let vendorToken;
let testTenantId;
let testVendorId;
const createdMessageIds = [];

describe('Metrics Routes', () => {
beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Integration Test Tenant',
      domain: `test-metrics-${Date.now()}.salesflow.app`,
    }
  });
  testTenantId = tenant.id;

  adminToken = jwt.sign(
    { id: 'test-admin', tenantId: testTenantId, role: 'COORDINATOR' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  const vendor = await prisma.user.create({
    data: {
      email: 'vendor-metrics-test@example.com',
      name: 'Vendor Metrics Test',
      passwordHash: 'hash',
      role: 'VENDOR',
      tenantId: testTenantId,
    }
  });
  testVendorId = vendor.id;

  vendorToken = jwt.sign(
    { id: testVendorId, tenantId: testTenantId, role: 'VENDOR' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
});

afterAll(async () => {
  if (testVendorId) await prisma.user.delete({ where: { id: testVendorId } });
  if (testTenantId) await prisma.tenant.delete({ where: { id: testTenantId } });
});

  let clientId, conversationId, message1Id, message2Id;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { tenantId: testTenantId, phoneNumber: '1234567890' }
    });
    clientId = client.id;

    const conversation = await prisma.conversation.create({
      data: {
        tenantId: testTenantId,
        clientId: clientId,
        vendorId: testVendorId,
        status: 'CLOSED',
        createdAt: new Date('2023-06-01T10:00:00Z')
      }
    });
    conversationId = conversation.id;

    const msg1 = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'CLIENT',
        createdAt: new Date('2023-06-01T10:00:00Z')
      }
    });
    message1Id = msg1.id;

    const msg2 = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'VENDOR',
        senderId: testVendorId,
        createdAt: new Date('2023-06-01T10:05:00Z') // 5 mins
      }
    });
    message2Id = msg2.id;
  });

  afterAll(async () => {
    if (message1Id) await prisma.message.delete({ where: { id: message1Id } });
    if (message2Id) await prisma.message.delete({ where: { id: message2Id } });
    if (conversationId) await prisma.conversation.delete({ where: { id: conversationId } });
    if (clientId) await prisma.client.delete({ where: { id: clientId } });
  });

  it('should return 200 and metrics for COORDINATOR with correct calculations', async () => {
    const res = await request(app)
      .get('/api/metrics/productivity?startDate=2023-01-01&endDate=2023-12-31')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);

    const vendorMetric = res.body.data.find(v => v.vendorId === testVendorId);
    expect(vendorMetric).toBeDefined();
    expect(vendorMetric.totalChatsHandled).toBe(1);
    expect(vendorMetric.resolutionRate).toBe(1);
    expect(vendorMetric.averageResponseTime).toBe(300);
  });

  it('should return 403 for VENDOR', async () => {
    const res = await request(app)
      .get('/api/metrics/productivity?startDate=2023-01-01&endDate=2023-12-31')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(403);
  });
});
