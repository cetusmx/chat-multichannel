const express = require('express');
const router = express.Router();
const slaService = require('../services/sla.service');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const ApiError = require('../utils/ApiError');

// Protected by authenticate
router.use(authenticate);

/**
 * @swagger
 * /api/metrics/sla:
 *   get:
 *     summary: Retrieve the SLA configuration for the current tenant.
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SLA config retrieved successfully.
 */
router.get('/sla', async (req, res, next) => {
  try {
    const config = await slaService.getSlaConfig(req.user.tenantId);
    res.json({ data: config });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/metrics/sla:
 *   put:
 *     summary: Update the SLA configuration for the current tenant.
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstResponseMins:
 *                 type: integer
 *               resolutionMins:
 *                 type: integer
 *     responses:
 *       200:
 *         description: SLA config updated successfully.
 *       400:
 *         description: Validation error.
 *       500:
 *         description: Internal server error.
 */
router.put('/sla', authorize('ADMIN', 'COORDINATOR'), async (req, res, next) => {
  try {
    const config = await slaService.updateSlaConfig(req.user.tenantId, req.body);
    res.json({ data: config });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
