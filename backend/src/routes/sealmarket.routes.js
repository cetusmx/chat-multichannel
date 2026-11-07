/**
 * Legacy compatibility layer for /api/sealmarket/*.
 *
 * Older web/mobile builds call these endpoints and expect raw SealMarket
 * records. They are now served through the tenant's catalog provider and
 * will be removed once every client uses /api/catalog/*.
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const catalogService = require('../services/catalog.service');

function legacyError(res, error, fallback) {
  console.error('[SEALMARKET][legacy]', error.message);
  return res.status(error.status || 500).json({ error: error.status ? error.message : fallback });
}

router.get('/catalog/search', authenticate, async (req, res) => {
  try {
    const { limit, ...params } = req.query;
    const result = await catalogService.search(req.user.tenantId, params, { limit: Math.min(parseInt(limit, 10) || 50, 100) });
    res.json({ data: result.products.map((p) => p.raw || p) });
  } catch (error) {
    legacyError(res, error, 'Hubo un fallo al leer los parámetros o conectar con el catálogo');
  }
});

router.get('/catalog/familias', authenticate, async (req, res) => {
  try {
    const options = await catalogService.getOptions(req.user.tenantId, 'familia');
    res.json(options.map((o) => ({ FAMILIA: o.value })));
  } catch (error) {
    legacyError(res, error, 'Hubo un fallo al obtener las familias');
  }
});

router.get('/clientes/rfc/:rfc', authenticate, async (req, res) => {
  try {
    const customer = await catalogService.lookupCustomer(req.user.tenantId, req.params.rfc);
    if (!customer) return res.status(404).json({ error: 'RFC no encontrado' });
    res.json({ data: [customer.raw || customer] });
  } catch (error) {
    legacyError(res, error, 'Hubo un fallo al obtener los datos del RFC');
  }
});

module.exports = router;
