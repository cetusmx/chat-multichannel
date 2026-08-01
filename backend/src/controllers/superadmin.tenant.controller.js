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
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(50).regex(/[A-Z]/, 'Must contain at least one uppercase letter').regex(/[0-9]/, 'Must contain at least one number').regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});

const updateTenantStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
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
    const validatedData = createTenantSchema.parse(req.body);

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
    const { id } = req.params;
    const validatedData = updateTenantStatusSchema.parse(req.body);

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

module.exports = {
  getTenants,
  createTenant,
  updateTenantStatus,
};
