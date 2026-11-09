const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('AI prompt configuration', () => {
  let tenantId;
  let adminId;
  let adminToken;
  let vendorToken;

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({ data: { name: 'Prompt Test', domain: `prompts-${Date.now()}.test` } });
    tenantId = tenant.id;
    const admin = await prisma.user.create({
      data: { name: 'Prompt Admin', email: `prompt-admin-${Date.now()}@test.local`, passwordHash: 'x', role: 'ADMIN', tenantId },
    });
    adminId = admin.id;
    adminToken = jwt.sign({ id: adminId, tenantId, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    vendorToken = jwt.sign({ id: 'ghost-vendor', tenantId, role: 'VENDOR' }, JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    await prisma.$disconnect();
  });

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  it('returns defaults, empty overrides and variables', async () => {
    const res = await request(app).get('/api/tenant/ai-prompts').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.defaults.agent.identity).toMatch(/\{\{company_name\}\}/);
    expect(res.body.data.overrides).toEqual({});
    expect(res.body.data.version).toBe(0);
    expect(res.body.data.variables.map((v) => v.name)).toContain('escalate_token');
    expect(res.body.data.escalateToken).toBe('[[ESCALATE]]');
  });

  it('is admin only', async () => {
    const res = await request(app).get('/api/tenant/ai-prompts').set(auth(vendorToken));
    expect(res.status).toBe(403);
  });

  it('rejects unknown keys and wrong types', async () => {
    const res = await request(app).put('/api/tenant/ai-prompts').set(auth(adminToken)).send({ overrides: { agent: { nope: 'x', identity: 5 } } });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining(['agent.nope: clave desconocida', 'agent.identity: debe ser texto']));
  });

  it('saves overrides as a version and merges them into the effective config', async () => {
    const res = await request(app).put('/api/tenant/ai-prompts').set(auth(adminToken))
      .send({ overrides: { agent: { identity: 'Eres Paco, asesor de {{company_name}}.' } }, note: 'primera' });
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.effective.agent.identity).toBe('Eres Paco, asesor de {{company_name}}.');
    expect(res.body.data.effective.agent.rules).toMatch(/REGLAS ESTRICTAS/); // untouched default

    const versions = await prisma.aiPromptVersion.findMany({ where: { tenantId } });
    expect(versions).toHaveLength(1);
    expect(versions[0].createdById).toBe(adminId);
  });

  it('previews the compiled instruction for a scenario without saving', async () => {
    const res = await request(app).post('/api/tenant/ai-prompts/preview').set(auth(adminToken))
      .send({ overrides: { agent: { identity: 'Soy preview de {{company_name}}.' } }, scenario: { is_off_hours: true, has_knowledge_context: false } });
    expect(res.status).toBe(200);
    expect(res.body.data.instruction).toMatch(/^Soy preview de Mi Empresa\./);
    expect(res.body.data.instruction).toMatch(/Al estar fuera de horario/);
    expect(res.body.data.instruction).toMatch(/no hay fragmentos relevantes/);
    expect(res.body.data.approxTokens).toBeGreaterThan(100);
    expect((await prisma.aiPromptConfig.findUnique({ where: { tenantId } })).version).toBe(1);
  });

  it('lists history and restores a version', async () => {
    await request(app).put('/api/tenant/ai-prompts').set(auth(adminToken)).send({ overrides: { agent: { identity: 'Segunda.' } } });
    const hist = await request(app).get('/api/tenant/ai-prompts/history').set(auth(adminToken));
    expect(hist.status).toBe(200);
    expect(hist.body.data.map((v) => v.version)).toEqual([2, 1]);
    expect(hist.body.data[1].createdBy.name).toBe('Prompt Admin');

    const restored = await request(app).post('/api/tenant/ai-prompts/restore/1').set(auth(adminToken));
    expect(restored.status).toBe(200);
    expect(restored.body.data.version).toBe(3);
    expect(restored.body.data.overrides.agent.identity).toBe('Eres Paco, asesor de {{company_name}}.');

    const missing = await request(app).post('/api/tenant/ai-prompts/restore/99').set(auth(adminToken));
    expect(missing.status).toBe(404);
  });

  it('resets to the base template', async () => {
    const res = await request(app).delete('/api/tenant/ai-prompts').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.overrides).toEqual({});
    const row = await prisma.aiPromptConfig.findUnique({ where: { tenantId } });
    expect(row.overrides).toEqual({});
    expect(row.version).toBe(4);
  });

  it('tolerates tokens whose user no longer exists', async () => {
    const ghostAdmin = jwt.sign({ id: 'ghost-admin', tenantId, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app).put('/api/tenant/ai-prompts').set(auth(ghostAdmin)).send({ overrides: { summary: 'Resumen corto.' } });
    expect(res.status).toBe(200);
    const last = await prisma.aiPromptVersion.findFirst({ where: { tenantId }, orderBy: { version: 'desc' } });
    expect(last.createdById).toBeNull();
  });
});
