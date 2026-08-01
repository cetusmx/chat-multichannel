process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
const whatsappService = require('../src/services/whatsapp.service');
const { PrismaClient } = require('@prisma/client');
const logger = require('../src/utils/logger');

jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    whatsAppConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
    }
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

const prisma = new PrismaClient();

describe('WhatsApp Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return config for a valid tenantId', async () => {
      const mockConfig = { tenantId: 'tenant-123', phoneNumberId: '123' };
      prisma.whatsAppConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await whatsappService.getConfig('tenant-123');
      
      expect(prisma.whatsAppConfig.findUnique).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123' }
      });
      expect(result).toEqual(mockConfig);
    });

    it('should log and throw error if prisma fails', async () => {
      const error = new Error('DB Error');
      prisma.whatsAppConfig.findUnique.mockRejectedValue(error);

      // spy on logger.error
      const loggerSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      await expect(whatsappService.getConfig('tenant-123')).rejects.toThrow('DB Error');
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('verifyWebhook', () => {
    it('should return challenge if token matches', async () => {
      const mockConfig = { tenantId: 'tenant-123', verifyToken: 'my-secret' };
      prisma.whatsAppConfig.findUnique.mockResolvedValue(mockConfig);

      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'my-secret',
        'hub.challenge': '123456789'
      };

      const result = await whatsappService.verifyWebhook(query, 'tenant-123');
      expect(result).toBe('123456789');
    });

    it('should throw 403 error if token does not match', async () => {
      const mockConfig = { tenantId: 'tenant-123', verifyToken: 'my-secret' };
      prisma.whatsAppConfig.findUnique.mockResolvedValue(mockConfig);

      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-secret',
        'hub.challenge': '123456789'
      };

      await expect(whatsappService.verifyWebhook(query, 'tenant-123')).rejects.toThrow('Verification failed');
    });
  });

  describe('handleIncomingMessage', () => {
    it('should return false early if tenant is suspended', async () => {
      // Mock tenant to be suspended
      prisma.tenant.findUnique.mockResolvedValue({ status: 'suspended' });
      
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{ changes: [{ value: { messages: [{ text: { body: 'hello' } }] } }] }]
      };

      const result = await whatsappService.handleIncomingMessage(payload, 'tenant-123');
      expect(result).toBe(false);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        select: { status: true }
      });
    });
  });

  describe('sendMessage', () => {
    it('should throw TENANT_SUSPENDED error if tenant is suspended', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ tenantId: 'tenant-123', client: { isBlocked: false } });
      prisma.tenant.findUnique.mockResolvedValue({ status: 'suspended' });
      await expect(whatsappService.sendMessage('tenant-123', 'client-123', 'hello'))
        .rejects
        .toMatchObject({ code: 'TENANT_SUSPENDED' });
    });
  });

  describe('sendMedia', () => {
    it('should throw TENANT_SUSPENDED error if tenant is suspended', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ tenantId: 'tenant-123', client: { isBlocked: false } });
      prisma.tenant.findUnique.mockResolvedValue({ status: 'suspended' });
      
      const dummyFile = { path: '/tmp/test.jpg', mimetype: 'image/jpeg', originalname: 'test.jpg' };
      
      await expect(whatsappService.sendMedia('conv-123', dummyFile, 'caption', 'agent-1'))
        .rejects
        .toMatchObject({ code: 'TENANT_SUSPENDED' });
    });
  });
});
