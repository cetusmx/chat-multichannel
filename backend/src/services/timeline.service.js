const prisma = require('../config/database');
const socket = require('../socket');
const logger = require('../utils/logger');

/**
 * Timeline events: team-only system markers rendered inline in the chat
 * ("El cliente agregó X a su pedido"). They are stored as messages with
 * type EVENT so they travel through the existing message pipeline, and are
 * flagged internal so they never reach WhatsApp.
 */
async function emitEvent(conversation, content, { tone = 'info', data = null } = {}) {
  if (!conversation || !conversation.id || !content) return null;
  try {
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'SYSTEM',
        type: 'EVENT',
        content,
        isInternal: true,
        status: 'SENT',
        metadata: { tone, ...(data ? { data } : {}) },
      },
    });

    try {
      let io = socket.getIo().of('/chat').to(`conversation:${conversation.id}`).to(`tenant_${conversation.tenantId}_coordinators`);
      if (conversation.vendorId) io = io.to(`vendor_${conversation.vendorId}`);
      io.emit('new_message', message);
    } catch (err) {
      logger.error('[TIMELINE] No se pudo emitir evento por socket:', err.message);
    }
    return message;
  } catch (err) {
    logger.error('[TIMELINE] No se pudo registrar evento:', err.message);
    return null;
  }
}

function normalizeItems(cart) {
  if (!cart) return [];
  let data = cart;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return []; }
  }
  const items = Array.isArray(data) ? data : data.items || [];
  return items.filter((i) => i && i.clave).map((i) => ({ clave: String(i.clave), descripcion: i.descripcion || '', cantidad: Number(i.cantidad) || 0 }));
}

function label(item) {
  return item.descripcion ? `*${item.descripcion}*` : `*${item.clave}*`;
}

/**
 * Compares two carts and returns human-readable sentences for each change.
 * `actor` is "El cliente", "Luis" etc.
 */
function describeCartChanges(before, after, actor = 'El cliente') {
  const prev = new Map(normalizeItems(before).map((i) => [i.clave, i]));
  const next = new Map(normalizeItems(after).map((i) => [i.clave, i]));
  const events = [];

  for (const [clave, item] of next) {
    const old = prev.get(clave);
    if (!old) {
      events.push({ content: `${actor} agregó ${label(item)} a su pedido`, tone: 'success' });
    } else if (old.cantidad !== item.cantidad && item.cantidad > 0) {
      events.push({ content: `${actor} cambió ${label(item)} de ${old.cantidad} a ${item.cantidad} piezas`, tone: 'info' });
    }
  }
  for (const [clave, item] of prev) {
    if (!next.has(clave)) {
      events.push({ content: `${actor} quitó ${label(item)} de su pedido`, tone: 'warning' });
    }
  }
  return events;
}

/** Records cart diff events (max 3 to avoid flooding the timeline). */
async function emitCartChanges(conversation, before, after, actor) {
  const events = describeCartChanges(before, after, actor);
  const shown = events.slice(0, 3);
  for (const e of shown) await emitEvent(conversation, e.content, { tone: e.tone });
  if (events.length > shown.length) {
    await emitEvent(conversation, `${actor} hizo ${events.length - shown.length} cambios más en el pedido`, { tone: 'info' });
  }
  return events.length;
}

/** Finds the conversation the timeline event belongs to for a given client. */
async function findActiveConversationForClient(clientId, tenantId) {
  return prisma.conversation.findFirst({
    where: { clientId, tenantId, status: { notIn: ['CLOSED', 'CLOSED_INACTIVE', 'CLOSED_WON', 'DISCARDED'] } },
    orderBy: { lastMessageAt: 'desc' },
    select: { id: true, tenantId: true, vendorId: true },
  });
}

module.exports = { emitEvent, describeCartChanges, emitCartChanges, findActiveConversationForClient };
