const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp.service');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const crypto = require('crypto');
const socket = require('../socket');


const prisma = new PrismaClient();

const uploadDir = process.env.TEMP_DIR || path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    let ext = file.originalname ? path.extname(file.originalname) : '';
    if (ext.length > 10) ext = ext.substring(0, 10);
    cb(null, crypto.randomUUID() + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/3gpp', 'video/quicktime',
    'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido.'));
  }
};

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 15 * 1024 * 1024,
    fieldSize: 2 * 1024 * 1024,
    files: 1 
  },
  fileFilter 
});

/**
 * @swagger
 * /chat/{conversationId}/messages:
 *   post:
 *     summary: Enviar un mensaje a una conversación de WhatsApp
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:conversationId/messages', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content, isInternal = false } = req.body;
    
    if (!content) {
      const error = new Error('Content is required');
      error.status = 400;
      throw error;
    }

    if (isInternal && !['ADMIN', 'COORDINATOR', 'VENDOR'].includes(req.user.role)) {
       return res.status(403).json({ error: 'No autorizado para comentarios internos' });
    }

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.tenantId !== req.user.tenantId || (req.user.role === 'VENDOR' && conversation.vendorId !== req.user.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    let message;
    if (isInternal) {
      message = await prisma.message.create({
        data: {
          conversationId,
          senderType: req.user.role,
          senderId: req.user.id,
          content,
          status: 'SENT',
          isInternal: true
        }
      });
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() }
      });
      try {
        socket.getIo().of('/chat').to(`conversation:${conversationId}`).to(`tenant_${conversation.tenantId}_coordinators`).emit('new_message', message);
      } catch (err) {
        console.error('[CHAT_ROUTE] No se pudo emitir mensaje interno por socket:', err.message);
      }
    } else {
      message = await whatsappService.sendMessage(conversationId, content, req.user.id, req.user.role);
    }
    
    res.status(201).json({ data: message });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /chat/{conversationId}/media:
 *   post:
 *     summary: Enviar un mensaje con media a una conversación de WhatsApp
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:conversationId/media', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), (req, res, next) => {
  upload.single('file')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Error de subida: ${err.message}` });
    } else if (err) {
      const msg = err.message === 'Tipo de archivo no permitido.' ? err.message : 'Fallo interno al procesar el archivo.';
      return res.status(400).json({ error: msg });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const file = req.file;
    const caption = req.body.caption;
    const isInternal = req.body.isInternal === 'true';
    
    if (!file) {
      return res.status(400).json({ error: 'El archivo es requerido' });
    }

    if (isInternal && !['ADMIN', 'COORDINATOR', 'VENDOR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'No autorizado para comentarios internos' });
    }

    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId } });
    if (!conversation || conversation.tenantId !== req.user.tenantId || (req.user.role === 'VENDOR' && conversation.vendorId !== req.user.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    let result;
    if (isInternal) {
      // Local save and broadcast for internal media
      const mime = require('mime-types');
      const ext = mime.extension(file.mimetype) || 'bin';
      const filename = `${crypto.randomUUID()}.${ext}`;
      const safeTenantId = path.basename(String(conversation.tenantId));
      const tenantDir = path.join(__dirname, '../../uploads', safeTenantId);
      
      const fs = require('fs');
      const fsp = require('fs/promises');
      try { await fsp.mkdir(tenantDir, { recursive: true }); }
      catch (e) { if (e.code !== 'EEXIST') throw e; }
      
      const filepath = path.join(tenantDir, filename);
      await fsp.copyFile(file.path, filepath);
      
      let mediaType = 'document';
      if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) mediaType = 'image';
      else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
      else if (file.mimetype.startsWith('video/')) mediaType = 'video';
      
      result = await prisma.message.create({
        data: {
          conversationId,
          senderType: req.user.role,
          senderId: req.user.id,
          content: caption ? `[${mediaType.toUpperCase()} interno] ${caption.trim()}` : `[${mediaType.toUpperCase()} interno]`,
          status: 'SENT',
          isInternal: true,
          attachments: {
            create: {
              type: mediaType.toUpperCase(),
              url: `/uploads/${conversation.tenantId}/${filename}`,
              mimeType: file.mimetype,
              size: file.size
            }
          }
        },
        include: { attachments: true }
      });
      
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() }
      });
      
      try {
        socket.getIo().of('/chat').to(`conversation:${conversationId}`).to(`tenant_${conversation.tenantId}_coordinators`).emit('new_message', result);
      } catch (err) {
        console.error('[CHAT_ROUTE] No se pudo emitir mensaje interno por socket:', err.message);
      }

      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (e) {
        console.error('Failed to unlink temp file:', e);
      }
    } else {
      result = await whatsappService.sendMedia(req.params.conversationId, req.file, caption, req.user.id, req.user.role);
      
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (e) {
        console.error('Failed to unlink file:', e);
      }
    }

    res.status(201).json({ data: result });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting orphaned file:', err.message);
        });
      } catch (err) {
        console.error('Error deleting orphaned file:', err.message);
      }
    }
    next(error);
  }
});

router.get('/conversations', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const whereClause = { tenantId: req.user.tenantId };
    if (req.user.role === 'VENDOR') {
      whereClause.vendorId = req.user.id;
    }
    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: { client: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { lastMessageAt: 'desc' }
    });
    res.json({ data: conversations });
  } catch (error) {
    next(error);
  }
});

router.post('/:conversationId/messages/:messageId/tags', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const { conversationId, messageId } = req.params;
    const { tag } = req.body;

    if (!tag || typeof tag !== 'string' || !tag.trim()) {
      return res.status(400).json({ error: 'Tag is required' });
    }

    const cleanTag = tag.trim();
    if (cleanTag.length > 50) {
      return res.status(400).json({ error: 'Tag too long' });
    }

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.tenantId !== req.user.tenantId || (req.user.role === 'VENDOR' && conversation.vendorId !== req.user.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const message = await prisma.message.findFirst({ where: { id: messageId, conversationId } });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.tags.includes(cleanTag)) {
      return res.json({ data: message }); // Already has the tag
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        tags: {
          push: cleanTag
        }
      }
    });

    try {
      const io = socket.getIo();
      io.of('/chat').to(`conversation:${conversationId}`).to(`tenant_${conversation.tenantId}_coordinators`).emit('message_updated', updatedMessage);
    } catch (err) {
      console.error('Failed to emit message_updated', err);
    }

    res.json({ data: updatedMessage });
  } catch (error) {
    next(error);
  }
});

router.delete('/:conversationId/messages/:messageId/tags/:tag', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const { conversationId, messageId, tag } = req.params;
    
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.tenantId !== req.user.tenantId || (req.user.role === 'VENDOR' && conversation.vendorId !== req.user.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const message = await prisma.message.findFirst({ where: { id: messageId, conversationId } });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Filter out the tag
    const newTags = message.tags.filter(t => t !== tag);

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        tags: {
          set: newTags
        }
      }
    });

    try {
      const io = socket.getIo();
      io.of('/chat').to(`conversation:${conversationId}`).to(`tenant_${conversation.tenantId}_coordinators`).emit('message_updated', updatedMessage);
    } catch (err) {
      console.error('Failed to emit message_updated', err);
    }

    res.json({ data: updatedMessage });
  } catch (error) {
    next(error);
  }
});


router.get('/search', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    let { q } = req.query;
    if (Array.isArray(q)) q = q[0];
    if (typeof q !== 'string') q = '';
    
    q = q.trim();
    if (!q) {
      const error = new Error('Search query is required');
      error.status = 400;
      throw error;
    }

    const whereClause = {
      OR: [
        {
          content: {
            contains: q,
            mode: 'insensitive'
          }
        },
        {
          tags: {
            has: q
          }
        }
      ],
      conversation: {
        tenantId: req.user.tenantId
      }
    };

    if (req.user.role === 'VENDOR') {
      whereClause.conversation.vendorId = req.user.id;
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        conversation: {
          include: {
            client: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ data: messages });
  } catch (error) {
    next(error);
  }
});

router.get('/:conversationId/messages', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const cursor = req.query.cursor;
    const aroundMessageId = req.query.aroundMessageId;

    if (aroundMessageId) {
      // Fetch messages around a specific message
      const findArgs = {
        where: { 
          conversationId: req.params.conversationId,
          conversation: {
            tenantId: req.user.tenantId,
            ...(req.user.role === 'VENDOR' && { vendorId: req.user.id })
          }
        },
        orderBy: { createdAt: 'desc' }
      };

      // Fetch 25 older (including the message itself)
      const older = await prisma.message.findMany({
        ...findArgs,
        take: Math.floor(limit / 2) + 1,
        cursor: { id: aroundMessageId }
      });

      // Fetch 25 newer (excluding the message itself)
      const newer = await prisma.message.findMany({
        ...findArgs,
        take: -(Math.floor(limit / 2)),
        skip: 1,
        cursor: { id: aroundMessageId }
      });

      // Combine and return chronological
      let messages = [...newer, ...older].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Determine if there are more
      let hasMore = older.length > Math.floor(limit / 2);
      let nextCursor = hasMore ? older[older.length - 1].id : null;

      return res.json({
        data: messages,
        meta: { hasMore, nextCursor }
      });
    }

    const findArgs = {
      where: { 
        conversationId: req.params.conversationId,
        conversation: {
          tenantId: req.user.tenantId,
          ...(req.user.role === 'VENDOR' && { vendorId: req.user.id })
        }
      },
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    };

    if (cursor) {
      findArgs.cursor = { id: cursor };
      findArgs.skip = 1;
    }

    let messages = await prisma.message.findMany(findArgs);

    let hasMore = false;
    if (messages.length > limit) {
      hasMore = true;
      messages.pop(); // Remove the extra element
    }

    let nextCursor = null;
    if (hasMore && messages.length > 0) {
      nextCursor = messages[messages.length - 1].id;
    }

    // Reverse to return them in chronological order
    messages = messages.reverse();

    res.json({
      data: messages,
      meta: {
        hasMore,
        nextCursor
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:conversationId/assign', authenticate, authorize('ADMIN', 'COORDINATOR'), async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { vendorId } = req.body;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { client: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (!conversation || conversation.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const oldVendorId = conversation.vendorId;
    const normalizedVendorId = vendorId ? vendorId : null;

    if (normalizedVendorId === oldVendorId) {
      return res.json({ data: conversation });
    }

    if (normalizedVendorId) {
      const vendor = await prisma.user.findFirst({
        where: { id: normalizedVendorId, tenantId: req.user.tenantId }
      });
      if (!vendor) {
        return res.status(400).json({ error: 'Asesor inválido o de otro tenant' });
      }
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        vendorId: normalizedVendorId,
        status: normalizedVendorId ? 'ACTIVE' : 'PENDING_ASSIGNMENT'
      },
      include: { client: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    try {
      const io = socket.getIo();
      
      // Notificar al antiguo vendor para que remueva la conversacion
      if (oldVendorId) {
        io.of('/chat').to(`vendor_${oldVendorId}`).emit('conversation_reassigned', {
          action: 'removed',
          conversationId
        });
      }

      // Notificar al nuevo vendor para que agregue la conversacion
      if (vendorId) {
        io.of('/chat').to(`vendor_${vendorId}`).emit('conversation_reassigned', {
          action: 'added',
          conversation: updatedConversation
        });
      }

      // Notificar a los coordinadores
      io.of('/chat').to(`tenant_${req.user.tenantId}_coordinators`).emit('conversation_updated', updatedConversation);
    } catch (socketErr) {
      console.error('Failed to emit conversation_reassigned', socketErr);
    }

    res.json({ data: updatedConversation });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
