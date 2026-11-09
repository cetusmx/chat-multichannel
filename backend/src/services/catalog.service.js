const prisma = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');
const { getProviderClass, listProviders } = require('../catalog/providers');
const { normalizeSchema, coerceParams, toToolParameters, toPromptDescription, requiredAttributes } = require('../catalog/schema');
const { normalizePricing } = require('../catalog/product');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // tenantId -> { expiresAt, resolved }

const DEFAULT_FEATURES = { customerLookup: true, csfExtraction: true, stockByLocation: false, productImages: false };

/**
 * Resolves the catalog integration of a tenant: config row -> normalized
 * schema/pricing/features -> provider instance. A tenant without a row has
 * no catalog (`none`); nothing is ever shared across tenants. The legacy
 * environment connection is only used once, by prisma/bootstrap.js, to seed
 * the row of the pre-existing tenant.
 */
async function resolve(tenantId, { force = false } = {}) {
  if (!tenantId) throw new Error('tenantId requerido');
  const hit = cache.get(tenantId);
  if (!force && hit && hit.expiresAt > Date.now()) return hit.resolved;

  const row = await prisma.catalogConfig.findUnique({ where: { tenantId } });
  const resolved = buildResolved(tenantId, row);
  cache.set(tenantId, { expiresAt: Date.now() + CACHE_TTL_MS, resolved });
  return resolved;
}

function buildResolved(tenantId, row) {
  const providerName = row?.provider || 'none';
  const baseUrl = row?.baseUrl || null;
  let apiKey = null;
  const connection = row?.connection || {};
  let schemaRaw = row?.searchSchema;
  let aiRules = row?.aiRules || null;

  if (row?.apiKey) {
    try {
      apiKey = decrypt(row.apiKey);
    } catch (e) {
      logger.error(`[CATALOG] No se pudo descifrar la API key del tenant ${tenantId}:`, e.message);
    }
  }

  const ProviderClass = getProviderClass(row && row.isActive === false ? 'none' : providerName);
  if (!schemaRaw && ProviderClass.defaultSchema) schemaRaw = ProviderClass.defaultSchema;
  if (!aiRules && ProviderClass.defaultAiRules) aiRules = ProviderClass.defaultAiRules;

  const schema = normalizeSchema(schemaRaw);
  const pricing = normalizePricing(row?.pricing);
  const features = { ...DEFAULT_FEATURES, ...(row?.features || {}) };
  const provider = new ProviderClass({ tenantId, baseUrl, apiKey, connection, schema, pricing, features });

  return { tenantId, providerName: ProviderClass.name, provider, schema, pricing, features, aiRules, isConfigured: ProviderClass.name !== 'none' };
}

function invalidate(tenantId) {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}

// ---------------------------------------------------------------------------
// Query API (used by routes and AI tools)
// ---------------------------------------------------------------------------

async function search(tenantId, rawParams, options = {}) {
  const r = await resolve(tenantId);
  if (!r.isConfigured) return { products: [], schema: r.schema, capabilities: r.provider.capabilities };
  const params = coerceParams(r.schema, rawParams);
  const products = await r.provider.search(params, options);
  return { products, params, schema: r.schema, capabilities: r.provider.capabilities };
}

async function getOptions(tenantId, attributeKey) {
  const r = await resolve(tenantId);
  const attr = r.schema.attributes.find((a) => a.key === attributeKey);
  if (!attr) return [];
  if (attr.options) return attr.options;
  if (attr.optionsSource?.startsWith('remote:')) return r.provider.getOptions(attr.optionsSource.slice(7));
  return [];
}

/** Resolves every remote option list once; used to seed the UI form and the agent prompt. */
async function getAllOptions(tenantId) {
  const r = await resolve(tenantId);
  const out = {};
  await Promise.all(r.schema.attributes.filter((a) => a.optionsSource?.startsWith('remote:')).map(async (a) => {
    try {
      out[a.key] = await r.provider.getOptions(a.optionsSource.slice(7));
    } catch (e) {
      logger.warn(`[CATALOG] opciones de ${a.key} no disponibles: ${e.message}`);
      out[a.key] = [];
    }
  }));
  return out;
}

async function lookupCustomer(tenantId, taxId) {
  const r = await resolve(tenantId);
  if (!r.provider.capabilities.customerLookup) return null;
  return r.provider.lookupCustomer(taxId);
}

/** Public description for clients: schema + capabilities + pricing (never credentials). */
async function describe(tenantId) {
  const r = await resolve(tenantId);
  return {
    provider: r.providerName,
    isConfigured: r.isConfigured,
    schema: r.schema,
    pricing: r.pricing,
    capabilities: r.provider.capabilities,
    requiredAttributes: requiredAttributes(r.schema).map((a) => a.key),
  };
}

/** Everything the AI layer needs to declare tools and write instructions. */
async function describeForAi(tenantId) {
  const r = await resolve(tenantId);
  if (!r.isConfigured) return { isConfigured: false, capabilities: r.provider.capabilities, aiRules: '', toolParameters: null, promptDescription: '', pricing: r.pricing };
  const optionsByKey = await getAllOptions(tenantId);
  return {
    isConfigured: true,
    capabilities: r.provider.capabilities,
    aiRules: r.aiRules || '',
    toolParameters: toToolParameters(r.schema),
    promptDescription: toPromptDescription(r.schema, optionsByKey),
    pricing: r.pricing,
    schema: r.schema,
  };
}

// ---------------------------------------------------------------------------
// Admin API (superadmin / tenant settings)
// ---------------------------------------------------------------------------

async function getConfig(tenantId) {
  const row = await prisma.catalogConfig.findUnique({ where: { tenantId } });
  if (!row) return null;
  const { apiKey, ...rest } = row;
  return { ...rest, hasApiKey: !!apiKey };
}

async function upsertConfig(tenantId, input) {
  const data = {};
  if (input.provider !== undefined) {
    getProviderClass(input.provider); // throws on unknown
    data.provider = input.provider;
  }
  if (input.isActive !== undefined) data.isActive = !!input.isActive;
  if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl ? String(input.baseUrl).trim().replace(/\/+$/, '') : null;
  if (input.apiKey) data.apiKey = encrypt(String(input.apiKey));
  if (input.connection !== undefined) data.connection = input.connection ?? {};
  if (input.searchSchema !== undefined) {
    normalizeSchema(input.searchSchema); // validates
    data.searchSchema = input.searchSchema;
  }
  if (input.pricing !== undefined) data.pricing = normalizePricing(input.pricing);
  if (input.features !== undefined) data.features = { ...DEFAULT_FEATURES, ...(input.features || {}) };
  if (input.aiRules !== undefined) data.aiRules = input.aiRules || null;

  const row = await prisma.catalogConfig.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });
  invalidate(tenantId);
  return getConfig(row.tenantId);
}

async function testConnection(tenantId) {
  const r = await resolve(tenantId, { force: true });
  return r.provider.testConnection();
}

module.exports = {
  resolve, invalidate, search, getOptions, getAllOptions, lookupCustomer, describe, describeForAi,
  getConfig, upsertConfig, testConnection, listProviders,
};
