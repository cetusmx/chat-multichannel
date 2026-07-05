const whatsappService = require('../src/services/whatsapp.service');
const { PrismaClient } = require('@prisma/client');

jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    whatsAppConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
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

      // spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(whatsappService.getConfig('tenant-123')).rejects.toThrow('DB Error');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
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
});
