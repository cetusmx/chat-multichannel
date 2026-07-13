const express = require('express');
const router = express.Router();
const slaService = require('../services/sla.service');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const ApiError = require('../utils/ApiError');
const { MAX_DATE_RANGE_MS } = require('../config/constants');

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
 *       401:
 *         description: Unauthorized.
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
 *       401:
 *         description: Unauthorized.
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

const metricsService = require('../services/metrics.service');

/**
 * @swagger
 * /api/metrics/productivity:
 *   get:
 *     summary: Retrieve vendor productivity metrics for the current tenant.
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *     responses:
 *       200:
 *         description: Productivity metrics retrieved successfully.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get('/productivity', authorize('ADMIN', 'COORDINATOR'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      throw new ApiError(400, 'startDate and endDate are required');
    }

    if (typeof startDate !== 'string' || typeof endDate !== 'string') {
      throw new ApiError(400, 'startDate and endDate must be valid strings');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(400, 'Invalid startDate or endDate format');
    }

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) {
      throw new ApiError(400, 'endDate must be after startDate');
    }

    if (diffMs > MAX_DATE_RANGE_MS) {
      throw new ApiError(400, 'Date range cannot exceed 1 year');
    }

    const metrics = await metricsService.getVendorProductivityMetrics(req.user.tenantId, startDate, endDate);
    res.json({ data: metrics });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
