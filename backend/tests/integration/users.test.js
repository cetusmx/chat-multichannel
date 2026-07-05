const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let adminToken;
let coordinatorToken;
let vendorToken;
let testTenantId;
let testGroupId;
const createdUserIds = [];

beforeAll(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { domain: 'demo.salesflow.app' } });
  testTenantId = tenant.id;

  const group = await prisma.group.findFirst({ where: { branch: { tenantId: testTenantId } } });
  testGroupId = group.id;

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

  vendorToken = jwt.sign(
    { id: 'test-vendor', tenantId: testTenantId, role: 'VENDOR' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
});

afterAll(async () => {
  await prisma.groupVendor.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  createdUserIds.length = 0;
});

describe('POST /api/users', () => {
  const newUser = {
    name: 'Test User',
    email: 'test-user@example.com',
    phone: '555-9999',
    password: 'password123',
    role: 'VENDOR',
    groupIds: [],
  };

  it('should create a user with valid data', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...newUser, groupIds: [testGroupId] });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe('Test User');
    expect(res.body.data.email).toBe('test-user@example.com');
    expect(res.body.data.role).toBe('VENDOR');
    expect(res.body.data.groups).toHaveLength(1);
    expect(res.body.data.passwordHash).toBeUndefined();
    createdUserIds.push(res.body.data.id);
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...newUser, groupIds: [testGroupId] });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toMatch(/email/i);
  });

  it('should reject vendor without groups', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'No Group Vendor',
        email: 'test-nogroup@example.com',
        password: 'password123',
        role: 'VENDOR',
        groupIds: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject coordinator creating admin', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        name: 'Wannabe Admin',
        email: 'test-wannabe@example.com',
        password: 'password123',
        role: 'ADMIN',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should allow coordinator to create vendor', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        name: 'Coord Created Vendor',
        email: 'test-coord-vendor@example.com',
        password: 'password123',
        role: 'VENDOR',
        groupIds: [testGroupId],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('VENDOR');
    createdUserIds.push(res.body.data.id);
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'No Auth', email: 'test-noauth@example.com', password: 'password123', role: 'VENDOR' });

    expect(res.status).toBe(401);
  });

  it('should reject vendor creating users', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ name: 'Vendor Tries', email: 'test-vendor-create@example.com', password: 'password123', role: 'VENDOR' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/users', () => {
  it('should return paginated users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('should filter by role', async () => {
    const res = await request(app)
      .get('/api/users?role=VENDOR')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((u) => {
      expect(u.role).toBe('VENDOR');
    });
  });

  it('should reject unauthenticated', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/:id', () => {
  it('should return user by id', async () => {
    const listRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    const userId = listRes.body.data[0].id;

    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(userId);
    expect(res.body.data.groups).toBeDefined();
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app)
      .get('/api/users/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/groups', () => {
  it('should return groups for tenant', async () => {
    const res = await request(app)
      .get('/api/groups')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].branch).toBeDefined();
  });
});
