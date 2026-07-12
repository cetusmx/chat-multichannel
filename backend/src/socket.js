const { Server } = require('socket.io');
const { setupAlerts } = require('./socket/alerts.handler');

let ioInstance;

function setupSocket(server) {
  ioInstance = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const chat = ioInstance.of('/chat');
  const alerts = ioInstance.of('/alerts');
  const notifications = ioInstance.of('/notifications');

  chat.on('connection', (socket) => {
    socket.on('join:conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('join:tenant_coordinators', (tenantId) => {
      socket.join(`tenant_${tenantId}_coordinators`);
    });

    socket.on('leave:tenant_coordinators', (tenantId) => {
      socket.leave(`tenant_${tenantId}_coordinators`);
    });

    socket.on('join:vendor', (vendorId) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) return;
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.id !== vendorId && decoded.role !== 'ADMIN') return;
      } catch (e) {
        return;
      }
      socket.join(`vendor_${vendorId}`);
    });

    socket.on('leave:vendor', (vendorId) => {
      socket.leave(`vendor_${vendorId}`);
    });
  });

  setupAlerts(alerts);

  notifications.on('connection', (socket) => {
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
    });
  });

  return ioInstance;
}

function getIo() {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
}

module.exports = { setupSocket, getIo };
