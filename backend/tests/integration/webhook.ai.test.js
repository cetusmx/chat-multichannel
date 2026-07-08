const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const aiService = require('../../src/services/ai.service');
const { getIo } = require('../../src/socket');

jest.mock('../../src/services/ai.service', () => ({
  generateAutoResponse: jest.fn()
}));

jest.mock('../../src/socket', () => ({
  getIo: jest.fn(() => ({
    of: jest.fn().mockReturnThis(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
  })),
  initSocket: jest.fn()
}));

describe('Webhook AI Auto-Response', () => {
  let tenant;

  beforeAll(async () => {
    tenant = await prisma.tenant.upsert({
      where: { domain: 'ai.test' },
      update: {},
      create: { name: 'AI Test Tenant', domain: 'ai.test' }
    });

    await prisma.whatsAppConfig.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        phoneNumberId: '12345',
        accessToken: 'dummy-token',
        verifyToken: 'dummy-verify'
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger AI auto-response for unassigned conversation', async () => {
    aiService.generateAutoResponse.mockResolvedValue('Hello from AI');

    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '5215555555555',
              id: 'wamid.123',
              type: 'text',
              text: { body: 'I need help' }
            }],
            contacts: [{
              profile: { name: 'Test User' }
            }]
          }
        }]
      }]
    };

    // Need to mock fetch for sendMessage
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        messages: [{ id: 'wamid.ai.123' }]
      })
    });

    const res = await request(app)
      .post(`/api/whatsapp/webhook/${tenant.id}`)
      .send(payload);

    expect(res.status).toBe(200);

    // Wait for async execution using polling
    let messages = [];
    let conversation;
    try {
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        conversation = await prisma.conversation.findFirst({
          where: { tenantId: tenant.id }
        });
        if (conversation) {
          messages = await prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'asc' }
          });
          if (messages.length === 2) break;
        }
      }
    } finally {
      global.fetch = originalFetch;
    }

    expect(conversation).toBeDefined();
    expect(aiService.generateAutoResponse).toHaveBeenCalledWith(tenant.id, expect.any(String), 'I need help', { isOffHours: false });

    expect(messages.length).toBe(2);
    expect(messages[0].senderType).toBe('CLIENT');
    expect(messages[0].content).toBe('I need help');
    expect(messages[1].senderType).toBe('IA');
    expect(messages[1].content).toBe('Hello from AI');
  });

  it('should intercept [[ESCALATE]] token, sanitize message, and update aiPendingEscalation', async () => {
    aiService.generateAutoResponse.mockResolvedValue('Here is the info. [[ESCALATE]]');

    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '5215555555556',
              id: 'wamid.456',
              type: 'text',
              text: { body: 'I want to talk to a human' }
            }],
            contacts: [{
              profile: { name: 'Escalate User' }
            }]
          }
        }]
      }]
    };

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        messages: [{ id: 'wamid.ai.456' }]
      })
    });

    let messages = [];
    let conversation;

    const res = await request(app)
      .post(`/api/whatsapp/webhook/${tenant.id}`)
      .send(payload);

    expect(res.status).toBe(200);

    try {
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        conversation = await prisma.conversation.findFirst({
          where: { tenantId: tenant.id, client: { phoneNumber: '5215555555556' } }
        });
        if (conversation) {
          messages = await prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'asc' }
          });
          if (messages.length === 2 && conversation.aiPendingEscalation) break;
        }
      }
    } finally {
      global.fetch = originalFetch;
    }

    expect(conversation).toBeDefined();
    expect(conversation.aiPendingEscalation).toBe(true);
    expect(messages.length).toBe(2);
    expect(messages[1].senderType).toBe('IA');
    expect(messages[1].content).toBe('Here is the info.');
  });

  afterAll(async () => {
    if (tenant) {
      await prisma.message.deleteMany({ where: { conversation: { tenantId: tenant.id } } });
      await prisma.conversation.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.client.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.whatsAppConfig.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    }
  });
});
