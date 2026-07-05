const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let adminToken;
let coordinatorToken;
let vendorToken;
let testTenantId;
let testBranchId;
let testBranch2Id;
let testGroupId;
const cleanupIds = { branches: [], groups: [] };

beforeAll(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { domain: 'demo.salesflow.app' } });
  testTenantId = tenant.id;

  const branch = await prisma.branch.findFirst({ where: { tenantId: testTenantId } });
  testBranchId = branch.id;

  const group = await prisma.group.findFirst({ where: { branchId: testBranchId } });
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
  await prisma.group.deleteMany({ where: { id: { in: cleanupIds.groups } } });
  await prisma.branch.deleteMany({ where: { id: { in: cleanupIds.branches } } });
  cleanupIds.branches.length = 0;
  cleanupIds.groups.length = 0;
});

describe('GET /api/tenant/profile', () => {
  it('should return tenant profile', async () => {
    const res = await request(app)
      .get('/api/tenant/profile')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Demo Company');
    expect(res.body.data.domain).toBe('demo.salesflow.app');
    expect(res.body.data.phone).toBeDefined();
  });

  it('should work for any authenticated user', async () => {
    const res = await request(app)
      .get('/api/tenant/profile')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/tenant/profile');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/tenant/profile', () => {
  it('should update tenant profile as admin', async () => {
    const res = await request(app)
      .put('/api/tenant/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Company', phone: '555-1111', email: 'new@company.com', address: 'New Address 456' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Company');
    expect(res.body.data.phone).toBe('555-1111');

    await request(app)
      .put('/api/tenant/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Demo Company', phone: '555-0000', email: 'contacto@democompany.com', address: 'Av. Principal 123, Ciudad de México' });
  });

  it('should reject non-admin', async () => {
    const res = await request(app)
      .put('/api/tenant/profile')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ name: 'Hack Attempt' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/branches', () => {
  it('should list branches for admin', async () => {
    const res = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].groupCount).toBeDefined();
  });

  it('should work for coordinator', async () => {
    const res = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(res.status).toBe(200);
  });

  it('should reject vendor', async () => {
    const res = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/branches', () => {
  it('should create branch as admin', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Branch', address: 'Test Address', phone: '555-1234' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Branch');
    cleanupIds.branches.push(res.body.data.id);
    testBranch2Id = res.body.data.id;
  });

  it('should reject empty name', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('should reject non-admin', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ name: 'Coord Branch' });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/branches/:id', () => {
  it('should update branch as admin', async () => {
    const res = await request(app)
      .put(`/api/branches/${testBranch2Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Branch', phone: '555-9999' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Branch');
  });

  it('should reject non-existent branch', async () => {
    const res = await request(app)
      .put('/api/branches/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/branches/:id', () => {
  it('should reject delete branch with active groups', async () => {
    const branch = await prisma.branch.create({
      data: { name: 'Branch With Groups', tenantId: testTenantId },
    });
    await prisma.group.create({
      data: { name: 'Active Group', branchId: branch.id },
    });

    const res = await request(app)
      .delete(`/api/branches/${branch.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/active group/i);

    await prisma.group.deleteMany({ where: { branchId: branch.id } });
    await prisma.branch.delete({ where: { id: branch.id } });
  });

  it('should delete empty branch', async () => {
    const res = await request(app)
      .delete(`/api/branches/${testBranch2Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });
});

describe('POST /api/groups', () => {
  it('should create group as admin', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Group', description: 'A test group', branchId: testBranchId });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Group');
    expect(res.body.data.branch).toBeDefined();
    cleanupIds.groups.push(res.body.data.id);
  });

  it('should reject empty name', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '', branchId: testBranchId });

    expect(res.status).toBe(400);
  });

  it('should reject missing branchId', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'No Branch Group' });

    expect(res.status).toBe(400);
  });

  it('should reject non-admin', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ name: 'Coord Group', branchId: testBranchId });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/groups/:id', () => {
  it('should update group as admin', async () => {
    const res = await request(app)
      .put(`/api/groups/${testGroupId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Group', description: 'Updated description' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Group');

    await request(app)
      .put(`/api/groups/${testGroupId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Grupo General' });
  });

  it('should reject non-existent group', async () => {
    const res = await request(app)
      .put('/api/groups/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/groups/:id', () => {
  it('should delete group created in test', async () => {
    const res = await request(app)
      .delete(`/api/groups/${cleanupIds.groups[0]}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
    cleanupIds.groups = [];
  });
});

describe('PUT /api/users/:id with group assignment', () => {
  let vendorUserId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Group Test Vendor',
        email: 'group-test-vendor@example.com',
        password: 'password123',
        role: 'VENDOR',
        groupIds: [testGroupId],
      });
    vendorUserId = res.body.data.id;
  });

  afterAll(async () => {
    await prisma.groupVendor.deleteMany({ where: { userId: vendorUserId } });
    await prisma.user.delete({ where: { id: vendorUserId } });
  });

  it('should update vendor group assignments', async () => {
    const newGroup = await prisma.group.create({
      data: { name: 'Temp Group For Test', branchId: testBranchId },
    });

    const res = await request(app)
      .put(`/api/users/${vendorUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupIds: [newGroup.id] });

    expect(res.status).toBe(200);
    expect(res.body.data.groups).toHaveLength(1);
    expect(res.body.data.groups[0].id).toBe(newGroup.id);

    await prisma.group.delete({ where: { id: newGroup.id } });
  });

  it('should reject invalid group ids for tenant', async () => {
    const res = await request(app)
      .put(`/api/users/${vendorUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupIds: ['fake-group-id'] });

    expect(res.status).toBe(400);
  });

  it('should reject empty groups for vendor', async () => {
    const res = await request(app)
      .put(`/api/users/${vendorUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupIds: [] });

    expect(res.status).toBe(400);
  });
});

describe('Coordinator auto-assignment', () => {
  let coordId;
  let testGroupForCoord;

  beforeAll(async () => {
    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Coord Test Group', branchId: testBranchId });
    testGroupForCoord = groupRes.body.data.id;

    const coordRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Coordinator Assigned',
        email: 'coord-auto-assign@example.com',
        password: 'password123',
        role: 'COORDINATOR',
        groupIds: [testGroupForCoord],
      });
    coordId = coordRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.groupVendor.deleteMany({ where: { userId: coordId } });
    await prisma.user.delete({ where: { id: coordId } });
    await prisma.group.delete({ where: { id: testGroupForCoord } });
  });

  it('should auto-assign coordinator from group on vendor creation', async () => {
    const vendorRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Auto Coord Vendor',
        email: 'auto-coord-vendor@example.com',
        password: 'password123',
        role: 'VENDOR',
        groupIds: [testGroupForCoord],
      });
    const vendorId = vendorRes.body.data.id;

    expect(vendorRes.status).toBe(201);
    expect(vendorRes.body.data.coordinatorId).toBe(coordId);

    await prisma.groupVendor.deleteMany({ where: { userId: vendorId } });
    await prisma.user.delete({ where: { id: vendorId } });
  });

  it('should ignore coordinatorId in request body for vendors', async () => {
    const vendorRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ignored Coord Vendor',
        email: 'ignored-coord-vendor@example.com',
        password: 'password123',
        role: 'VENDOR',
        groupIds: [testGroupForCoord],
        coordinatorId: 'fake-id',
      });
    const vendorId = vendorRes.body.data.id;

    expect(vendorRes.status).toBe(201);
    expect(vendorRes.body.data.coordinatorId).toBe(coordId);

    await prisma.groupVendor.deleteMany({ where: { userId: vendorId } });
    await prisma.user.delete({ where: { id: vendorId } });
  });

  it('should list coordinators via role filter', async () => {
    const res = await request(app)
      .get('/api/users?role=COORDINATOR')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((u) => u.id === coordId)).toBe(true);
  });
});

describe('Coordinator group protection', () => {
  let coordId;
  let vendorId;
  let groupWithVendors;
  let groupWithoutVendors;

  beforeAll(async () => {
    const newGroup = await prisma.group.create({
      data: { name: 'Group With Vendors', branchId: testBranchId },
    });
    groupWithVendors = newGroup.id;

    const emptyGroup = await prisma.group.create({
      data: { name: 'Empty Group', branchId: testBranchId },
    });
    groupWithoutVendors = emptyGroup.id;

    const vendorRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Vendor In Group',
        email: 'vendor-in-group-test@example.com',
        password: 'password123',
        role: 'VENDOR',
        groupIds: [groupWithVendors],
      });
    vendorId = vendorRes.body.data.id;

    const coordRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Coord With Groups',
        email: 'coord-with-groups-test@example.com',
        password: 'password123',
        role: 'COORDINATOR',
        groupIds: [groupWithVendors, groupWithoutVendors],
      });
    coordId = coordRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.groupVendor.deleteMany({ where: { userId: { in: [coordId, vendorId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [coordId, vendorId] } } });
    await prisma.group.deleteMany({ where: { id: { in: [groupWithVendors, groupWithoutVendors] } } });
  });

  it('should reject removing a group that has vendors from a coordinator', async () => {
    const res = await request(app)
      .put(`/api/users/${coordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupIds: [groupWithoutVendors] });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Cannot remove groups with active vendors/i);
  });

  it('should allow removing a group without vendors from a coordinator', async () => {
    const res = await request(app)
      .put(`/api/users/${coordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupIds: [groupWithVendors] });

    expect(res.status).toBe(200);
    expect(res.body.data.groups).toHaveLength(1);
    expect(res.body.data.groups[0].id).toBe(groupWithVendors);
  });

  it('should allow adding new groups without restriction', async () => {
    const res = await request(app)
      .put(`/api/users/${coordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupIds: [groupWithVendors, groupWithoutVendors] });

    expect(res.status).toBe(200);
    expect(res.body.data.groups).toHaveLength(2);
  });
});
