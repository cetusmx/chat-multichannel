const slaService = require('../../src/services/sla.service');
const prisma = require('../../src/config/database');
const ApiError = require('../../src/utils/ApiError');

jest.mock('../../src/config/database', () => ({
  slaConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  }
}));

describe('SlaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSlaConfig', () => {
    it('should throw if tenantId is missing', async () => {
      await expect(slaService.getSlaConfig()).rejects.toThrow(ApiError);
      await expect(slaService.getSlaConfig()).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return default config if none exists', async () => {
      prisma.slaConfig.findUnique.mockResolvedValue(null);
      const config = await slaService.getSlaConfig('tenant-1');
      expect(config).toEqual({ firstResponseMins: 15, resolutionMins: 60 });
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
});
