const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const aiService = require('../services/ai.service');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

/**
 * @swagger
 * /conversations/{id}/ai-assist:
 *   post:
 *     summary: Generar un borrador de respuesta con IA
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Borrador generado
 *       400:
 *         description: Prompt requerido
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Conversación no encontrada
 *       401:
 *         description: Falta token de autenticación
 *       500:
 *         description: Error interno del servidor
 */
router.post('/:id/ai-assist', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (prompt.trim().length > 1000) {
      return res.status(400).json({ error: 'El prompt excede el límite máximo de 1000 caracteres' });
    }

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation || conversation.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    if (conversation.status === 'CLOSED' || conversation.status === 'RESOLVED') {
      return res.status(400).json({ error: 'La conversación está cerrada' });
    }
    if (req.user.role === 'VENDOR' && conversation.vendorId !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    if (req.user.role === 'COORDINATOR' && conversation.branchId !== req.user.branchId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const draft = await aiService.generateInlineSuggestion(req.user.tenantId, id, prompt.trim());
    
    res.json({ draft });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
