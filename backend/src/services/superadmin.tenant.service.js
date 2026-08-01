const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const { getIo } = require('../socket');
const jwt = require('jsonwebtoken');
const { setTenantStatus } = require('../utils/tenant-cache.util');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Retrieves a paginated list of tenants for the Superadmin dashboard.
 *
 * @param {Object} options Pagination and sorting options
 * @param {number} [options.page=1] Page number
 * @param {number} [options.limit=10] Items per page
 * @param {string} [options.sortBy='createdAt'] Field to sort by
 * @param {string} [options.sortOrder='desc'] Sort order ('asc' or 'desc')
 * @returns {Promise<{ data: Array, meta: { total: number, page: number, limit: number } }>}
 */
async function getTenants({ page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' }) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  
  const skip = (parsedPage - 1) * parsedLimit;
  const take = parsedLimit;

  // Validate sort field to prevent injection/errors
  const validSortFields = ['createdAt', 'name', 'domain', 'status'];
  const validSortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  
  const orderStr = typeof sortOrder === 'string' ? sortOrder.toLowerCase() : 'desc';
  const validSortOrder = ['asc', 'desc'].includes(orderStr) ? orderStr : 'desc';

  const [data, total] = await Promise.all([
    prisma.tenant.findMany({
      skip,
      take,
      orderBy: { [validSortField]: validSortOrder },
      select: {
        id: true,
        name: true,
        domain: true,
        createdAt: true,
        status: true,
      },
    }),
    prisma.tenant.count(),
  ]);

  return {
    data,
    meta: {
      total,
      page: parsedPage,
      limit: parsedLimit,
    },
  };
}

/**
 * Creates a new tenant and its initial admin user within a single transaction.
 *
 * @param {Object} data Tenant and Admin data
 * @param {string} data.name Tenant name
 * @param {string} data.domain Tenant domain
 * @param {string} data.adminName Admin name (first + last name)
 * @param {string} data.adminEmail Admin email
 * @param {string} data.password Admin password
 * @returns {Promise<{ tenant: Object, user: Object }>}
 */
async function createTenantWithAdmin(data) {
  const { name, domain, adminName, adminEmail, password } = data;

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // The transaction MUST use a timeout to prevent hanging connections
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name,
        domain,
        status: 'active', // 'active' status for Tenant (lowercase)
      },
    });

    const user = await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        tenantId: tenant.id,
        isActive: true,
        emailVerified: new Date(),
      },
    });

    return { tenant, user };
  }, { timeout: 10000 });
}

/**
 * Updates the status of a tenant.
 *
 * @param {string} id Tenant ID
 * @param {string} status New status ('active' or 'suspended')
 * @returns {Promise<Object>} Updated tenant
 */
async function updateTenantStatus(id, status) {
  const masterTenantId = env.masterTenantId;
  if (status === 'suspended') {
    if (id === masterTenantId) {
      const error = new Error('Cannot suspend the master tenant');
      error.statusCode = 403;
      throw error;
    }
  }

  // Check if tenant exists and get full payload
  const tenant = await prisma.tenant.findUnique({
    where: { id }
  });

  if (!tenant) {
    const error = new Error('Tenant not found');
    error.statusCode = 404;
    throw error;
  }

  // Idempotency check: if status is the same, return early with full object
  if (tenant.status === status) {
    return tenant;
  }

  // Update status
  const updatedTenant = await prisma.tenant.update({
    where: { id },
    data: { status }
  });

  // Update cache proactively
  setTenantStatus(id, status);

  if (status === 'suspended') {
    try {
      const io = getIo();
      const namespaces = ['/chat', '/alerts', '/notifications'];
      
      for (const nsp of namespaces) {
        const namespace = io.of(nsp);
        const sockets = await namespace.fetchSockets();
        
        let count = 0;
        for (const socket of sockets) {
          if (++count % 100 === 0) await new Promise(resolve => setImmediate(resolve));
          try {
            const token = socket.handshake.auth?.token;
            if (token) {
              // Decode without signature verification to avoid O(N) blocking crypto
              const decoded = jwt.decode(token);
              if (decoded && decoded.tenantId === id) {
                socket.emit('tenant_suspended', { message: 'Account suspended.' });
                socket.disconnect(true);
              }
            }
          } catch (e) {
            // Ignore token parsing errors
          }
        }
      }
    } catch (err) {
      logger.error(`Failed to disconnect sockets for tenant ${id}`, err);
    }
  }

  logger.info(JSON.stringify({ event: 'TENANT_STATUS_CHANGED', tenantId: id, status }));

  return updatedTenant;
}

/**
 * Retrieves a tenant by ID, including current active users count.
 *
 * @param {string} id Tenant ID
 * @returns {Promise<Object>} Tenant object with currentActiveUsers
 */
async function getTenantById(id) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
  });

  if (!tenant) {
    const error = new Error('Tenant not found');
    error.statusCode = 404;
    throw error;
  }

  const currentActiveUsers = await prisma.user.count({
    where: {
      tenantId: id,
      isActive: true,
    }
  });

  return { ...tenant, currentActiveUsers };
}

/**
 * Updates the licenses of a tenant.
 *
 * @param {string} tenantId Tenant ID
 * @param {Object} payload { maxUsers, maxAiTokens, licenseType }
 * @param {string} superadminId The superadmin performing the action
 * @returns {Promise<Object>} Updated tenant
 */
async function updateTenantLicenses(tenantId, payload, superadminId) {
  let { maxUsers, maxAiTokens, licenseType } = payload;
  
  if (licenseType === 'LIFETIME') {
    maxAiTokens = 0;
  }

  try {
    const { Prisma } = require('@prisma/client');
    return await prisma.$transaction(async (tx) => {
      // Check if tenant exists inside tx
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId }
      });
      if (!tenant) {
        const error = new Error('Tenant not found');
        error.statusCode = 404;
        throw error;
      }

      // Query active users
      const activeUsersCount = await tx.user.count({
        where: {
          tenantId,
          isActive: true
        }
      });

      if (maxUsers !== -1 && maxUsers < activeUsersCount) {
        const error = new Error('Cannot set limit below current active users');
        error.statusCode = 400;
        throw error;
      }

      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { maxUsers, maxAiTokens, licenseType }
      });

      logger.info(JSON.stringify({
        action: 'UPDATE_TENANT_LICENSES',
        superadminId,
        tenantId,
        previousValues: {
          maxUsers: tenant.maxUsers,
          maxAiTokens: tenant.maxAiTokens,
          licenseType: tenant.licenseType
        },
        newValues: { maxUsers, maxAiTokens, licenseType }
      }));

      return updatedTenant;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 });
  } catch (err) {
    if (err.code === 'P2034') {
      const error = new Error('Concurrent modification conflict, please try again');
      error.statusCode = 409;
      throw error;
    }
    if (err.code === 'P2025') {
      const error = new Error('Tenant not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
}

module.exports = {
  getTenants,
  getTenantById,
  createTenantWithAdmin,
  updateTenantStatus,
  updateTenantLicenses,
};
