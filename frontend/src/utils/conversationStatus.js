/**
 * Single source of truth for how a conversation status is presented.
 * `tone` maps onto Badge / StatusPill color variants.
 */
export const CONVERSATION_STATUS_META = {
  PENDING_ASSIGNMENT: {
    label: 'Sin asignar',
    short: 'Nuevo',
    tone: 'info',
    description: 'Chat nuevo sin asesor asignado',
  },
  ACTIVE: {
    label: 'En atención',
    short: 'Activo',
    tone: 'neutral',
    description: 'Conversación activa con un asesor',
  },
  ESCALATED: {
    label: 'Escalado',
    short: 'Escalado',
    tone: 'danger',
    description: 'Requiere atención de un coordinador',
  },
  WAITING_CUSTOMER: {
    label: 'Esperando al cliente',
    short: 'Esp. cliente',
    tone: 'warning',
    description: 'El asesor respondió y espera al cliente',
  },
  ON_HOLD: {
    label: 'En espera',
    short: 'En espera',
    tone: 'warning',
    description: 'Pausado por un tercero o proveedor',
  },
  SCHEDULED: {
    label: 'Agendado',
    short: 'Agendado',
    tone: 'info',
    description: 'Seguimiento programado',
  },
  CLOSED_WON: {
    label: 'Venta cerrada',
    short: 'Venta',
    tone: 'success',
    description: 'Cerrado con venta concretada',
  },
  CLOSED: {
    label: 'Cerrado',
    short: 'Cerrado',
    tone: 'neutral',
    description: 'Finalizado sin venta',
  },
  CLOSED_INACTIVE: {
    label: 'Cerrado por inactividad',
    short: 'Inactivo',
    tone: 'neutral',
    description: 'Cerrado automáticamente por inactividad',
  },
  DISCARDED: {
    label: 'Descartado',
    short: 'Descartado',
    tone: 'neutral',
    description: 'Marcado como spam o irrelevante',
  },
};

export const CLOSED_STATUSES = ['CLOSED', 'CLOSED_INACTIVE', 'CLOSED_WON', 'DISCARDED'];
export const PAUSED_STATUSES = ['ON_HOLD', 'WAITING_CUSTOMER', 'SCHEDULED'];

export function getStatusMeta(status) {
  return (
    CONVERSATION_STATUS_META[status] || {
      label: status ? status.replace(/_/g, ' ').toLowerCase() : 'Desconocido',
      short: status || '—',
      tone: 'neutral',
      description: '',
    }
  );
}

export function isClosedStatus(status) {
  return CLOSED_STATUSES.includes(status);
}

/**
 * Builds the small mono "eyebrow" that sits under a client name in the chat
 * header, e.g. "TRANSFERIDO POR IA · HACE 2 MIN".
 */
export function getConversationEyebrow(conversation, { vendorName } = {}) {
  if (!conversation) return '';
  const parts = [];
  const status = conversation.status;

  if (status === 'PENDING_ASSIGNMENT') {
    parts.push(conversation.aiPendingEscalation ? 'Transferido por IA' : 'IA atendiendo');
  } else if (status === 'ACTIVE' && vendorName) {
    parts.push(`Atiende ${vendorName}`);
  } else {
    parts.push(getStatusMeta(status).label);
  }

  return parts.join(' · ');
}

export const FILTER_LABELS = {
  ALL: 'Todos los chats',
  PENDING: 'Sin asignar',
  ON_HOLD: 'En seguimiento',
  SCHEDULED: 'Agendados',
  SLA: 'SLA en riesgo',
  CLOSED: 'Cerrados',
  CLOSED_WON: 'Ventas cerradas',
};
