const superadminTenantService = require('../services/superadmin.tenant.service');
const { success, list } = require('../utils/response');
const { z } = require('zod');

const RESERVED_SLUGS = ['api', 'admin', 'system', 'www', 'app', 'root', 'static'];

const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
    .max(63)
    .refine(val => !RESERVED_SLUGS.includes(val), { message: 'Reserved keyword cannot be used as slug' }),
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be less than 72 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter').regex(/[0-9]/, 'Must contain at least one number').regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  // Optional initial catalog integration; deep validation happens in catalog.service.upsertConfig.
  catalogConfig: z.object({}).passthrough().nullable().optional(),
});

const catalogConfigSchema = z.object({
  provider: z.string().trim().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  baseUrl: z.string().trim().max(2048).nullable().optional(),
  apiKey: z.string().max(4096).optional(),
  connection: z.record(z.any()).nullable().optional(),
  searchSchema: z.record(z.any()).nullable().optional(),
  pricing: z.record(z.any()).nullable().optional(),
  features: z.record(z.boolean()).nullable().optional(),
  aiRules: z.string().max(20000).nullable().optional(),
}).strict();

const updateTenantStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

const tenantIdSchema = z.string().refine(val => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val) || /^c[a-z0-9]{24}$/.test(val), { message: 'Invalid tenant ID format (must be UUID or CUID)' });

const updateTenantLicensesSchema = z.object({
  maxUsers: z.number().int().min(-1).max(2147483647).refine(val => val === -1 || val >= 1, { message: 'maxUsers must be -1 or at least 1' }),
  maxAiTokens: z.number().int().min(-1).max(2147483647),
  licenseType: z.enum(['SUBSCRIPTION', 'LIFETIME']),
}).strict();

async function getTenants(req, res, next) {
  try {
    const { page, limit, sortBy, sortOrder } = req.query;
    
    const result = await superadminTenantService.getTenants({
      page,
      limit,
      sortBy,
      sortOrder,
    });
    
    list(res, result.data, result.meta);
  } catch (err) {
    next(err);
  }
}

async function createTenant(req, res, next) {
  try {
    const parsed = createTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: parsed.error.errors }
      });
    }
    const validatedData = parsed.data;

    let catalogConfig;
    if (validatedData.catalogConfig) {
      const parsedCatalog = catalogConfigSchema.safeParse(validatedData.catalogConfig);
      if (!parsedCatalog.success) {
        return res.status(400).json({
          error: { message: 'Validation failed', details: parsedCatalog.error.errors.map((e) => ({ ...e, path: ['catalogConfig', ...e.path] })) },
        });
      }
      catalogConfig = parsedCatalog.data;
    }

    const result = await superadminTenantService.createTenantWithAdmin({
      name: validatedData.name,
      domain: validatedData.slug,
      adminName: `${validatedData.firstName} ${validatedData.lastName}`,
      adminEmail: validatedData.email,
      password: validatedData.password,
      ...(catalogConfig ? { catalogConfig } : {}),
    });

    if (typeof superadminTenantService.sendTenantAdminWelcomeEmail === 'function') {
      Promise.resolve(
        superadminTenantService.sendTenantAdminWelcomeEmail(
          result.tenant,
          result.user,
          validatedData.password,
          req.headers?.origin || ''
        )
      ).catch(() => {});
    }

    // Strip passwordHash from user object
    const userWithoutPassword = { ...result.user };
    delete userWithoutPassword.passwordHash;

    const safeResult = {
      tenant: result.tenant,
      user: userWithoutPassword,
      ...(result.catalogConfig ? { catalogConfig: result.catalogConfig } : {}),
    };

    success(res, safeResult, 201);
  } catch (err) {
    if (err.status === 400 || err.name === 'SchemaError') {
      return res.status(400).json({ error: { message: err.message } });
    }
    if (err.code === 'P2002' && err.meta?.target) {
      let field = 'unknown';
      if (Array.isArray(err.meta.target)) field = err.meta.target[0];
      else if (typeof err.meta.target === 'string') field = err.meta.target;
      return res.status(409).json({
        error: { message: `Conflict: ${field} already exists`, field }
      });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: err.errors }
      });
    }
    const logger = require('../utils/logger');
    logger.error('Error creating tenant:', err);
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      error: { message: err.message || 'Internal server error while creating tenant' }
    });
  }
}

async function updateTenantStatus(req, res, next) {
  try {
    const parsedId = tenantIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json({
        error: { message: 'Invalid tenant ID format', details: parsedId.error.errors }
      });
    }
    const id = parsedId.data;

    const parsedData = updateTenantStatusSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: parsedData.error.errors }
      });
    }
    const validatedData = parsedData.data;

    const result = await superadminTenantService.updateTenantStatus(id, validatedData.status);
    
    success(res, result);
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ error: { message: err.message } });
    }
    if (err.statusCode === 404) {
      return res.status(404).json({ error: { message: 'Tenant not found' } });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: err.errors }
      });
    }
    const logger = require('../utils/logger');
    logger.error(`Error updating tenant status for ${req.params.id}:`, err);
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      error: { message: err.message || 'Internal server error while updating tenant status' }
    });
  }
}

