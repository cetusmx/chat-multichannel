/**
 * Catalog (ERP) connection settings.
 *
 * Transitional: until CatalogConfig per tenant lands, the ERP credentials
 * come from the environment. There is deliberately NO default value for the
 * API key; a missing key must fail loudly instead of silently using a secret
 * baked into the source tree.
 *
 * Legacy variable names (VITE_API_BASE_URL / VITE_INTERNAL_SECRET) are still
 * read so existing deployments keep working after they move the key to .env.
 */
const DEFAULT_URL = 'http://75.119.150.222:3010';

function getCatalogConfig() {
  const baseUrl = (process.env.CATALOG_API_URL || process.env.VITE_API_BASE_URL || DEFAULT_URL).replace(/\/+$/, '');
  const apiKey = process.env.CATALOG_API_KEY || process.env.VITE_INTERNAL_SECRET || '';
  return { baseUrl, apiKey, isConfigured: apiKey.length > 0 };
}

function requireCatalogConfig() {
  const cfg = getCatalogConfig();
  if (!cfg.isConfigured) {
    const err = new Error('Catálogo no configurado: define CATALOG_API_KEY (y opcionalmente CATALOG_API_URL) en el entorno.');
    err.code = 'CATALOG_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }
  return cfg;
}

function catalogHeaders() {
  const { apiKey } = requireCatalogConfig();
  return { 'Content-Type': 'application/json', 'x-api-key': apiKey };
}

module.exports = { getCatalogConfig, requireCatalogConfig, catalogHeaders };
