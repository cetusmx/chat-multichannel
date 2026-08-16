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

router.post('/:id/extract-csf', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!conversation || conversation.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Buscar el último PDF enviado en esta conversación
    const lastPdfMsg = await prisma.message.findFirst({
      where: {
        conversationId: id,
        attachments: {
          some: { mimeType: 'application/pdf' }
        }
      },
      orderBy: { createdAt: 'desc' },
      include: { attachments: true }
    });

    const io = require('../socket').getIo();

    if (!lastPdfMsg) {
      // Susurro
      io.of('/chat').to(`conversation:${id}`).emit('new_message', {
        id: `sys_${Date.now()}`,
        conversationId: id,
        senderType: 'SYSTEM',
        content: 'No se encontró ningún archivo PDF reciente en esta conversación para extraer la Constancia.',
        createdAt: new Date(),
        isInternal: true
      });
      return res.json({ success: false, reason: 'no_pdf_found' });
    }

    const pdfAttachment = lastPdfMsg.attachments.find(a => a.mimeType === 'application/pdf');
    if (!pdfAttachment) {
      return res.json({ success: false, reason: 'no_pdf_attachment' });
    }

    const fs = require('fs');
    const path = require('path');
    const pdfParse = require('pdf-parse');
    
    const relativePath = pdfAttachment.url.startsWith('/') ? pdfAttachment.url.slice(1) : pdfAttachment.url;
    const filePath = path.join(__dirname, '..', '..', relativePath);

    if (!fs.existsSync(filePath)) {
      return res.json({ success: false, reason: 'file_not_found_on_disk' });
    }

    const dataBuffer = fs.readFileSync(filePath);
    let pdfText = '';
    try {
      const data = await pdfParse(dataBuffer);
      pdfText = data.text;
    } catch (err) {
      console.error('[CSF EXTRACTION] Error al parsear PDF:', err.message);
      return res.json({ success: false, reason: 'pdf_parse_error' });
    }

    if (!pdfText.trim()) {
      return res.json({ success: false, reason: 'empty_pdf' });
    }

    // Optimización de tokens: descartamos todo el texto que viene después de "Actividades Económicas"
    const actividadesEconIdx = pdfText.search(/Actividades Económicas/i);
    if (actividadesEconIdx !== -1) {
      pdfText = pdfText.substring(0, actividadesEconIdx);
    }

    // Intentar expresión regular (Paso 1)
    let extractedRfc = '';
    let extractedRazonSocial = '';
    let extractedCp = '';

    const rfcMatch = pdfText.match(/RFC:\s*([A-Z0-9]{12,13})/i);
    const cpMatch = pdfText.match(/C\.\s*P\.\s*:\s*(\d{5})/i) || pdfText.match(/Código Postal:\s*(\d{5})/i);
    // El nombre/razon social usualmente está entre "Nombre, denominación o razón social:" y la siguiente etiqueta.
    const nameMatch = pdfText.match(/Nombre,\s*denominación\s*o\s*razón\s*social:\s*([^\n]+)/i);

    if (rfcMatch) extractedRfc = rfcMatch[1].trim();
    if (cpMatch) extractedCp = cpMatch[1].trim();
    if (nameMatch) extractedRazonSocial = nameMatch[1].trim();

    let methodUsed = 'Regex';

    if (!extractedRfc || !extractedRazonSocial) {
      // Fallback a LLM (Paso 2)
      try {
        const { getProvider } = require('../providers');
        const providerName = process.env.AI_PROVIDER || 'gemini';
        const provider = getProvider(providerName);
        
        const prompt = `Extrae de este texto crudo (proveniente de una Constancia de Situación Fiscal) el RFC, la Razón Social y el Código Postal. Si no encuentras alguno, omítelo. Devuelve ÚNICAMENTE un objeto JSON válido con las claves "rfc", "razonSocial" y "codigoPostal", sin texto adicional ni formato markdown.\n\nTEXTO:\n${pdfText.substring(0, 3000)}`;
        
        const response = await provider.generateResponse({
          tenantId: req.user.tenantId,
          messages: [{ role: 'user', content: prompt }]
        });
        
        let jsonStr = response.content;
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.rfc) extractedRfc = parsed.rfc;
        if (parsed.razonSocial) extractedRazonSocial = parsed.razonSocial;
        if (parsed.codigoPostal) extractedCp = parsed.codigoPostal;
        
        methodUsed = 'AI';
      } catch (aiErr) {
        console.error('[CSF EXTRACTION] Error en fallback de IA:', aiErr.message);
        
        // Notificar como susurro
        io.of('/chat').to(`conversation:${id}`).emit('new_message', {
          id: `sys_${Date.now()}`,
          conversationId: id,
          senderType: 'SYSTEM',
          content: 'No se pudieron extraer los datos con formato estándar y la IA no está disponible o falló. Por favor, ingresa los datos fiscales manualmente.',
          createdAt: new Date(),
          isInternal: true
        });

        return res.json({ success: false, reason: 'ai_fallback_failed' });
      }
    }

    if (!extractedRfc) {
       // Si de plano no pudimos sacar ni el RFC
       io.of('/chat').to(`conversation:${id}`).emit('new_message', {
          id: `sys_${Date.now()}`,
          conversationId: id,
          senderType: 'SYSTEM',
          content: 'No se detectó un RFC válido en el documento adjunto. Por favor, revisa el archivo.',
          createdAt: new Date(),
          isInternal: true
       });
       return res.json({ success: false, reason: 'no_rfc_detected' });
    }

    // Actualizar cliente
    let currentCart = conversation.client.cartData || {};
    if (Array.isArray(currentCart)) {
       currentCart = { items: currentCart };
    }
    
    currentCart.rfc = extractedRfc;
    if (extractedRazonSocial) currentCart.razonSocial = extractedRazonSocial;
    if (extractedCp) currentCart.billingAddress = extractedCp; // o unificarlo

    await prisma.client.update({
      where: { id: conversation.clientId },
      data: { cartData: currentCart }
    });

    // Susurro de éxito
    io.of('/chat').to(`conversation:${id}`).emit('new_message', {
      id: `sys_${Date.now()}`,
      conversationId: id,
      senderType: 'SYSTEM',
      content: `Datos fiscales extraídos correctamente (${methodUsed}): RFC: ${extractedRfc}.`,
      createdAt: new Date(),
      isInternal: true
    });
    
    io.of('/chat').to(`tenant_${req.user.tenantId}_coordinators`).to(`conversation:${id}`).emit('cart_updated', {
      clientId: conversation.clientId,
      cartData: currentCart
    });

    res.json({ success: true, methodUsed, data: { rfc: extractedRfc, razonSocial: extractedRazonSocial, codigoPostal: extractedCp } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
