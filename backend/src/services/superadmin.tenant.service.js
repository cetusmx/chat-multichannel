const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const { getIo } = require('../socket');
const jwt = require('jsonwebtoken');
const { setTenantStatus } = require('../utils/tenant-cache.util');
const logger = require('../utils/logger');
const env = require('../config/env');

// Lazy: catalog.service pulls in utils/encryption, which requires ENCRYPTION_KEY at import time.
const getCatalogService = () => require('./catalog.service');

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
 * @param {Object} [data.catalogConfig] Optional initial catalog configuration
 *   (same shape accepted by catalogService.upsertConfig). Applied after the
 *   tenant is created; failures here do not roll back the tenant.
 * @returns {Promise<{ tenant: Object, user: Object, catalogConfig?: Object }>}
 */
async function createTenantWithAdmin(data) {
  const { name, domain, adminName, adminEmail, password, catalogConfig } = data;

  // Fail fast on an invalid catalog payload so we never leave a tenant without its requested integration.
  const hasCatalogConfig = catalogConfig && typeof catalogConfig === 'object';
  if (hasCatalogConfig) validateCatalogInput(catalogConfig);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // The transaction MUST use a timeout to prevent hanging connections
  const result = await prisma.$transaction(async (tx) => {
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
      },
    });

    return { tenant, user };
  }, { timeout: 10000 });

  if (hasCatalogConfig) {
    result.catalogConfig = await getCatalogService().upsertConfig(result.tenant.id, catalogConfig);
  }

  return result;
}

/**
 * Pre-validates the parts of a catalog payload that upsertConfig would reject,
 * throwing errors with `.status = 400` (unknown provider) or a SchemaError.
 */
function validateCatalogInput(input) {
  if (input.provider !== undefined && !getCatalogService().listProviders().includes(String(input.provider).toLowerCase())) {
    const error = new Error(`Proveedor de catálogo desconocido: ${input.provider}`);
    error.status = 400;
    throw error;
  }
  if (input.searchSchema !== undefined && input.searchSchema !== null) {
    const { normalizeSchema } = require('../catalog/schema');
    normalizeSchema(input.searchSchema);
  }
}

async function assertTenantExists(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) {
    const error = new Error('Tenant not found');
    error.statusCode = 404;
    throw error;
  }
  return tenant;
}

/**
 * Catalog configuration of a tenant (credentials are never returned).
 *
 * @param {string} tenantId Tenant ID
 * @returns {Promise<{ data: Object|null, providers: string[] }>}
 */
async function getTenantCatalogConfig(tenantId) {
  await assertTenantExists(tenantId);
  const catalogService = getCatalogService();
  const data = await catalogService.getConfig(tenantId);
  return { data, providers: catalogService.listProviders() };
}

/**
 * Creates or updates the catalog configuration of a tenant.
 * Validation errors from the catalog module carry `.status = 400` or `.name = 'SchemaError'`.
 *
 * @param {string} tenantId Tenant ID
 * @param {Object} input Partial catalog config (provider, isActive, baseUrl, apiKey, connection, searchSchema, pricing, features, aiRules)
 * @returns {Promise<Object>} Saved config with `hasApiKey` flag
 */
async function updateTenantCatalogConfig(tenantId, input) {
  await assertTenantExists(tenantId);
  validateCatalogInput(input);
  return getCatalogService().upsertConfig(tenantId, input);
}

/**
 * Tests the saved catalog connection of a tenant.
 *
 * @param {string} tenantId Tenant ID
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
async function testTenantCatalogConnection(tenantId) {
  await assertTenantExists(tenantId);
  return getCatalogService().testConnection(tenantId);
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
    if (masterTenantId && id === masterTenantId) {
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

  let primaryAdmin = null;
  if (typeof prisma.user.findFirst === 'function') {
    primaryAdmin = await prisma.user.findFirst({
      where: { tenantId: id, role: 'ADMIN', isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true },
    });
  }

  return {
    ...tenant,
    currentActiveUsers,
    adminUser: primaryAdmin,
  };
}

async function sendTenantAdminWelcomeEmail(tenant, user, temporaryPassword, origin = '') {
  try {
    const emailService = require('./email.service');
    const { generatePasswordResetToken, resolveTenantBaseUrl } = require('../utils/passwordToken');
    const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken(48 * 60);

    if (typeof prisma.user.update === 'function' && user?.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mustChangePassword: true,
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
        },
      });
    }

    const baseUrl = resolveTenantBaseUrl(origin);
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    await emailService.sendWelcomePasswordEmail({
      to: user.email,
      name: user.name,
      tenantName: tenant.name,
      resetUrl,
      temporaryPassword,
      tenantId: tenant.id,
      preferPlatform: true,
    });
  } catch (err) {
    logger.warn(`Could not send welcome email for tenant ${tenant?.id}: ${err.message}`);
  }
}

async function sendTenantAdminPasswordReset(tenantId, origin = '') {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    const error = new Error('Tenant not found');
    error.statusCode = 404;
    throw error;
  }

  const adminUser = await prisma.user.findFirst({
    where: { tenantId, role: 'ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!adminUser) {
    const error = new Error('No active admin user found for this tenant');
    error.statusCode = 404;
    throw error;
  }

  const emailService = require('./email.service');
  const { generatePasswordResetToken, resolveTenantBaseUrl } = require('../utils/passwordToken');
  const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken(24 * 60);

  await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      mustChangePassword: true,
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const baseUrl = resolveTenantBaseUrl(origin);
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  const sent = await emailService.sendPasswordResetEmail({
    to: adminUser.email,
    name: adminUser.name,
    resetUrl,
    tenantName: tenant.name,
    tenantId: tenant.id,
    preferPlatform: true,
    validityLabel: '24 horas',
  });

  return {
    message: sent
      ? `Correo de restablecimiento enviado a ${adminUser.email}`
      : `Token de restablecimiento generado para ${adminUser.email} (configura el servidor SMTP de plataforma para envío automático)`,
    email: adminUser.email,
    emailSent: sent,
  };
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

  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
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
          error.code = 'BELOW_ACTIVE_USERS';
          throw error;
        }

        const updatedTenant = await tx.tenant.update({
          where: { id: tenantId },
          data: { maxUsers, maxAiTokens, licenseType }
        });

        logger.info({
          action: 'UPDATE_TENANT_LICENSES',
          superadminId,
          tenantId,
          previousValues: {
            maxUsers: tenant.maxUsers,
            maxAiTokens: tenant.maxAiTokens,
            licenseType: tenant.licenseType
          },
          newValues: { maxUsers, maxAiTokens, licenseType }
        });

        return { ...updatedTenant, currentActiveUsers: activeUsersCount };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 5000 });
    } catch (err) {
      if (err.code === 'P2034' && attempt < maxRetries - 1) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 50 * attempt));
        continue;
      }
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
}

module.exports = {
  getTenants,
  getTenantById,
  createTenantWithAdmin,
  updateTenantStatus,
  updateTenantLicenses,
  sendTenantAdminWelcomeEmail,
  sendTenantAdminPasswordReset,
  getTenantCatalogConfig,
  updateTenantCatalogConfig,
  testTenantCatalogConnection,
};
