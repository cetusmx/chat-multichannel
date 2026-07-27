const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../../src/app');

const prisma = new PrismaClient();

jest.mock('../../src/middleware/auth', () => (req, res, next) => {
  if (req.headers.authorization === 'Bearer admin-token') {
    req.user = { id: 'admin-1', role: 'ADMIN', tenantId: 'tenant-1' };
  } else if (req.headers.authorization === 'Bearer vendor-token') {
    req.user = { id: 'vendor-1', role: 'VENDOR', tenantId: 'tenant-1' };
  } else {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
});

jest.mock('../../src/middleware/rbac', () => (...allowed) => (req, res, next) => {
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  next();
});

describe('Canned Responses API', () => {
  let cannedId;

  beforeAll(async () => {
    // Inject mock properties if they don't exist (due to lack of prisma generate locally)
    if (!prisma.cannedResponse) prisma.cannedResponse = {};
    if (!prisma.cannedResponseUsage) prisma.cannedResponseUsage = {};
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/canned-responses should create a new response if admin', async () => {
    prisma.cannedResponse.create = jest.fn().mockResolvedValue({
      id: 'canned-1',
      tenantId: 'tenant-1',
      title: 'Saludo',
      content: 'Hola',
      shortcut: '/hola'
    });

    const res = await request(app)
      .post('/api/canned-responses')
      .set('Authorization', 'Bearer admin-token')
      .send({ title: 'Saludo', content: 'Hola', shortcut: '/hola' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('canned-1');
  });

  it('POST /api/canned-responses should deny if vendor', async () => {
    const res = await request(app)
      .post('/api/canned-responses')
      .set('Authorization', 'Bearer vendor-token')
      .send({ title: 'Saludo', content: 'Hola', shortcut: '/hola' });

    expect(res.status).toBe(403);
  });

  it('GET /api/canned-responses should return responses for tenant', async () => {
    prisma.cannedResponse.findMany = jest.fn().mockResolvedValue([
      { id: 'canned-1', title: 'Saludo', content: 'Hola' }
    ]);

    const res = await request(app)
      .get('/api/canned-responses')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/canned-responses/my-usage should return ordered responses', async () => {
    prisma.cannedResponse.findMany = jest.fn().mockResolvedValue([
      { id: 'canned-1', title: 'Saludo', content: 'Hola' },
      { id: 'canned-2', title: 'Despedida', content: 'Adios' }
    ]);
    prisma.cannedResponseUsage.findMany = jest.fn().mockResolvedValue([
      { cannedResponseId: 'canned-2', useCount: 5, lastUsedAt: new Date() }
    ]);

    const res = await request(app)
      .get('/api/canned-responses/my-usage')
      .set('Authorization', 'Bearer vendor-token');

    expect(res.status).toBe(200);
    // canned-2 should be first because of higher useCount
    expect(res.body.data[0].id).toBe('canned-2');
  });

  it('PUT /api/canned-responses/:id should update response if admin', async () => {
    prisma.cannedResponse.findFirst = jest.fn().mockResolvedValue({ id: 'canned-1' });
    prisma.cannedResponse.update = jest.fn().mockResolvedValue({ id: 'canned-1', title: 'Nuevo' });

    const res = await request(app)
      .put('/api/canned-responses/canned-1')
      .set('Authorization', 'Bearer admin-token')
      .send({ title: 'Nuevo' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Nuevo');
  });

  it('DELETE /api/canned-responses/:id should delete response if admin', async () => {
    prisma.cannedResponse.findFirst = jest.fn().mockResolvedValue({ id: 'canned-1' });
    prisma.cannedResponse.delete = jest.fn().mockResolvedValue({});

    const res = await request(app)
      .delete('/api/canned-responses/canned-1')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
  });

  it('POST /api/canned-responses/:id/use should record usage', async () => {
    prisma.cannedResponse.findFirst = jest.fn().mockResolvedValue({ id: 'canned-1' });
    prisma.cannedResponseUsage.upsert = jest.fn().mockResolvedValue({ id: 'usage-1' });

    const res = await request(app)
      .post('/api/canned-responses/canned-1/use')
      .set('Authorization', 'Bearer vendor-token');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('usage-1');
  });
});
