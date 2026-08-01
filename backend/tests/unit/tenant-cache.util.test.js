const { getTenantStatus, setTenantStatus, invalidateTenantCache, getTenantStatusAsync } = require('../../src/utils/tenant-cache.util');
const prisma = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
  tenant: {
    findUnique: jest.fn(),
  },
}));

describe('Tenant Cache Utility', () => {
  afterEach(() => {
    jest.clearAllMocks();
    // Invalidate everything used in tests
    invalidateTenantCache('tenant-1');
    invalidateTenantCache('tenant-2');
  });

  describe('getTenantStatusAsync (Thundering Herd Mitigation)', () => {
    it('should return cached status if available without hitting db', async () => {
      setTenantStatus('tenant-1', 'suspended');
      const status = await getTenantStatusAsync('tenant-1');
      expect(status).toBe('suspended');
      expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    });

    it('should deduplicate multiple concurrent fetch requests for the same tenant', async () => {
      prisma.tenant.findUnique.mockImplementation(async () => {
        // delay to simulate slow db
        await new Promise((r) => setTimeout(r, 50));
        return { status: 'active' };
      });

      // Fire 5 concurrent requests
      const promises = [
        getTenantStatusAsync('tenant-2'),
        getTenantStatusAsync('tenant-2'),
        getTenantStatusAsync('tenant-2'),
        getTenantStatusAsync('tenant-2'),
        getTenantStatusAsync('tenant-2'),
      ];

      const results = await Promise.all(promises);

      // All should return 'active'
      expect(results).toEqual(['active', 'active', 'active', 'active', 'active']);
      // But DB should only be queried exactly once
      expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should safely return null if tenant does not exist to fail closed', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      const status = await getTenantStatusAsync('non-existent');
      expect(status).toBeNull();
    });

    it('should throw and clean up pending fetch map if DB throws', async () => {
      prisma.tenant.findUnique.mockRejectedValue(new Error('DB connection failed'));
      
      await expect(getTenantStatusAsync('tenant-error')).rejects.toThrow('DB connection failed');
      
      // Secondary request should attempt again since map is cleared on error
      prisma.tenant.findUnique.mockResolvedValue({ status: 'active' });
      const status = await getTenantStatusAsync('tenant-error');
      expect(status).toBe('active');
      expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
