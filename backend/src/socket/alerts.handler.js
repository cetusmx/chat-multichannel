const slaService = require('../services/sla.service');

const jwt = require('jsonwebtoken');

const attachedNamespaces = new Set();

function setupAlerts(alertsNamespace) {
  alertsNamespace.on('connection', (socket) => {
    socket.on('join:tenant', (tenantId) => {
      if (!tenantId) {
        socket.emit('alerts:error', { message: 'Invalid tenant ID' });
        socket.disconnect(true);
        return;
      }
      try {
        const token = socket.handshake.auth?.token;
        if (!token) {
          socket.emit('alerts:error', { message: 'Authentication required' });
          socket.disconnect(true);
          return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.tenantId !== tenantId && decoded.role !== 'ADMIN') {
          socket.emit('alerts:error', { message: 'Unauthorized access to tenant' });
          socket.disconnect(true);
          return;
        }
      } catch (e) {
        socket.emit('alerts:error', { message: 'Invalid token' });
        socket.disconnect(true);
        return;
      }
      socket.join(`tenant:${tenantId}`);
    });
  });

  // Wire SLA Service to Socket.IO alerts namespace
  if (!attachedNamespaces.has(alertsNamespace)) {
    attachedNamespaces.add(alertsNamespace);
    slaService.on('alerts:breach', (data) => {
      if (data && data.tenantId) {
        alertsNamespace.to(`tenant:${data.tenantId}`).emit('alerts:breach', data);
      }
    });
  }
}

module.exports = { setupAlerts };
