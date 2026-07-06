const { Router } = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const tenantService = require('../services/tenant.service');
const { success } = require('../utils/response');
const upload = require('../middleware/upload.middleware');
const knowledgeBaseService = require('../services/knowledgeBase.service');

const router = Router();

router.use(authenticate);

router.get('/profile', async (req, res, next) => {
  try {
    const profile = await tenantService.getProfile(req.user.tenantId);
    success(res, profile);
  } catch (err) {
    next(err);
  }
});

router.put('/profile', authorize('ADMIN'), async (req, res, next) => {
  try {
    const profile = await tenantService.updateProfile(req.user.tenantId, req.body);
    success(res, profile);
  } catch (err) {
    next(err);
  }
});
/**
 * @swagger
 * /tenant/ai-config:
 *   get:
 *     summary: Retrieve AI configuration status
 *     tags: [Tenant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/ai-config', authorize('ADMIN'), async (req, res, next) => {
  try {
    const config = await tenantService.getAiConfig(req.user.tenantId);
    success(res, config);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /tenant/ai-config:
 *   put:
 *     summary: Update AI configuration
 *     tags: [Tenant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *               apiKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.put('/ai-config', authorize('ADMIN'), async (req, res, next) => {
  try {
    const config = await tenantService.updateAiConfig(req.user.tenantId, req.body);
    success(res, config);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /tenant/knowledge-base:
 *   get:
 *     summary: Retrieve knowledge base documents
 *     tags: [Tenant, KnowledgeBase]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/knowledge-base', authorize('ADMIN'), async (req, res, next) => {
  try {
    const documents = await knowledgeBaseService.getDocuments(req.user.tenantId);
    success(res, documents);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /tenant/knowledge-base/upload:
 *   post:
 *     summary: Upload a document to the knowledge base
 *     tags: [Tenant, KnowledgeBase]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       202:
 *         description: Accepted for processing
 */
router.post(
  '/knowledge-base/upload',
  authorize('ADMIN'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const document = await knowledgeBaseService.uploadDocument(req.user.tenantId, req.file);
      // Return 202 Accepted because processing happens asynchronously
      success(res, document, 202);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
