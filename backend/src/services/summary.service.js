const prisma = require('../config/database');
const socket = require('../socket');
const logger = require('../utils/logger');
const aiService = require('./ai.service');

const MAX_HISTORY = 40;
const MAX_SUMMARY_CHARS = 320;
const inFlight = new Set();

function cartLine(cartData) {
  if (!cartData) return 'vacío';
  const data = typeof cartData === 'string' ? (() => { try { return JSON.parse(cartData); } catch { return null; } })() : cartData;
  const items = Array.isArray(data) ? data : data?.items || [];
  if (items.length === 0) return 'vacío';
  const total = items.reduce((acc, i) => acc + (Number(i.precio) || 0) * (Number(i.cantidad) || 0), 0);
  const parts = items.slice(0, 3).map((i) => `${i.cantidad} × ${i.descripcion || i.clave}`);
  if (items.length > 3) parts.push(`+${items.length - 3} más`);
  return `${parts.join(', ')} · total $${total.toFixed(2)}`;
}

function fiscalLine(cartData) {
  const data = cartData && !Array.isArray(cartData) && typeof cartData === 'object' ? cartData : {};
  const bits = [];
  if (data.rfc) bits.push(`RFC ${data.rfc}`);
  if (data.razonSocial) bits.push(data.razonSocial);
  if (data.shippingAddress) bits.push(`envío a ${data.shippingAddress}`);
  return bits.length ? bits.join(' · ') : 'sin datos fiscales ni dirección';
}

/**
 * Generates (or regenerates) the pinned AI summary for a conversation and
 * broadcasts the updated conversation. Safe to call fire-and-forget: errors
 * are logged, never thrown, and concurrent calls for the same conversation
 * collapse into one.
 */
async function generateConversationSummary(tenantId, conversationId, { reason = 'manual' } = {}) {
  if (!tenantId || !conversationId || inFlight.has(conversationId)) return null;
  inFlight.add(conversationId);
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { client: true },
    });
    if (!conversation || conversation.tenantId !== tenantId) return null;

    const history = await prisma.message.findMany({
      where: {
        conversationId,
        isInternal: false,
        senderType: { in: ['CLIENT', 'IA', 'VENDOR', 'COORDINATOR', 'ADMIN'] },
        OR: [{ content: { not: '' } }, { attachments: { some: {} } }],
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_HISTORY,
      include: { attachments: true },
    });
    if (history.length === 0) return null;

    const transcript = history
      .slice()
      .reverse()
      .map((m) => `${m.senderType === 'CLIENT' ? 'Cliente' : m.senderType === 'IA' ? 'Asistente' : 'Vendedor'}: ${m.content || '[archivo adjunto]'}`)
      .join('\n');

    const context = `
Eres un asistente que redacta resúmenes operativos para vendedores B2B de refacciones y sellos industriales.
Resume la conversación en UNA sola línea de máximo ${MAX_SUMMARY_CHARS} caracteres, en español neutro, sin saludos ni opiniones.
Formato: fragmentos separados por " · ". Incluye en este orden, solo si aplica: productos y cantidades solicitados, precio o total mencionado,
estado de datos fiscales (CSF/RFC validados o pendientes), dirección de envío, y la siguiente acción pendiente para el vendedor.
No inventes datos. No uses markdown ni comillas.

[DATOS DEL SISTEMA]
- Cliente: ${conversation.client?.name || conversation.client?.phoneNumber || 'desconocido'}
- Carrito actual: ${cartLine(conversation.client?.cartData)}
- Datos fiscales/envío: ${fiscalLine(conversation.client?.cartData)}
- Motivo del resumen: ${reason}
[FIN]`;

    const messages = [{ role: 'user', content: `Conversación:\n${transcript}\n\nEscribe el resumen.` }];
    let summary = await aiService.generateResponse(tenantId, messages, context);
    if (!summary || typeof summary !== 'string') return null;

    summary = summary.replace(/\[\[ESCALATE\]\]/gi, '').replace(/\s+/g, ' ').replace(/^["'\s]+|["'\s]+$/g, '').trim();
    if (summary.length > MAX_SUMMARY_CHARS) summary = `${summary.slice(0, MAX_SUMMARY_CHARS - 1).trimEnd()}…`;
    if (!summary) return null;

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { aiSummary: summary, aiSummaryUpdatedAt: new Date() },
      include: { client: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    try {
      let io = socket.getIo().of('/chat').to(`conversation:${conversationId}`).to(`tenant_${tenantId}_coordinators`);
      if (updated.vendorId) io = io.to(`vendor_${updated.vendorId}`);
      io.emit('conversation_updated', updated);
    } catch (err) {
      logger.error('[SUMMARY] No se pudo emitir conversation_updated:', err.message);
    }

    return updated;
  } catch (err) {
    logger.error(`[SUMMARY] Falló el resumen de ${conversationId} (${reason}):`, err.message);
    return null;
  } finally {
    inFlight.delete(conversationId);
  }
}

/** Fire-and-forget wrapper for hot paths. */
function scheduleSummary(tenantId, conversationId, opts) {
  setImmediate(() => { generateConversationSummary(tenantId, conversationId, opts); });
}

module.exports = { generateConversationSummary, scheduleSummary };
