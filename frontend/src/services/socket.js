import { io } from 'socket.io-client';

const SOCKET_URL = '';

let chatSocket = null;
let alertsSocket = null;
let notificationsSocket = null;

export function connectSockets(token) {
  const opts = {
    auth: { token },
    transports: ['websocket', 'polling'],
  };

  chatSocket = io(`${SOCKET_URL}/chat`, opts);
  alertsSocket = io(`${SOCKET_URL}/alerts`, opts);
  notificationsSocket = io(`${SOCKET_URL}/notifications`, opts);

  return { chat: chatSocket, alerts: alertsSocket, notifications: notificationsSocket };
}

export function disconnectSockets() {
  if (chatSocket) chatSocket.disconnect();
  if (alertsSocket) alertsSocket.disconnect();
  if (notificationsSocket) notificationsSocket.disconnect();
}

export function getChatSocket() {
  return chatSocket;
}

export function getAlertsSocket() {
  return alertsSocket;
}

export function getNotificationsSocket() {
  return notificationsSocket;
}
