const prisma = require('../config/database');
const socket = require('../socket');
const logger = require('../utils/logger');
const aiService = require('./ai.service');
const promptService = require('./prompt.service');

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

    const quotaService = require('./quota.service');
    if (await quotaService.checkAiQuotaExceeded(tenantId)) {
      logger.warn(`[SUMMARY] Cuota de IA agotada para ${tenantId}; se omite el resumen.`);
      return null;
    }

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

    const promptConfig = await promptService.getPromptConfig(tenantId);
    const tenantRow = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const context = promptService.renderPath(promptConfig, 'summary', {
      company_name: tenantRow?.name || 'la empresa',
      max_chars: MAX_SUMMARY_CHARS,
      client_name: conversation.client?.name || conversation.client?.phoneNumber || 'desconocido',
      cart_summary: cartLine(conversation.client?.cartData),
      fiscal_summary: fiscalLine(conversation.client?.cartData),
      reason,
    });

    const messages = [{ role: 'user', content: `Conversación:\n${transcript}\n\nEscribe el resumen.` }];
    const response = await aiService.generateResponse(tenantId, messages, context);
    let summary = typeof response === 'string' ? response : response?.content;
    if (!summary || typeof summary !== 'string') return null;

    const consumedTokens = response?.tokens ?? Math.ceil((context.length + transcript.length + summary.length) / 4);
    if (consumedTokens > 0) {
      prisma.tenant.updateMany({
        where: { id: tenantId, licenseType: { not: 'LIFETIME' } },
        data: { currentMonthAiTokens: { increment: consumedTokens } },
      }).catch((e) => logger.error('[SUMMARY] No se pudo contabilizar tokens:', e.message));
    }

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
