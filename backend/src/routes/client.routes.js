const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { PrismaClient } = require('@prisma/client');
const { getIo } = require('../socket');

const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const skip = (page - 1) * limit;

    const { phoneNumber, rfc } = req.query;

    const where = {
      tenantId: req.user.tenantId,
    };

    if (phoneNumber && typeof phoneNumber === 'string') {
      where.phoneNumber = { contains: phoneNumber };
    }

    if (rfc && typeof rfc === 'string') {
      where.cartData = { path: ['rfc'], string_contains: rfc };
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          conversations: {
            orderBy: { lastMessageAt: 'desc' },
            include: { vendor: true }
          }
        }
      }),
      prisma.client.count({ where })
    ]);

    const mappedClients = clients.map(client => {
      let lastVendor = null;
      let lastPurchaseDate = null;
      let lastInboundDate = null;

      if (client.conversations && client.conversations.length > 0) {
        const vendorConv = client.conversations.find(c => c.vendorId && c.vendor);
        if (vendorConv) {
          lastVendor = {
            id: vendorConv.vendor.id,
            name: vendorConv.vendor.name
          };
        }

        const purchaseConv = client.conversations.find(c => c.status === 'CLOSED_WON');
        if (purchaseConv) {
          lastPurchaseDate = purchaseConv.statusUpdatedAt;
        }

        const inboundConv = client.conversations.find(c => c.isOutbound === false);
        if (inboundConv) {
          lastInboundDate = inboundConv.lastMessageAt;
        }
      }

      const { conversations, ...clientData } = client;

      return {
        ...clientData,
        lastVendor,
        lastPurchaseDate,
        lastInboundDate
      };
    });

    res.json({
      data: mappedClients,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          include: {
            vendor: {
              select: { id: true, name: true }
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 50
            }
          }
        }
      }
    });

    if (!client || client.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ data: client });
  } catch (error) {
    next(error);
  }
});

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

router.patch('/:id/cart', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cartData } = req.body;

    const client = await prisma.client.findUnique({ where: { id } });

    if (!client || client.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: { cartData }
    });

    try {
      const io = getIo();
      // Emit to vendor and coordinator rooms just in case
      io.of('/chat').to(`tenant_${client.tenantId}_coordinators`).emit('cart_updated', { clientId: id, cartData });
      
      const conversations = await prisma.conversation.findMany({
        where: { clientId: id, status: 'ACTIVE' }
      });
      conversations.forEach(c => {
        if (c.vendorId) {
          io.of('/chat').to(`vendor_${c.vendorId}`).emit('cart_updated', { clientId: id, cartData });
        }
      });
    } catch (socketErr) {
      console.error('Failed to emit cart_updated', socketErr);
    }

    res.json({ data: updatedClient });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
