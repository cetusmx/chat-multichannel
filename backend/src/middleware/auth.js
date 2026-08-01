const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../utils/logger');
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
        if (status === 'suspended') {
          return next(new ApiError(403, 'Tenant is suspended', 'TENANT_SUSPENDED'));
        }
        if (!status) {
          return next(ApiError.unauthorized('Tenant not found'));
        }
      } catch (err) {
        return next(ApiError.internal('Failed to verify tenant status'));
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
