const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { getTenantStatusAsync } = require('../utils/tenant-cache.util');

async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('No token provided'));
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;

    if (decoded.role !== 'SUPERADMIN') {
      if (!decoded.tenantId) {
        return next(new ApiError(403, 'Tenant is suspended or invalid', 'TENANT_SUSPENDED'));
      }
      try {
        const status = await getTenantStatusAsync(decoded.tenantId);
        if (!status || status === 'suspended') {
          return next(new ApiError(403, 'Tenant is suspended or not found', 'TENANT_SUSPENDED'));
        }
      } catch (err) {
        // Log DB error but don't fail authentication with an invalid token error, pass a 500 or 403
        return next(new ApiError(500, 'Internal Server Error verifying tenant', 'INTERNAL_ERROR'));
      }
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired'));
    }
    if (err instanceof ApiError || err.statusCode || err.status) {
      return next(err);
    }
    return next(ApiError.unauthorized('Invalid token'));
  }
}

module.exports = authenticate;
