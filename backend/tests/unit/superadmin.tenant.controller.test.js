const superadminTenantController = require('../../src/controllers/superadmin.tenant.controller');
const superadminTenantService = require('../../src/services/superadmin.tenant.service');
const { success, list } = require('../../src/utils/response');

jest.mock('../../src/services/superadmin.tenant.service');
jest.mock('../../src/utils/response');

describe('Superadmin Tenant Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTenants', () => {
    it('should retrieve tenants and return success response', async () => {
      const mockResult = {
        data: [{ id: '1', name: 'Tenant 1' }],
        meta: { total: 1, page: 1, limit: 10 },
      };
      superadminTenantService.getTenants.mockResolvedValue(mockResult);

      const req = {
        query: { page: '1', limit: '10', sortBy: 'name', sortOrder: 'asc' },
      };
      const res = {};
      const next = jest.fn();

      await superadminTenantController.getTenants(req, res, next);

      expect(superadminTenantService.getTenants).toHaveBeenCalledWith({
        page: '1',
        limit: '10',
        sortBy: 'name',
        sortOrder: 'asc',
      });
      expect(list).toHaveBeenCalledWith(res, mockResult.data, mockResult.meta);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing query parameters gracefully', async () => {
      const mockResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 10 },
      };
      superadminTenantService.getTenants.mockResolvedValue(mockResult);

      const req = { query: {} };
      const res = {};
      const next = jest.fn();

      await superadminTenantController.getTenants(req, res, next);

      expect(superadminTenantService.getTenants).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
      expect(list).toHaveBeenCalledWith(res, mockResult.data, mockResult.meta);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Database failure');
      superadminTenantService.getTenants.mockRejectedValue(error);

      const req = { query: {} };
      const res = {};
      const next = jest.fn();

      await superadminTenantController.getTenants(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(success).not.toHaveBeenCalled();
      expect(list).not.toHaveBeenCalled();
    });
  });

  describe('createTenant', () => {
    const validPayload = {
      name: 'Acme Corp',
      slug: 'acmecorp',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@acme.com',
      password: 'Password123!',
    };

    it('should validate payload, hash password, create tenant, and return 201 stripped of passwordHash', async () => {
      const mockResult = {
        tenant: { id: 't1', name: 'Acme Corp', domain: 'acmecorp', status: 'ACTIVE' },
        user: { id: 'u1', name: 'John Doe', email: 'john@acme.com', passwordHash: 'hashed', role: 'ADMIN' },
      };
      superadminTenantService.createTenantWithAdmin.mockResolvedValue(mockResult);

      const req = { body: validPayload };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await superadminTenantController.createTenant(req, res, next);

      expect(superadminTenantService.createTenantWithAdmin).toHaveBeenCalled();
      
      const successArg = success.mock.calls[0][1];
      expect(successArg.tenant).toBeDefined();
      expect(successArg.user.passwordHash).toBeUndefined();
      expect(successArg.user.name).toBe('John Doe');
    });

    it('should return 400 for Zod validation errors', async () => {
      const req = { body: { name: 'A' } }; // invalid name
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await superadminTenantController.createTenant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'Validation failed'
        })
      }));
    });

    it('should return 409 for unique constraint violations (P2002)', async () => {
      const dbError = new Error('Unique constraint failed on the fields: (`domain`)');
      dbError.code = 'P2002';
      dbError.meta = { target: ['domain'] };
      superadminTenantService.createTenantWithAdmin.mockRejectedValue(dbError);

      const req = { body: validPayload };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await superadminTenantController.createTenant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'Conflict: domain already exists'
        })
      }));
    });
    
    it('should return 500 for other errors', async () => {
      const dbError = new Error('Database Error');
      superadminTenantService.createTenantWithAdmin.mockRejectedValue(dbError);

      const req = { body: validPayload };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await superadminTenantController.createTenant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'Database Error'
        })
      }));
    });
  });

  describe('updateTenantStatus', () => {
    it('should validate status and update tenant', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const mockResult = { id: validUuid, status: 'suspended' };
      superadminTenantService.updateTenantStatus.mockResolvedValue(mockResult);

      const req = { params: { id: validUuid }, body: { status: 'suspended' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await superadminTenantController.updateTenantStatus(req, res, next);

      expect(superadminTenantService.updateTenantStatus).toHaveBeenCalledWith(validUuid, 'suspended');
      expect(success).toHaveBeenCalledWith(res, mockResult);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 for Zod validation error if status is invalid', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const req = { params: { id: validUuid }, body: { status: 'invalid_status' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await superadminTenantController.updateTenantStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'Validation failed'
        })
      }));
    });

    it('should return 404 if service throws 404', async () => {
      const error = new Error('Tenant not found');
      error.statusCode = 404;
      superadminTenantService.updateTenantStatus.mockRejectedValue(error);

      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const req = { params: { id: validUuid }, body: { status: 'suspended' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await superadminTenantController.updateTenantStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'Tenant not found'
        })
      }));
    });
  });
});
