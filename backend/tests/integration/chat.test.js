const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let adminToken;
let testTenantId;
let testClientId;
let testVendorId;
let testConversationId;
const createdMessageIds = [];

beforeAll(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { domain: 'demo.salesflow.app' } });
  testTenantId = tenant.id;

  adminToken = jwt.sign(
    { id: 'test-admin', tenantId: testTenantId, role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  // Setup client, vendor, and conversation
  const client = await prisma.client.create({
    data: {
      phoneNumber: '1234567890',
      name: 'Test Client',
      tenantId: testTenantId,
    }
  });
  testClientId = client.id;

  const vendor = await prisma.user.create({
    data: {
      email: 'vendor-chat-test@example.com',
      name: 'Vendor Chat Test',
      passwordHash: 'hash',
      role: 'VENDOR',
      tenantId: testTenantId,
    }
  });
  testVendorId = vendor.id;

  const conversation = await prisma.conversation.create({
    data: {
      clientId: testClientId,
      tenantId: testTenantId,
      status: 'ACTIVE',
    }
  });
  testConversationId = conversation.id;

  // Create 15 messages for pagination testing
  for (let i = 1; i <= 15; i++) {
    const msg = await prisma.message.create({
      data: {
        conversationId: testConversationId,
        content: `Message ${i}`,
        senderType: 'SYSTEM',
        status: 'DELIVERED',
        createdAt: new Date(Date.now() + i * 1000) // Ensure strictly ordered
      }
    });
    createdMessageIds.push(msg.id);
  }
});

afterAll(async () => {
  await prisma.message.deleteMany({ where: { id: { in: createdMessageIds } } });
  if (testConversationId) await prisma.conversation.delete({ where: { id: testConversationId } });
  if (testClientId) await prisma.client.delete({ where: { id: testClientId } });
  if (testVendorId) await prisma.user.delete({ where: { id: testVendorId } });
});

