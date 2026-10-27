const prisma = require('../config/database');

const TEAM_SENDERS = new Set(['VENDOR', 'COORDINATOR', 'ADMIN']);

/**
 * Attaches `sender: { id, name, role }` to team-authored messages so the UI
 * can show who wrote an internal note. Customer, IA and SYSTEM messages are
 * returned untouched. One batched query per call.
 */
async function attachSenders(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return messages;

  const ids = [...new Set(messages.filter((m) => m && m.senderId && TEAM_SENDERS.has(m.senderType)).map((m) => m.senderId))];
  if (ids.length === 0) return messages;

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, role: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return messages.map((m) => {
    const u = m && m.senderId ? byId.get(m.senderId) : null;
    return u ? { ...m, sender: u } : m;
  });
}

/** Convenience for a single message; `user` avoids the lookup when already known. */
async function attachSender(message, user = null) {
  if (!message) return message;
  if (user && user.id === message.senderId) {
    return { ...message, sender: { id: user.id, name: user.name, role: user.role } };
  }
  const [enriched] = await attachSenders([message]);
  return enriched;
}

module.exports = { attachSenders, attachSender };
