const quotaService = require('./quota.service');
const prisma = require('../config/database');

jest.mock('../config/database', () => ({
  tenant: {
    findUnique: jest.fn(),
    updateMany: jest.fn()
  }
}));

describe('QuotaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAiQuotaExceeded', () => {
    it('should block when quota is exceeded', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        maxAiTokens: 1000,
        currentMonthAiTokens: 1500,
        lastTokenResetDate: new Date(),
        licenseType: 'SUBSCRIPTION'
      });

      const exceeded = await quotaService.checkAiQuotaExceeded('tenant-1');
      expect(exceeded).toBe(true);
    });

    it('should NOT block for LIFETIME license even if quota is exceeded', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-2',
        maxAiTokens: 1000,
        currentMonthAiTokens: 1500,
        lastTokenResetDate: new Date(),
        licenseType: 'LIFETIME'
      });

      const exceeded = await quotaService.checkAiQuotaExceeded('tenant-2');
      expect(exceeded).toBe(false);
    });

    it('should reset tokens when a month has passed', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 2);

      prisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-3',
        maxAiTokens: 1000,
        currentMonthAiTokens: 1500,
        lastTokenResetDate: pastDate,
        licenseType: 'SUBSCRIPTION'
      });

      prisma.tenant.updateMany.mockResolvedValue({ count: 1 });

      const exceeded = await quotaService.checkAiQuotaExceeded('tenant-3');
      
      expect(prisma.tenant.updateMany).toHaveBeenCalled();
      expect(exceeded).toBe(false);
    });
  });
});