describe('GET /api/chat/:conversationId/messages', () => {
  it('should return paginated messages with cursor and limit', async () => {
    // Initial fetch, should fetch the latest 10 messages (from 6 to 15 in chronological order)
    const res = await request(app)
      .get(`/api/chat/${testConversationId}/messages?limit=10`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(10);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.hasMore).toBe(true);
    expect(res.body.meta.nextCursor).toBeDefined();

    // The returned messages should be the most recent ones, but in ascending chronological order (oldest to newest among the limit)
    // So if we have 15 messages, we expect message 6 to 15.
    expect(res.body.data[9].content).toBe('Message 15');
    expect(res.body.data[0].content).toBe('Message 6');

    // The cursor for the next fetch should be the ID of the oldest message in the current batch (Message 6)
    const nextCursor = res.body.data[0].id;
    expect(res.body.meta.nextCursor).toBe(nextCursor);

    // Fetch the next page using the cursor
    const res2 = await request(app)
      .get(`/api/chat/${testConversationId}/messages?limit=10&cursor=${nextCursor}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res2.status).toBe(200);
    expect(res2.body.data.length).toBe(5); // Only 5 messages remaining (1 to 5)
    expect(res2.body.meta.hasMore).toBe(false);
    expect(res2.body.meta.nextCursor).toBeNull();
    
    expect(res2.body.data[4].content).toBe('Message 5');
    expect(res2.body.data[0].content).toBe('Message 1');
  });

  it('should return all messages without pagination if no limit is provided, or a default limit (e.g. 50)', async () => {
    const res = await request(app)
      .get(`/api/chat/${testConversationId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(15);
    expect(res.body.meta.hasMore).toBe(false);
  });
});

describe('GET /api/chat/search', () => {
  it('should return 400 if query is missing', async () => {
    const res = await request(app)
      .get('/api/chat/search')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('should return matching messages across conversations for the tenant', async () => {
    const uniqueMsg = await prisma.message.create({
      data: {
        conversationId: testConversationId,
        content: `Searchable Keyword 123`,
        senderType: 'SYSTEM',
        status: 'DELIVERED'
      }
    });

    const res = await request(app)
      .get('/api/chat/search?q=Keyword 123')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].content).toContain('Keyword 123');
    
    await prisma.message.delete({ where: { id: uniqueMsg.id } });
  });

  it('should restrict search to assigned conversations for VENDOR role', async () => {
    const vendorToken = jwt.sign(
      { id: testVendorId, tenantId: testTenantId, role: 'VENDOR' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const vendorConv = await prisma.conversation.create({
      data: {
        clientId: testClientId,
        tenantId: testTenantId,
        vendorId: testVendorId,
        status: 'ACTIVE',
      }
    });
    const vendorMsg = await prisma.message.create({
      data: {
        conversationId: vendorConv.id,
        content: `Vendor specific secret word`,
        senderType: 'SYSTEM'
      }
    });

    const unassignedMsg = await prisma.message.create({
      data: {
        conversationId: testConversationId,
        content: `Vendor specific secret word unassigned`,
        senderType: 'SYSTEM'
      }
    });

    const res = await request(app)
      .get('/api/chat/search?q=Vendor specific secret')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    const matches = res.body.data;
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe(vendorMsg.id);

    await prisma.message.delete({ where: { id: vendorMsg.id } });
    await prisma.message.delete({ where: { id: unassignedMsg.id } });
    await prisma.conversation.delete({ where: { id: vendorConv.id } });
  });

  it('should allow COORDINATOR role to search across all conversations', async () => {
    const coordinatorToken = jwt.sign(
      { id: 'test-coordinator', tenantId: testTenantId, role: 'COORDINATOR' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a message in a conversation the coordinator is not assigned to
    const uniqueMsg = await prisma.message.create({
      data: {
        conversationId: testConversationId, // belongs to testTenantId
        content: `Coordinator Secret 445`,
        senderType: 'SYSTEM'
      }
    });

    const res = await request(app)
      .get('/api/chat/search?q=Coordinator Secret 445')
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(uniqueMsg.id);

    await prisma.message.delete({ where: { id: uniqueMsg.id } });
  });

  describe('Tags Endpoints', () => {
    it('should add a tag to a message', async () => {
      const msg = await prisma.message.create({
        data: {
          conversationId: testConversationId,
          content: 'Test tag message',
          senderType: 'SYSTEM'
        }
      });

      const res = await request(app)
        .post(`/api/chat/${testConversationId}/messages/${msg.id}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tag: 'Urgente' });

      expect(res.status).toBe(200);
      expect(res.body.data.tags).toContain('Urgente');

      await prisma.message.delete({ where: { id: msg.id } });
    });

    it('should remove a tag from a message', async () => {
      const msg = await prisma.message.create({
        data: {
          conversationId: testConversationId,
          content: 'Test untag message',
          senderType: 'SYSTEM',
          tags: ['Urgente', 'Normal']
        }
      });

      const res = await request(app)
        .delete(`/api/chat/${testConversationId}/messages/${msg.id}/tags/Urgente`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tags).not.toContain('Urgente');
      expect(res.body.data.tags).toContain('Normal');

      await prisma.message.delete({ where: { id: msg.id } });
    });
  });
});

describe('PATCH /api/chat/:conversationId/assign', () => {
  it('should allow COORDINATOR to reassign a conversation to a new vendor', async () => {
    const coordinatorToken = jwt.sign(
      { id: 'test-coordinator', tenantId: testTenantId, role: 'COORDINATOR' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const vendor2 = await prisma.user.create({
      data: {
        email: `vendor2_${Date.now()}@example.com`,
        name: 'Vendor 2',
        passwordHash: 'hash',
        role: 'VENDOR',
        tenantId: testTenantId,
      }
    });

    const res = await request(app)
      .patch(`/api/chat/${testConversationId}/assign`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ vendorId: vendor2.id });

    expect(res.status).toBe(200);
    expect(res.body.data.vendorId).toBe(vendor2.id);

    const updatedConv = await prisma.conversation.findUnique({ where: { id: testConversationId } });
    expect(updatedConv.vendorId).toBe(vendor2.id);

    await prisma.user.delete({ where: { id: vendor2.id } });
  });

  it('should prevent VENDOR from reassigning a conversation', async () => {
    const vendorToken = jwt.sign(
      { id: testVendorId, tenantId: testTenantId, role: 'VENDOR' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .patch(`/api/chat/${testConversationId}/assign`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ vendorId: testVendorId });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/conversations/:conversationId/ai-assist', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should allow assigned VENDOR to request an AI draft', async () => {
    const vendorToken = jwt.sign(
      { id: testVendorId, tenantId: testTenantId, role: 'VENDOR' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const vendorConv = await prisma.conversation.create({
      data: {
        clientId: testClientId,
        tenantId: testTenantId,
        vendorId: testVendorId,
        status: 'ACTIVE',
      }
    });

    const aiService = require('../../src/services/ai.service');
    jest.spyOn(aiService, 'generateInlineSuggestion').mockResolvedValue('Suggested vendor reply');

    try {
      const res = await request(app)
        .post(`/api/conversations/${vendorConv.id}/ai-assist`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ prompt: 'help me say hi' });

      expect(res.status).toBe(200);
      expect(res.body.draft).toBe('Suggested vendor reply');
      expect(aiService.generateInlineSuggestion).toHaveBeenCalledWith(testTenantId, vendorConv.id, 'help me say hi');
    } finally {
      await prisma.conversation.delete({ where: { id: vendorConv.id } });
    }
  });

  it('should return 400 if prompt is missing', async () => {
    const res = await request(app)
      .post(`/api/conversations/${testConversationId}/ai-assist`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({}); // missing prompt

    expect(res.status).toBe(400);
  });

  it('should return 404 if conversation does not exist', async () => {
    const res = await request(app)
      .post('/api/conversations/non-existent-conv/ai-assist')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ prompt: 'say hi' });

    expect(res.status).toBe(404);
  });

  it('should allow COORDINATOR to request an AI draft', async () => {
    const coordinatorToken = jwt.sign(
      { id: testVendorId, tenantId: testTenantId, role: 'COORDINATOR' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const aiService = require('../../src/services/ai.service');
    jest.spyOn(aiService, 'generateInlineSuggestion').mockResolvedValue('Suggested coordinator reply');

    const res = await request(app)
      .post(`/api/conversations/${testConversationId}/ai-assist`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ prompt: 'help me say hi' });

    expect(res.status).toBe(200);
    expect(res.body.draft).toBe('Suggested coordinator reply');
  });

  it('should prevent unassigned VENDOR from requesting an AI draft', async () => {
    const vendorToken = jwt.sign(
      { id: testVendorId, tenantId: testTenantId, role: 'VENDOR' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // testConversationId is unassigned to this vendor
    const res = await request(app)
      .post(`/api/conversations/${testConversationId}/ai-assist`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ prompt: 'help me say hi' });

    expect(res.status).toBe(403);
  });
});

describe('Escalation Flow in whatsapp.service.js', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update status to ESCALATED and emit chat:escalated socket event on [[ESCALATE]]', async () => {
    const whatsappService = require('../../src/services/whatsapp.service');
    const aiService = require('../../src/services/ai.service');
    const socket = require('../../src/socket');
    
    let uniqueClient;
    let testConv;
    
    try {
      uniqueClient = await prisma.client.create({
        data: {
          phoneNumber: '9998887776',
          name: 'Escalation Test Client',
          tenantId: testTenantId,
        }
      });

      // Create an unassigned conversation
      testConv = await prisma.conversation.create({
        data: {
          clientId: uniqueClient.id,
          tenantId: testTenantId,
          status: 'PENDING_ASSIGNMENT',
        }
      });

      jest.spyOn(aiService, 'generateAutoResponse').mockResolvedValue('I cannot help with that. [[ESCALATE]]');
      jest.spyOn(whatsappService, 'sendMessage').mockResolvedValue({});
      
      // Mock socket
      const mockTo = jest.fn().mockReturnThis();
      const mockEmit = jest.fn();
      jest.spyOn(socket, 'getIo').mockReturnValue({
        of: jest.fn().mockReturnValue({
          to: mockTo,
          emit: mockEmit
        })
      });

      // Simulate incoming message
      await whatsappService.handleIncomingMessage({
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '9998887776',
                id: 'wa-test-msg-123',
                type: 'text',
                text: { body: 'I need human help' },
                timestamp: Math.floor(Date.now() / 1000).toString()
              }],
              contacts: [{ profile: { name: 'Test' } }]
            }
          }]
        }]
      }, testTenantId);

      // Poll until the status is updated
      let updatedConv;
      for (let i = 0; i < 20; i++) {
        updatedConv = await prisma.conversation.findUnique({ where: { id: testConv.id } });
        if (updatedConv?.status === 'ESCALATED') break;
        await new Promise(r => setTimeout(r, 100));
      }

      expect(updatedConv.status).toBe('ESCALATED');
      expect(updatedConv.aiPendingEscalation).toBe(true);

      // Verify socket event
      expect(mockEmit).toHaveBeenCalledWith('chat:escalated', expect.objectContaining({
        type: 'ESCALATION_ALERT',
        payload: expect.objectContaining({
          conversationId: testConv.id,
          tenantId: testTenantId,
          reason: 'AI handoff requested'
        })
      }));
    } finally {
      if (testConv) {
        try { await prisma.message.deleteMany({ where: { conversationId: testConv.id } }); } catch (e) {}
        try { await prisma.conversation.delete({ where: { id: testConv.id } }); } catch (e) {}
      }
      if (uniqueClient) {
        try { await prisma.client.delete({ where: { id: uniqueClient.id } }); } catch (e) {}
      }
      jest.restoreAllMocks();
    }
  });
});
