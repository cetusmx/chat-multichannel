const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Mock aiService so we don't actually call Gemini API during tests
jest.mock('../../src/services/ai.service', () => ({
  embed: jest.fn().mockResolvedValue(new Array(768).fill(0.1))
}));

describe('Knowledge Base Integration Tests', () => {
  let tenantId;
  let adminToken;
  let adminId;

  beforeAll(async () => {
    // 1. Create Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant KB',
        domain: 'testkb.com',
      }
    });
    tenantId = tenant.id;

    // 2. Create Admin User
    const admin = await prisma.user.create({
      data: {
        name: 'Admin Test',
        email: 'adminkb@test.com',
        passwordHash: 'hashed',
        role: 'ADMIN',
        tenantId: tenantId
      }
    });
    adminId = admin.id;

    // 3. Generate token
    adminToken = jwt.sign(
      { id: admin.id, role: admin.role, tenantId },
      process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production'
    );
  });

  afterAll(async () => {
    await prisma.document.deleteMany({ where: { tenantId } });
    await prisma.user.delete({ where: { id: adminId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
  });

  describe('POST /api/tenant/knowledge-base/upload', () => {
    it('should upload a CSV file and process it asynchronously', async () => {
      const csvBuffer = Buffer.from("question,answer\nWhat is the refund policy?,30 days\nHow to contact?,Call 555-1234");
      
      const res = await request(app)
        .post('/api/tenant/knowledge-base/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvBuffer, 'faq.csv');

      expect(res.status).toBe(202);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.filename).toBe('faq.csv');
      expect(res.body.data.status).toBe('PROCESSING');
      
      const docId = res.body.data.id;

      // Poll for the async processing to finish (max 3 seconds)
      let updatedDoc;
      for (let i = 0; i < 15; i++) {
        updatedDoc = await prisma.document.findUnique({ where: { id: docId }});
        if (updatedDoc.status === 'READY') break;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      expect(updatedDoc.status).toBe('READY');

      const chunks = await prisma.documentChunk.findMany({ where: { documentId: docId }});
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].text).toContain('question:');
    });

    it('should reject invalid file types', async () => {
      const txtBuffer = Buffer.from("just some text");
      
      const res = await request(app)
        .post('/api/tenant/knowledge-base/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', txtBuffer, 'notes.txt');

      expect(res.status).toBe(500); // Because it goes through global error handler as an Error
      // Actually multer filter error might be 500 or 400 depending on handler
      expect(res.body.error.message).toMatch(/Invalid file type/);
    });
  });

  describe('GET /api/tenant/knowledge-base', () => {
    it('should return a list of documents for the tenant', async () => {
      const res = await request(app)
        .get('/api/tenant/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
