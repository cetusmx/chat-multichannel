const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp.service');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

/**
 * @swagger
 * /whatsapp/settings:
 *   get:
 *     summary: Obtener la configuración de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 */
router.get('/settings', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const config = await whatsappService.getConfig(req.user.tenantId);
    res.json({ data: config });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /whatsapp/settings:
 *   put:
 *     summary: Actualizar la configuración de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 */
router.put('/settings', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const config = await whatsappService.updateConfig(req.user.tenantId, req.body);
    res.json({ data: config });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /whatsapp/webhook/{tenantId}:
 *   get:
 *     summary: Verificación del webhook (Meta validation)
 *     tags: [WhatsApp]
 */
router.get('/webhook/:tenantId', async (req, res, next) => {
  try {
    const challenge = await whatsappService.verifyWebhook(req.query, req.params.tenantId);
    // Meta requiere que el challenge sea un string plano.
    res.status(200).send(challenge);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /whatsapp/webhook/{tenantId}:
 *   post:
 *     summary: Recibir eventos y mensajes entrantes de Meta
 *     tags: [WhatsApp]
 */
router.post('/webhook/:tenantId', async (req, res, next) => {
  try {
    await whatsappService.handleIncomingMessage(req.body, req.params.tenantId);
    // Siempre debemos retornar 200 OK inmediatamente para que Meta no reintente
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    // Aún si hay error interno, responder OK a Meta y loggear.
    console.error('Webhook processing error:', error.message);
    res.status(200).send('EVENT_RECEIVED');
  }
});

module.exports = router;
