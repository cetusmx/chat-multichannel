const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const catalogService = require('../services/catalog.service');

function sendCatalogError(res, error, fallback) {
  const status = error.status || 500;
  const body = { error: error.message || fallback, code: error.code };
  if (status >= 500 && !error.code) body.error = fallback;
  console.error('[CATALOG]', error.message);
  return res.status(status).json(body);
}

/**
 * @swagger
 * /catalog/schema:
 *   get:
 *     summary: Esquema de búsqueda, capacidades y precios del catálogo del tenant
 *     tags: [Catalog]
 */
router.get('/schema', authenticate, async (req, res) => {
  try {
    const description = await catalogService.describe(req.user.tenantId);
    res.json({ data: description });
  } catch (error) {
    sendCatalogError(res, error, 'No se pudo obtener el esquema del catálogo');
  }
});

/**
 * @swagger
 * /catalog/options/{attribute}:
 *   get:
 *     summary: Opciones de un atributo tipo lista (estáticas o remotas)
 *     tags: [Catalog]
 */
router.get('/options/:attribute', authenticate, async (req, res) => {
  try {
    const options = await catalogService.getOptions(req.user.tenantId, req.params.attribute);
    res.json({ data: options });
  } catch (error) {
    sendCatalogError(res, error, 'No se pudieron obtener las opciones');
  }
});

/**
 * @swagger
 * /catalog/search:
 *   get:
 *     summary: Busca productos. Acepta `q` (texto) y cualquier atributo del esquema
 *     tags: [Catalog]
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const { limit, ...params } = req.query;
    const result = await catalogService.search(req.user.tenantId, params, { limit: Math.min(parseInt(limit, 10) || 50, 100) });
    res.json({ data: result.products, meta: { count: result.products.length, params: result.params } });
  } catch (error) {
    sendCatalogError(res, error, 'Hubo un fallo al conectar con el catálogo');
  }
});

/**
 * @swagger
 * /catalog/customer/{taxId}:
 *   get:
 *     summary: Datos fiscales de un cliente por RFC (si el proveedor lo soporta)
 *     tags: [Catalog]
 */
router.get('/customer/:taxId', authenticate, async (req, res) => {
  try {
    const customer = await catalogService.lookupCustomer(req.user.tenantId, req.params.taxId);
    if (!customer) return res.status(404).json({ error: 'RFC no encontrado' });
    res.json({ data: customer });
  } catch (error) {
    sendCatalogError(res, error, 'Hubo un fallo al consultar el RFC');
  }
});

// ---------------------------------------------------------------------------
// Administration (tenant admin). Superadmin manages the same via its portal.
// ---------------------------------------------------------------------------

router.get('/config', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const config = await catalogService.getConfig(req.user.tenantId);
    res.json({ data: config, providers: catalogService.listProviders() });
  } catch (error) {
    next(error);
  }
});

router.put('/config', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const config = await catalogService.upsertConfig(req.user.tenantId, req.body || {});
    res.json({ data: config });
  } catch (error) {
    if (error.status === 400 || error.name === 'SchemaError') return res.status(400).json({ error: error.message });
    next(error);
  }
});

router.post('/config/test', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const result = await catalogService.testConnection(req.user.tenantId);
    res.status(result.ok ? 200 : 502).json({ data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
