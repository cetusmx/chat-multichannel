const authenticate = require('../../src/middleware/auth');
const { getTenantStatusAsync } = require('../../src/utils/tenant-cache.util');
const jwt = require('jsonwebtoken');

jest.mock('../../src/utils/tenant-cache.util', () => ({
  getTenantStatusAsync: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if no token provided', async () => {
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('should bypass tenant check for superadmins', async () => {
    req.headers.authorization = 'Bearer test-token';
    jwt.verify.mockReturnValue({ id: '1', role: 'SUPERADMIN' });

    await authenticate(req, res, next);

    expect(getTenantStatusAsync).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(); // success
  });

  it('should return 403 if non-superadmin token is missing tenantId', async () => {
    req.headers.authorization = 'Bearer test-token';
    // User is missing tenantId
    jwt.verify.mockReturnValue({ id: '2', role: 'ADMIN' });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ 
      status: 403, 
      message: 'Tenant is suspended or invalid' 
    }));
  });

  it('should return 403 if tenant is suspended', async () => {
    req.headers.authorization = 'Bearer test-token';
    jwt.verify.mockReturnValue({ id: '3', role: 'VENDOR', tenantId: 'tenant-1' });
    
    getTenantStatusAsync.mockResolvedValue('suspended');

    await authenticate(req, res, next);

    expect(getTenantStatusAsync).toHaveBeenCalledWith('tenant-1');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ 
      status: 403,
      message: 'Tenant is suspended or not found'
    }));
  });

  it('should proceed if tenant is active', async () => {
    req.headers.authorization = 'Bearer test-token';
    jwt.verify.mockReturnValue({ id: '3', role: 'VENDOR', tenantId: 'tenant-1' });
    
    getTenantStatusAsync.mockResolvedValue('active');

    await authenticate(req, res, next);

    expect(getTenantStatusAsync).toHaveBeenCalledWith('tenant-1');
    expect(next).toHaveBeenCalledWith(); // success
  });
});