async function getTenantById(req, res, next) {
  try {
    const parsedId = tenantIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json({
        error: { message: 'Invalid tenant ID format', details: parsedId.error?.errors }
      });
    }
    const id = parsedId.data;

    const result = await superadminTenantService.getTenantById(id);
    success(res, result);
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: { message: 'Tenant not found' } });
    }
    const logger = require('../utils/logger');
    logger.error(`Error getting tenant ${req.params.id}:`, err);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}

async function updateTenantLicenses(req, res, next) {
  try {
    const parsedId = tenantIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json({
        error: { message: 'Invalid tenant ID format', details: parsedId.error.errors }
      });
    }
    const id = parsedId.data;

    const parsedData = updateTenantLicensesSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: parsedData.error.errors }
      });
    }
    const validatedData = parsedData.data;

    const superadminId = req.superadmin?.id || req.user?.id;

    const result = await superadminTenantService.updateTenantLicenses(id, validatedData, superadminId);
    
    success(res, result);
  } catch (err) {
    const logger = require('../utils/logger');
    
    if (err.statusCode === 404) {
      return res.status(404).json({ error: { message: 'Tenant not found' } });
    }
    if (err.statusCode === 400 || err.statusCode === 409) {
      logger.warn(`Business validation failed for ${req.params.id}: ${err.message}`);
      return res.status(err.statusCode).json({ error: { message: err.message, code: err.code || 'VALIDATION_ERROR' } });
    }
    
    logger.error(`Error updating tenant licenses for ${req.params.id}:`, err);
    return res.status(500).json({
      error: { message: 'Internal server error while updating tenant licenses' }
    });
  }
}

async function resetTenantAdminPassword(req, res) {
  try {
    const parsedId = tenantIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json({
        error: { message: 'Invalid tenant ID format', details: parsedId.error.errors },
      });
    }
    const id = parsedId.data;
    const origin = req.headers?.origin || '';
    const result = await superadminTenantService.sendTenantAdminPasswordReset(id, origin);
    success(res, result);
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: { message: err.message || 'Not found' } });
    }
    const logger = require('../utils/logger');
    logger.error(`Error sending admin password reset for tenant ${req.params.id}:`, err);
    return res.status(500).json({
      error: { message: 'Internal server error while sending password reset' },
    });
  }
}

function parseTenantIdOr400(req, res) {
  const parsedId = tenantIdSchema.safeParse(req.params.id);
  if (!parsedId.success) {
    res.status(400).json({
      error: { message: 'Invalid tenant ID format', details: parsedId.error.errors },
    });
    return null;
  }
  return parsedId.data;
}

async function getTenantCatalogConfig(req, res) {
  const id = parseTenantIdOr400(req, res);
  if (!id) return;
  try {
    const result = await superadminTenantService.getTenantCatalogConfig(id);
    // Same shape as GET /api/catalog/config so both portals can share client code.
    return res.json({ data: result.data, providers: result.providers });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: { message: 'Tenant not found' } });
    }
    const logger = require('../utils/logger');
    logger.error(`Error getting catalog config for tenant ${id}:`, err);
    return res.status(500).json({ error: { message: 'Internal server error while reading catalog config' } });
  }
}

async function updateTenantCatalogConfig(req, res) {
  const id = parseTenantIdOr400(req, res);
  if (!id) return;

  const parsedData = catalogConfigSchema.safeParse(req.body || {});
  if (!parsedData.success) {
    return res.status(400).json({
      error: { message: 'Validation failed', details: parsedData.error.errors },
    });
  }

  try {
    const config = await superadminTenantService.updateTenantCatalogConfig(id, parsedData.data);
    return res.json({ data: config });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: { message: 'Tenant not found' } });
    }
    if (err.status === 400 || err.name === 'SchemaError') {
      return res.status(400).json({ error: { message: err.message } });
    }
    const logger = require('../utils/logger');
    logger.error(`Error updating catalog config for tenant ${id}:`, err);
    return res.status(500).json({ error: { message: 'Internal server error while saving catalog config' } });
  }
}

async function testTenantCatalogConnection(req, res) {
  const id = parseTenantIdOr400(req, res);
  if (!id) return;
  try {
    const result = await superadminTenantService.testTenantCatalogConnection(id);
    return res.status(result.ok ? 200 : 502).json({ data: result });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: { message: 'Tenant not found' } });
    }
    const logger = require('../utils/logger');
    logger.error(`Error testing catalog connection for tenant ${id}:`, err);
    return res.status(500).json({ error: { message: 'Internal server error while testing catalog connection' } });
  }
}

module.exports = {
  getTenants,
  createTenant,
  updateTenantStatus,
  getTenantById,
  updateTenantLicenses,
  resetTenantAdminPassword,
  getTenantCatalogConfig,
  updateTenantCatalogConfig,
  testTenantCatalogConnection,
};
