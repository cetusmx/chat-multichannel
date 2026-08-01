const superadminTenantService = require('../services/superadmin.tenant.service');
const { success } = require('../utils/response');
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
});

const updateTenantStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

const tenantIdSchema = z.string().refine(val => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val) || /^c[^\s-]{7,}$/.test(val), { message: 'Invalid tenant ID format (must be UUID or CUID)' });

const updateTenantLicensesSchema = z.object({
  maxUsers: z.number().int().min(-1).max(2147483647),
  maxAiTokens: z.number().int().min(-1).max(2147483647),
  licenseType: z.enum(['SUBSCRIPTION', 'LIFETIME']),
}).strict().refine(data => {
  if (data.licenseType === 'LIFETIME' && data.maxAiTokens !== 0) {
    return false;
  }
  return true;
}, {
  message: "LIFETIME licenses must have maxAiTokens strictly set to 0",
  path: ["maxAiTokens"],
});

async function getTenants(req, res, next) {
  try {
    const { page, limit, sortBy, sortOrder } = req.query;
    
    const result = await superadminTenantService.getTenants({
      page,
      limit,
      sortBy,
      sortOrder,
    });
    
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function createTenant(req, res, next) {
  try {
    const parsed = createTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.errors,
      });
    }
    const validatedData = parsed.data;

    const result = await superadminTenantService.createTenantWithAdmin({
      name: validatedData.name,
      domain: validatedData.slug,
      adminName: `${validatedData.firstName} ${validatedData.lastName}`,
      adminEmail: validatedData.email,
      password: validatedData.password,
    });

    // Strip passwordHash from user object
    const userWithoutPassword = { ...result.user };
    delete userWithoutPassword.passwordHash;

    const safeResult = {
      tenant: result.tenant,
      user: userWithoutPassword,
    };

    success(res, safeResult, 201);
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target) {
      let field = 'unknown';
      if (Array.isArray(err.meta.target)) field = err.meta.target[0];
      else if (typeof err.meta.target === 'string') field = err.meta.target;
      return res.status(409).json({
        success: false,
        message: `Conflict: ${field} already exists`,
        field,
      });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: err.errors,
      });
    }
    const logger = require('../utils/logger');
    logger.error('Error creating tenant:', err);
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Internal server error while creating tenant',
    });
  }
}

async function updateTenantStatus(req, res, next) {
  try {
    const parsedId = tenantIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tenant ID format',
        errors: parsedId.error.errors,
      });
    }
    const id = parsedId.data;

    const parsedData = updateTenantStatusSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsedData.error.errors,
      });
    }
    const validatedData = parsedData.data;

    const result = await superadminTenantService.updateTenantStatus(id, validatedData.status);
    
    success(res, result);
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    if (err.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: err.errors,
      });
    }
    const logger = require('../utils/logger');
    logger.error(`Error updating tenant status for ${req.params.id}:`, err);
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Internal server error while updating tenant status',
    });
  }
}

async function getTenantById(req, res, next) {
  try {
    const parsedId = tenantIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tenant ID format',
      });
    }
    const id = parsedId.data;

    const result = await superadminTenantService.getTenantById(id);
    success(res, result);
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    const logger = require('../utils/logger');
    logger.error(`Error getting tenant ${req.params.id}:`, err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function updateTenantLicenses(req, res, next) {
  try {
    const parsedId = tenantIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tenant ID format',
        errors: parsedId.error.errors,
      });
    }
    const id = parsedId.data;

    const parsedData = updateTenantLicensesSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsedData.error.errors,
      });
    }
    const validatedData = parsedData.data;

    const superadminId = req.user.id;

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

module.exports = {
  getTenants,
  createTenant,
  updateTenantStatus,
  getTenantById,
  updateTenantLicenses,
};
