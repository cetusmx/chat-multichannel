const { createUser, updateUser, reactivateUser } = require('./users.service');
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

jest.mock('../config/database', () => ({
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  tenant: {
    findUnique: jest.fn(),
  },
  group: {
    count: jest.fn(),
  },
  groupVendor: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('users.service quota enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => {
      // Pass a mocked tx object
      return callback({
        $queryRaw: prisma.$queryRaw,
        tenant: prisma.tenant,
        user: prisma.user,
        group: prisma.group,
        groupVendor: prisma.groupVendor,
      });
    });
  });

  const validUser = { name: 'Test', email: 'test@example.com', password: 'password123', role: 'ADMIN' };

  describe('Limits (under, exact, over)', () => {
    it('under limit: should succeed', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: 5 }]);
      prisma.user.count.mockResolvedValue(3); // 3 active + 1 new = 4 <= 5
      prisma.user.create.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
      
      const res = await createUser(validUser, 't1', 'ADMIN');
      expect(res.id).toBe('u1');
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { tenantId: 't1', isActive: true } });
    });

    it('exact limit: should fail when trying to exceed', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: 5 }]);
      prisma.user.count.mockResolvedValue(5); // 5 active + 1 new = 6 > 5
      
      await expect(createUser(validUser, 't1', 'ADMIN'))
        .rejects.toMatchObject({ status: 403, code: 'QUOTA_EXCEEDED' });
    });
  });

  describe('Edge limits (-1, 0)', () => {
    it('edge limit -1: should skip quota check', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: -1 }]);
      prisma.user.create.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
      
      await createUser(validUser, 't1', 'ADMIN');
      // Count should NOT be called
      expect(prisma.user.count).not.toHaveBeenCalled();
    });

    it('edge limit 0: should immediately throw QUOTA_EXCEEDED', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: 0 }]);
      
      await expect(createUser(validUser, 't1', 'ADMIN'))
        .rejects.toMatchObject({ status: 403, code: 'QUOTA_EXCEEDED' });
      expect(prisma.user.count).not.toHaveBeenCalled();
    });
  });

  describe('Pending invitations', () => {
    it('should query explicitly for isActive: true, ignoring pending/inactive', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: 5 }]);
      prisma.user.count.mockResolvedValue(2);
      prisma.user.create.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
      
      await createUser(validUser, 't1', 'ADMIN');
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { tenantId: 't1', isActive: true } });
    });
  });

  describe('Reactivation Loophole', () => {
    it('should bypass quota check if user is already active', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
      
      await reactivateUser('u1', 't1', 'ADMIN');
    });

    it('should throw QUOTA_EXCEEDED when reactivating an inactive user if quota is full', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', isActive: false, role: 'ADMIN' });
      prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: 5 }]);
      prisma.user.count.mockResolvedValue(5);
      
      await expect(reactivateUser('u1', 't1', 'ADMIN'))
        .rejects.toMatchObject({ status: 403, code: 'QUOTA_EXCEEDED' });
    });

    it('should enforce quota in updateUser if isActive changes from false to true', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', isActive: false, role: 'ADMIN' });
      prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: 5 }]);
      prisma.user.count.mockResolvedValue(5);

      await expect(updateUser('u1', 't1', 'ADMIN', { isActive: true }))
        .rejects.toMatchObject({ status: 403, code: 'QUOTA_EXCEEDED' });
    });
  });

  describe('Bulk creation', () => {
    it('should throw QUOTA_EXCEEDED if bulk array size exceeds available quota', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: 5 }]);
      prisma.user.count.mockResolvedValue(4);
      
      const bulkUsers = [validUser, { ...validUser, email: 'test2@example.com' }];
      await expect(createUser(bulkUsers, 't1', 'ADMIN'))
        .rejects.toMatchObject({ status: 403, code: 'QUOTA_EXCEEDED' });
    });

    it('should succeed if bulk array fits inside quota', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: 5 }]);
      prisma.user.count.mockResolvedValue(3);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.create.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
      
      const bulkUsers = [validUser, { ...validUser, email: 'test2@example.com' }];
      await createUser(bulkUsers, 't1', 'ADMIN');
      
      expect(prisma.user.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Transaction concurrency lock', () => {
    it('should execute SELECT FOR UPDATE raw query on tenant', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1', maxUsers: 5 }]);
      prisma.user.count.mockResolvedValue(1);
      prisma.user.create.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
      
      await createUser(validUser, 't1', 'ADMIN');
      
      expect(prisma.$queryRaw).toHaveBeenCalled();
      const callArgs = prisma.$queryRaw.mock.calls[0][0];
      // Test that the raw query uses FOR UPDATE (it's a Prisma.sql object)
      expect(callArgs.text).toContain('FOR UPDATE');
    });

    it('should convert transaction timeout or deadlock errors into 409 Conflict', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('timeout'));
      
      await expect(createUser(validUser, 't1', 'ADMIN'))
        .rejects.toMatchObject({ status: 409, message: 'System busy, please try again' });
    });
  });
});
