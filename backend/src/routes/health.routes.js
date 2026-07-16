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
    
    const uploadsPath = path.resolve(__dirname, '../../uploads');
    
    function walkSync(dir, filelist = []) {
      if (!fs.existsSync(dir)) return filelist;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
          filelist.push(filepath + '/');
          filelist = walkSync(filepath, filelist);
        } else {
          filelist.push(filepath);
        }
      }
      return filelist;
    }
    
    const allFiles = walkSync(uploadsPath).map(p => p.replace(uploadsPath, ''));
    
    res.json({
      uploadsPath,
      allFiles
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;
