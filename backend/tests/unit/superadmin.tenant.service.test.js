const superadminTenantService = require('../../src/services/superadmin.tenant.service');
const prisma = require('../../src/config/database');

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('mock_salt'),
  hash: jest.fn().mockResolvedValue('mock_hashed_password'),
}));

jest.mock('../../src/config/database', () => ({
  $transaction: jest.fn(),
  tenant: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  user: {
    create: jest.fn(),
  }
}));

describe('Superadmin Tenant Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTenants', () => {
    it('should return paginated tenants with default options', async () => {
      const mockTenants = [{ id: '1', name: 'Tenant 1' }];
      prisma.tenant.findMany.mockResolvedValue(mockTenants);
      prisma.tenant.count.mockResolvedValue(1);

      const result = await superadminTenantService.getTenants({});

      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          domain: true,
          createdAt: true,
          status: true,
        },
      });
      expect(prisma.tenant.count).toHaveBeenCalledWith();
      expect(result).toEqual({
        data: mockTenants,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
        },
      });
    });

    it('should apply custom pagination and sorting', async () => {
      const mockTenants = [{ id: '2', name: 'Tenant 2' }];
      prisma.tenant.findMany.mockResolvedValue(mockTenants);
      prisma.tenant.count.mockResolvedValue(5);

      const result = await superadminTenantService.getTenants({
        page: 2,
        limit: 5,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          domain: true,
          createdAt: true,
          status: true,
        },
      });
      expect(result.meta).toEqual({
        total: 5,
        page: 2,
        limit: 5,
      });
    });
  });

  describe('createTenantWithAdmin', () => {
    it('should create a tenant and an admin user within a transaction', async () => {
      const mockTenant = { id: 't1', name: 'Acme', domain: 'acme', status: 'ACTIVE' };
      const mockUser = {
        id: 'u1',
        name: 'John Doe',
        email: 'john@acme.com',
        role: 'ADMIN',
        tenantId: 't1',
        isActive: true,
      };

      prisma.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prisma);
      });
      prisma.tenant.create = jest.fn().mockResolvedValue(mockTenant);
      prisma.user.create = jest.fn().mockResolvedValue(mockUser);

      const tenantData = {
        name: 'Acme',
        domain: 'acme',
        adminName: 'John Doe',
        adminEmail: 'john@acme.com',
        password: 'plain_password',
      };

      const result = await superadminTenantService.createTenantWithAdmin(tenantData);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.tenant.create).toHaveBeenCalledWith({
        data: {
          name: 'Acme',
          domain: 'acme',
          status: 'active',
        },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@acme.com',
          passwordHash: 'mock_hashed_password',
          role: 'ADMIN',
          tenantId: 't1',
          isActive: true,
          emailVerified: expect.any(Date),
        },
      });
      expect(result).toEqual({ tenant: mockTenant, user: mockUser });
    });

    it('should propagate errors from the transaction', async () => {
      const dbError = new Error('Database Error');
      prisma.$transaction = jest.fn().mockRejectedValue(dbError);

      const tenantData = {
        name: 'Acme',
        domain: 'acme',
        adminName: 'John Doe',
        adminEmail: 'john@acme.com',
        password: 'plain_password',
      };

      await expect(superadminTenantService.createTenantWithAdmin(tenantData)).rejects.toThrow('Database Error');
    });
  });
});
