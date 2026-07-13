const EventEmitter = require('events');
const slaService = require('../../src/services/sla.service');
const prisma = require('../../src/config/database');
const ApiError = require('../../src/utils/ApiError');

jest.mock('../../src/config/database', () => ({
  slaConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  conversation: {
    findMany: jest.fn(),
  }
}));

describe('SlaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    slaService.configCache.clear();
    slaService.notifiedBreaches.clear();
  });

  describe('getSlaConfig', () => {
    it('should throw if tenantId is missing', async () => {
      await expect(slaService.getSlaConfig()).rejects.toThrow(ApiError);
      await expect(slaService.getSlaConfig()).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return default config if none exists', async () => {
      prisma.slaConfig.findUnique.mockResolvedValue(null);
      const config = await slaService.getSlaConfig('tenant-1');
      expect(config).toEqual({ firstResponseMins: 15, resolutionMins: 60, tenantId: 'tenant-1' });
      expect(prisma.slaConfig.findUnique).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
    });

    it('should return existing config', async () => {
      prisma.slaConfig.findUnique.mockResolvedValue({
        tenantId: 'tenant-1',
        firstResponseMins: 10,
        resolutionMins: 30
      });
      const config = await slaService.getSlaConfig('tenant-1');
      expect(config.firstResponseMins).toBe(10);
      expect(config.resolutionMins).toBe(30);
    });
  });

  describe('updateSlaConfig', () => {
    it('should throw if tenantId is missing', async () => {
      await expect(slaService.updateSlaConfig(null, { firstResponseMins: 10 })).rejects.toThrow(ApiError);
    });

    it('should throw if minutes are invalid or out of bounds', async () => {
      await expect(slaService.updateSlaConfig('tenant-1', { firstResponseMins: -5 })).rejects.toThrow(/integer between 1/);
      await expect(slaService.updateSlaConfig('tenant-1', { resolutionMins: 0 })).rejects.toThrow(/integer between 1/);
      await expect(slaService.updateSlaConfig('tenant-1', { resolutionMins: 20000 })).rejects.toThrow(/integer between 1/);
      await expect(slaService.updateSlaConfig('tenant-1', { firstResponseMins: 1.5 })).rejects.toThrow(/integer between 1/);
    });

    it('should throw if first response is greater than resolution', async () => {
      await expect(slaService.updateSlaConfig('tenant-1', { firstResponseMins: 60, resolutionMins: 30 })).rejects.toThrow(/cannot be greater than/);
    });

    it('should upsert config with valid data', async () => {
      prisma.slaConfig.upsert.mockResolvedValue({
        tenantId: 'tenant-1',
        firstResponseMins: 20,
        resolutionMins: 120
      });

      const data = { firstResponseMins: 20, resolutionMins: 120 };
      const config = await slaService.updateSlaConfig('tenant-1', data);

      expect(config.firstResponseMins).toBe(20);
      expect(prisma.slaConfig.upsert).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        update: { firstResponseMins: 20, resolutionMins: 120 },
        create: { tenantId: 'tenant-1', firstResponseMins: 20, resolutionMins: 120 }
      });
    });

    it('should handle partial updates in upsert', async () => {
      prisma.slaConfig.upsert.mockResolvedValue({});
      await slaService.updateSlaConfig('tenant-1', { firstResponseMins: 5 });

      expect(prisma.slaConfig.upsert).toHaveBeenCalledWith(expect.objectContaining({
        update: { firstResponseMins: 5 },
        create: { tenantId: 'tenant-1', firstResponseMins: 5, resolutionMins: 60 } // Default for resolution if missing
      }));
    });
  });

  describe('SLA Monitor', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(slaService, 'emit');
    });

    afterEach(() => {
      slaService.stopMonitor();
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('should emit firstResponse breach for PENDING_ASSIGNMENT', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      prisma.slaConfig.findUnique.mockResolvedValue(
        { tenantId: 't1', firstResponseMins: 15, resolutionMins: 60 }
      );
      
      prisma.conversation.findMany.mockResolvedValue([
        {
          id: 'c1',
          tenantId: 't1',
          status: 'PENDING_ASSIGNMENT',
          lastMessageAt: new Date(now - 20 * 60 * 1000) // 20 mins ago (breached)
        },
        {
          id: 'c2',
          tenantId: 't1',
          status: 'PENDING_ASSIGNMENT',
          lastMessageAt: new Date(now - 10 * 60 * 1000) // 10 mins ago (ok)
        }
      ]);

      slaService.startMonitor(1000);
      
      await jest.advanceTimersByTimeAsync(1000);

      expect(prisma.conversation.findMany).toHaveBeenCalled();
      expect(slaService.emit).toHaveBeenCalledWith('alerts:breach', expect.objectContaining({
        type: 'SLA_BREACH',
        tenantId: 't1',
        payload: {
          conversationId: 'c1',
          metric: 'firstResponse',
          excessMinutes: 5
        }
      }));
      expect(slaService.emit).not.toHaveBeenCalledWith('alerts:breach', expect.objectContaining({
        payload: expect.objectContaining({ conversationId: 'c2' })
      }));
    });

    it('should emit resolution breach for ACTIVE', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      prisma.slaConfig.findUnique.mockResolvedValue(
        { tenantId: 't1', firstResponseMins: 15, resolutionMins: 60 }
      );
      
      prisma.conversation.findMany.mockResolvedValue([
        {
          id: 'c3',
          tenantId: 't1',
          status: 'ACTIVE',
          createdAt: new Date(now - 70 * 60 * 1000) // 70 mins ago (breached)
        },
        {
          id: 'c4',
          tenantId: 't1',
          status: 'ACTIVE',
          createdAt: new Date(now - 50 * 60 * 1000) // 50 mins ago (ok)
        }
      ]);

      slaService.startMonitor(1000);
      
      await jest.advanceTimersByTimeAsync(1000);

      expect(slaService.emit).toHaveBeenCalledWith('alerts:breach', expect.objectContaining({
        type: 'SLA_BREACH',
        tenantId: 't1',
        payload: {
          conversationId: 'c3',
          metric: 'resolution',
          excessMinutes: 10
        }
      }));
      expect(slaService.emit).not.toHaveBeenCalledWith('alerts:breach', expect.objectContaining({
        payload: expect.objectContaining({ conversationId: 'c4' })
      }));
    });

    it('should fallback to default config if missing and still emit breaches', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      // Return null to simulate missing config
      prisma.slaConfig.findUnique.mockResolvedValue(null);
      
      prisma.conversation.findMany.mockResolvedValue([
        {
          id: 'c5',
          tenantId: 't2',
          status: 'PENDING_ASSIGNMENT',
          lastMessageAt: new Date(now - 25 * 60 * 1000) // 25 mins ago (breached default 15 min)
        }
      ]);

      slaService.startMonitor(1000);
      
      await jest.advanceTimersByTimeAsync(1000);

      expect(slaService.emit).toHaveBeenCalledWith('alerts:breach', expect.objectContaining({
        type: 'SLA_BREACH',
        tenantId: 't2',
        payload: {
          conversationId: 'c5',
          metric: 'firstResponse',
          excessMinutes: 10 // 25 - 15 = 10
        }
      }));
    });
  });
});
