const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

async function getProfile(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true, name: true, domain: true,
      phone: true, email: true, address: true,
      status: true, createdAt: true, updatedAt: true,
    },
  });

  if (!tenant) {
    throw ApiError.notFound('Tenant not found');
  }

  return tenant;
}

async function updateProfile(tenantId, data) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw ApiError.notFound('Tenant not found');
  }

  if (data.domain && data.domain !== tenant.domain) {
    const existing = await prisma.tenant.findUnique({ where: { domain: data.domain } });
    if (existing) {
      throw ApiError.conflict('Domain already in use');
    }
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      domain: data.domain !== undefined ? data.domain : undefined,
      phone: data.phone !== undefined ? data.phone : undefined,
      email: data.email !== undefined ? data.email : undefined,
      address: data.address !== undefined ? data.address : undefined,
    },
    select: {
      id: true, name: true, domain: true,
      phone: true, email: true, address: true,
      status: true, createdAt: true, updatedAt: true,
    },
  });

  return updated;
}

module.exports = { getProfile, updateProfile };
