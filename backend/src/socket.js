const { Server } = require('socket.io');

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
  });

  alerts.on('connection', (socket) => {
    socket.on('join:tenant', (tenantId) => {
      socket.join(`tenant:${tenantId}`);
    });
  });

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
