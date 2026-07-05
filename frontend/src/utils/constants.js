export const ROLES = {
  ADMIN: 'ADMIN',
  COORDINATOR: 'COORDINATOR',
  VENDOR: 'VENDOR',
};

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinador',
  VENDOR: 'Vendedor',
};

export const SOCKET_EVENTS = {
  MESSAGE_NEW: 'message:new',
  MESSAGE_SENT: 'message:sent',
  CHAT_ASSIGNED: 'chat:assigned',
  CHAT_ESCALATED: 'chat:escalated',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  ALERT_SLA: 'alert:sla',
  ALERT_SYSTEM: 'alert:system',
};

export const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  WAITING: 'waiting',
  RESOLVED: 'resolved',
  ESCALATED: 'escalated',
};

export const AI_MODE = {
  ACTIVE: 'ai',
  HUMAN: 'human',
  OFF_HOURS: 'off-hours',
};
