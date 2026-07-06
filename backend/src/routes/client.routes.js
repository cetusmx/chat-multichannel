const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { PrismaClient } = require('@prisma/client');
const { getIo } = require('../socket');

const prisma = new PrismaClient();

router.patch('/:id/block', authenticate, authorize('ADMIN', 'COORDINATOR'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ error: 'isBlocked must be a boolean' });
    }

    const client = await prisma.client.findUnique({ where: { id } });

    if (!client || client.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (client.isBlocked === isBlocked) {
      return res.json({ data: client });
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: { isBlocked }
    });

    let activeVendorsToNotify = [];

    if (isBlocked) {
      // Close active/pending conversations
      const conversations = await prisma.conversation.findMany({
        where: { clientId: id, status: { in: ['ACTIVE', 'PENDING_ASSIGNMENT'] } }
      });
      
      activeVendorsToNotify = [...new Set(conversations.map(c => c.vendorId).filter(Boolean))];

      await prisma.conversation.updateMany({
        where: { clientId: id, status: { in: ['ACTIVE', 'PENDING_ASSIGNMENT'] } },
        data: { status: 'CLOSED' }
      });
    }

    try {
      const io = getIo();
      io.of('/chat').to(`tenant_${client.tenantId}_coordinators`).emit('client_blocked', updatedClient);

      // Notify specific vendors who are currently handling this client
      activeVendorsToNotify.forEach(vendorId => {
        io.of('/chat').to(`vendor_${vendorId}`).emit('client_blocked', updatedClient);
      });
    } catch (socketErr) {
      console.error('Failed to emit client_blocked', socketErr);
    }

    res.json({ data: updatedClient });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
