const { Router } = require('express');
const prisma = require('../config/database');
const { success } = require('../utils/response');

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 */
router.get('/', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    success(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/debug-file', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const tenantId = req.query.tenant;
    if (!tenantId) return res.json({ error: 'Missing tenant param' });
    
    const uploadsPath = path.resolve(__dirname, '../../uploads');
    const tenantPath = path.join(uploadsPath, tenantId);
    
    const uploadsExists = fs.existsSync(uploadsPath);
    const tenantExists = fs.existsSync(tenantPath);
    
    let files = [];
    if (tenantExists) {
      files = fs.readdirSync(tenantPath);
    }
    
    res.json({
      uploadsPath,
      tenantPath,
      uploadsExists,
      tenantExists,
      files
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;
