const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Metrics API - SLA', () => {
  let adminToken;
  let coordinatorToken;
  let vendorToken;
  let tenantId;

  beforeAll(async () => {
    // Create tenant
    const tenant = await prisma.tenant.create({
      data: { name: 'Test Tenant SLA', domain: 'testsla.com' }
    });
    tenantId = tenant.id;

    // Create admin
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin.sla@test.com',
        passwordHash: 'hash',
        role: 'ADMIN',
        tenantId
      }
    });
    adminToken = jwt.sign(
      { id: admin.id, role: admin.role, tenantId: admin.tenantId },
      JWT_SECRET
    );

    // Create coordinator
    const coordinator = await prisma.user.create({
      data: {
        name: 'Coordinator',
        email: 'coordinator.sla@test.com',
        passwordHash: 'hash',
        role: 'COORDINATOR',
        tenantId
      }
    });
    coordinatorToken = jwt.sign(
      { id: coordinator.id, role: coordinator.role, tenantId: coordinator.tenantId },
      JWT_SECRET
    );

    // Create vendor
    const vendor = await prisma.user.create({
      data: {
        name: 'Vendor',
        email: 'vendor.sla@test.com',
        passwordHash: 'hash',
        role: 'VENDOR',
        tenantId
      }
    });
    vendorToken = jwt.sign(
      { id: vendor.id, role: vendor.role, tenantId: vendor.tenantId },
      JWT_SECRET
    );
  });

  afterAll(async () => {
    if (tenantId) {
      await prisma.slaConfig.deleteMany({ where: { tenantId } });
      await prisma.user.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/metrics/sla', () => {
    it('should return 401 without token', async () => {
      await request(app).get('/api/metrics/sla').expect(401);
    });

    it('should return 403 for VENDOR role', async () => {
      await request(app)
        .get('/api/metrics/sla')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403);
    });

    it('should return default config if none exists for admin', async () => {
      const res = await request(app)
        .get('/api/metrics/sla')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.firstResponseMins).toBe(15);
      expect(res.body.data.resolutionMins).toBe(60);
    });

    it('should allow access for COORDINATOR role', async () => {
      await request(app)
        .get('/api/metrics/sla')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(200);
    });
  });

  describe('PUT /api/metrics/sla', () => {
    it('should update config and return 200', async () => {
      const res = await request(app)
        .put('/api/metrics/sla')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstResponseMins: 5, resolutionMins: 30 })
        .expect(200);

      expect(res.body.data.firstResponseMins).toBe(5);
      expect(res.body.data.resolutionMins).toBe(30);

      // Verify DB
      const dbConfig = await prisma.slaConfig.findUnique({ where: { tenantId } });
      expect(dbConfig.firstResponseMins).toBe(5);
    });

    it('should return 400 for negative values', async () => {
      await request(app)
        .put('/api/metrics/sla')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstResponseMins: -5 })
        .expect(400);
    });
  });
});
