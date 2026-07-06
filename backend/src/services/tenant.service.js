const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');
const { encrypt } = require('../utils/encryption');
const { getProvider } = require('../providers');

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

async function getAiConfig(tenantId) {
  try {
    const config = await prisma.aiConfig.findUnique({
      where: { tenantId }
    });
    if (!config) {
      return { isConfigured: false };
    }
    return { isConfigured: true, provider: config.provider };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Database error while fetching AI config');
  }
}

async function updateAiConfig(tenantId, data) {
  if (!data) throw ApiError.badRequest('Data is required');
  const { provider = 'gemini', apiKey } = data;
  if (!apiKey) throw ApiError.badRequest('API Key is required');

  const aiProvider = getProvider(provider);
  await aiProvider.validateKey(apiKey); // Throws ApiError if invalid

  let encryptedKey;
  try {
    encryptedKey = encrypt(apiKey);
  } catch (error) {
    throw ApiError.badRequest('Encryption failed: ' + error.message);
  }

  try {
    const updated = await prisma.aiConfig.upsert({
      where: { tenantId },
      update: { provider, apiKey: encryptedKey },
      create: { tenantId, provider, apiKey: encryptedKey }
    });

    return { isConfigured: true, provider: updated.provider };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Database error while updating AI config');
  }
}

module.exports = { getProfile, updateProfile, getAiConfig, updateAiConfig };
