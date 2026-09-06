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
    const { content, isInternal = false, type = 'TEXT', metadata = null } = req.body;
    
    if (!content && type === 'TEXT') {
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

    if (isInternal && conversation.status === 'PENDING_ASSIGNMENT' && ['ADMIN', 'COORDINATOR'].includes(req.user.role)) {
      return res.status(400).json({ error: 'No se pueden enviar susurros en una conversación sin asignar' });
    }

    let message;
    if (isInternal) {
      message = await prisma.message.create({
        data: {
          conversationId,
          senderType: req.user.role,
          senderId: req.user.id,
          content,
          type,
          metadata: metadata ? metadata : undefined,
          status: 'SENT',
          isInternal: true
        }
      });
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), unreadCount: 0 }
      });
      // Also emit chat:read so UI clears badges
      try {
        const io = socket.getIo();
        io.of('/chat').to(`tenant_${conversation.tenantId}_coordinators`).emit('chat:read', { conversationId });
      } catch (err) {}
      try {
        let ioEvent = socket.getIo().of('/chat').to(`conversation:${conversationId}`).to(`tenant_${conversation.tenantId}_coordinators`);
        if (conversation.vendorId) ioEvent = ioEvent.to(`vendor_${conversation.vendorId}`);
        ioEvent.emit('new_message', message);
        
        // Enviar Push Notification si el remitente no es el propio vendor asignado
        if (conversation.vendorId && conversation.vendorId !== req.user.id) {
          const pushService = require('../services/push.service');
          const senderName = req.user.name || 'El equipo';
          const pushPayload = {
            notification: { 
              title: 'Nuevo susurro interno', 
              body: `${senderName}: ${content}` 
            },
            android: { priority: 'high', notification: { channel_id: 'salesflow_urgent_v1', tag: conversation.id, sound: 'default' } },
            apns: { payload: { aps: { 'thread-id': conversation.id, sound: 'default' } } },
            data: { 
              chatId: conversation.id, 
              type: 'new_message',
              notifee_title: 'Susurro interno',
              notifee_body: `${senderName}: ${content}`
            }
          };
          pushService.sendPushToVendor(conversation.vendorId, pushPayload).catch(err => {
            console.error('[CHAT_ROUTE] Error enviando push del susurro:', err.message);
          });
        }
      } catch (err) {
        console.error('[CHAT_ROUTE] No se pudo emitir mensaje interno por socket:', err.message);
      }
    } else {
      message = await whatsappService.sendMessage(conversationId, content, req.user.id, req.user.role, type, metadata);
    }
    res.status(201).json({ data: message });
  } catch (error) {
    if (error.code === 'TENANT_SUSPENDED') {
      return res.status(403).json({ error: 'TENANT_SUSPENDED', message: error.message });
    }
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
      try {
        await fsp.rename(file.path, filepath);
      } catch (err) {
        if (err.code === 'EXDEV') {
          await fsp.copyFile(file.path, filepath);
          fs.unlinkSync(file.path);
        } else {
          throw err;
        }
      }
      
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
              size: file.size,
              name: file.originalname
            }
          }
        },
        include: { attachments: true }
      });
      
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), unreadCount: 0 }
      });
      // Also emit chat:read so UI clears badges
      try {
        const io = socket.getIo();
        io.of('/chat').to(`tenant_${conversation.tenantId}_coordinators`).emit('chat:read', { conversationId });
      } catch (err) {}
      
      try {
        socket.getIo().of('/chat').to(`conversation:${conversationId}`).to(`tenant_${conversation.tenantId}_coordinators`).emit('new_message', result);
      } catch (err) {
        console.error('[CHAT_ROUTE] No se pudo emitir mensaje interno por socket:', err.message);
      }
    } else {
      result = await whatsappService.sendMedia(req.params.conversationId, req.file, caption, req.user.id, req.user.role, req.file.originalname);
      
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
    if (error.code === 'TENANT_SUSPENDED') {
      return res.status(403).json({ error: 'TENANT_SUSPENDED', message: error.message });
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
    // Exclude CLOSED by default for operational dashboard unless requested,
    // but ALWAYS include CLOSED conversations from the current day so they don't vanish immediately.
    if (req.query.includeClosed !== 'true') {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const terminalStates = ['CLOSED', 'CLOSED_WON', 'CLOSED_INACTIVE', 'DISCARDED'];
      
      whereClause.OR = [
        { status: { notIn: terminalStates } },
        { 
          status: { in: terminalStates },
          lastMessageAt: { gte: twentyFourHoursAgo }
        }
      ];
    }
    const conversations = await prisma.conversation.findMany({
        where: whereClause,
        include: { client: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 }, tenant: { select: { businessHours: true, isSlaEnabled: true } } },
        orderBy: { lastMessageAt: 'desc' }
      });

      // Calculate SLA on the fly
      const { getBusinessMinutesElapsed } = require('../utils/date');
      const slaService = require('../services/sla.service');
      const slaConfig = await slaService.getSlaConfig(req.user.tenantId);
      const now = Date.now();

      const enriched = conversations.map(conv => {
        let isSlaBreached = false;
        let breachType = null;
        
        if (conv.tenant?.isSlaEnabled !== false) {
          let metric = null;
          let thresholdMins = 0;
          let startTime = null;

          if (conv.status === 'PENDING_ASSIGNMENT' || conv.status === 'ESCALATED') {
            metric = 'firstResponse';
            thresholdMins = slaConfig.firstResponseMins;
            startTime = conv.lastMessageAt || conv.createdAt;
          } else if (conv.status === 'ACTIVE') {
            metric = 'resolution';
            thresholdMins = slaConfig.resolutionMins;
            startTime = conv.createdAt;
          }

          if (metric && startTime) {
            const startTimeMs = new Date(startTime).getTime();
            let elapsedMins = getBusinessMinutesElapsed(startTimeMs, now, conv.tenant.businessHours);
            if (metric === 'resolution' && conv.slaPausedMins > 0) {
              elapsedMins = Math.max(0, elapsedMins - conv.slaPausedMins);
            }
            if (elapsedMins > thresholdMins) {
              isSlaBreached = true;
              breachType = metric;
            }
          }
        }
        
        // Remove tenant object to keep payload clean
        const { tenant, ...convData } = conv;
        return { ...convData, isSlaBreached, breachType };
      });

      res.json({ data: enriched });
  } catch (error) {
    next(error);
  }
});

router.get('/history', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const { search, vendorId, startDate, endDate, aiAbandoned, page = 1, limit = 20 } = req.query;
    const tenantId = req.user.tenantId;

    const terminalStates = ['CLOSED', 'CLOSED_WON', 'CLOSED_INACTIVE', 'DISCARDED'];
    
    const whereClause = {
      tenantId,
      status: { in: terminalStates }
    };

    if (req.user.role === 'VENDOR') {
      whereClause.vendorId = req.user.id;
    } else if (aiAbandoned === 'true') {
      whereClause.vendorId = null;
      whereClause.status = 'CLOSED_INACTIVE';
    } else if (vendorId) {
      whereClause.vendorId = vendorId;
    }

    if (startDate || endDate) {
      whereClause.updatedAt = {};
      if (startDate) whereClause.updatedAt.gte = new Date(startDate);
      if (endDate) whereClause.updatedAt.lte = new Date(endDate);
    }

    // Format query for Postgres to_tsquery (e.g. "hola mundo" -> "hola | mundo")
    const formattedQuery = search ? search.trim().split(/\s+/).filter(Boolean).join(' | ') : undefined;

    if (formattedQuery) {
      whereClause.messages = {
        some: {
          content: {
            search: formattedQuery
          }
        }
      };
    }

    const total = await prisma.conversation.count({ where: whereClause });
    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        client: true,
        vendor: { select: { id: true, name: true, email: true } },
        messages: formattedQuery ? {
          where: {
            content: {
              search: formattedQuery
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        } : { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    if (search) {
      const searchWords = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      await Promise.all(conversations.map(async (conv) => {
        if (conv.messages && conv.messages.length > 0) {
          const msg = conv.messages[0];
          let content = msg.content || msg.text || '';
          
          const prevMsg = await prisma.message.findFirst({
            where: {
              conversationId: conv.id || conv._id,
              createdAt: { lt: msg.createdAt }
            },
            orderBy: { createdAt: 'desc' }
          });

          if (prevMsg) {
            const prevText = prevMsg.content || prevMsg.text || '';
            content = prevText + ' — ' + content;
          }

          const contentLower = content.toLowerCase();
          const idxs = searchWords.map(w => contentLower.indexOf(w)).filter(i => i !== -1).sort((a,b) => a-b);
          
          if (idxs.length > 0) {
            const idx = idxs[0];
            const start = Math.max(0, idx - 45);
            const end = Math.min(content.length, idx + searchWords[0].length + 60);
            let snippet = content.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < content.length) snippet = snippet + '...';
            msg.searchSnippet = snippet;
            msg.content = snippet;
          } else {
            msg.searchSnippet = content.substring(0, 100) + '...';
            msg.content = msg.searchSnippet;
          }
        }
      }));
    }

    res.json({
      data: conversations,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:conversationId/messages/:messageId/forward', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const { conversationId, messageId } = req.params;
    
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { attachments: true, conversation: true }
    });
    
    if (!message || message.attachments.length === 0) {
      return res.status(404).json({ error: 'Message or attachment not found' });
    }
    
    const attachment = message.attachments[0];
    const filename = attachment.url.split('/').pop();
    const safeTenantId = path.basename(String(message.conversation.tenantId));
    
    const filePath = path.resolve(__dirname, '../../uploads', safeTenantId, filename);
    const tenantDir = path.resolve(__dirname, '../../uploads', safeTenantId);
    
    try {
      const filesInDir = fs.existsSync(tenantDir) ? fs.readdirSync(tenantDir) : [];
      console.log(`[FORWARD DEBUG] Files in ${tenantDir}:`, filesInDir);
      console.log(`[FORWARD DEBUG] Looking for: ${filename}. Exists? ${fs.existsSync(filePath)}`);
    } catch (e) {
      console.error('[FORWARD DEBUG] Failed to read directory:', e);
    }
    
    const mockFile = {
      path: filePath,
      mimetype: attachment.mimeType,
      originalname: filename,
      size: attachment.size
    };
    
    try {
      const result = await whatsappService.sendMedia(conversationId, mockFile, null, req.user.id, req.user.role, attachment.name);
      res.status(201).json({ data: result });
    } catch (e) {
      console.error(`[FORWARD] Error forwarding media:`, e);
      return res.status(500).json({ error: `Forward failed: ${e.message}` });
    }
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

    const currentConv = await prisma.conversation.findUnique({
      where: { id: req.params.conversationId },
      select: { clientId: true, createdAt: true, tenantId: true }
    });

    let adjacentSessions = { previousSessionId: null, nextSessionId: null };
    
    if (currentConv && currentConv.clientId && currentConv.tenantId === req.user.tenantId) {
      const [prevConv, nextConv] = await Promise.all([
        prisma.conversation.findFirst({
          where: { 
            clientId: currentConv.clientId, 
            createdAt: { lt: currentConv.createdAt },
            tenantId: req.user.tenantId
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true }
        }),
        prisma.conversation.findFirst({
          where: { 
            clientId: currentConv.clientId, 
            createdAt: { gt: currentConv.createdAt },
            tenantId: req.user.tenantId
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true }
        })
      ]);
      adjacentSessions = {
        previousSessionId: prevConv?.id || null,
        nextSessionId: nextConv?.id || null
      };
    }

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
        orderBy: { createdAt: 'desc' },
        include: { attachments: true }
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
        meta: { hasMore, nextCursor, ...adjacentSessions }
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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { attachments: true }
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
        nextCursor,
        ...adjacentSessions
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
        status: normalizedVendorId ? 'ACTIVE' : 'PENDING_ASSIGNMENT',
        ...(normalizedVendorId && !oldVendorId && { assignedAt: new Date() }),
        ...(!normalizedVendorId && { assignedAt: null })
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

        // --- PUSH NOTIFICATION INTEGRATION ---
        try {
          const pushService = require('../services/push.service');
          const pushPayload = {
            notification: { 
              title: 'Nueva conversación asignada', 
              body: `Se te ha asignado un chat con ${updatedConversation.client?.name || updatedConversation.client?.phone || 'un cliente'}.` 
            },
            android: { priority: 'high', notification: { channel_id: 'salesflow_urgent_v1', sound: 'default' } },
            apns: { payload: { aps: { sound: 'default' } } },
            data: { 
              chatId: updatedConversation.id, 
              type: 'chat_assigned',
              notifee_title: updatedConversation.client?.name || updatedConversation.client?.phone || 'SalesFlow',
              notifee_body: `Se te ha asignado este chat.`
            }
          };
          pushService.sendPushToVendor(vendorId, pushPayload).catch(err => {
            console.error('[PUSH_SERVICE] Error trigger on assignment:', err.message);
          });
        } catch (err) {
          console.error('[PUSH_SERVICE] Failed to process assignment push notification:', err.message);
        }
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

router.patch('/:conversationId/resolve', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation || conversation.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    if (req.user.role === 'VENDOR' && conversation.vendorId !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado para cerrar esta conversación' });
    }

    if (conversation.status === 'CLOSED') {
      return res.json({ data: conversation });
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'CLOSED' }
    });

    try {
      const io = socket.getIo();
      io.of('/chat').to(`conversation:${conversationId}`).to(`tenant_${req.user.tenantId}_coordinators`).emit('chat:resolved', { conversationId, status: 'CLOSED' });
    } catch (socketErr) {
      console.error('Failed to emit chat:resolved', socketErr);
    }

    res.json({ data: updatedConversation });
  } catch (error) {
    next(error);
  }
});

// PDF Generation Route
const PdfGeneratorService = require('../services/pdf.service');

router.post('/quote/generate', authenticate, async (req, res, next) => {
  try {
    const { client, cartItems, conversationId } = req.body;
    
    // We can generate a temporary path to save the PDF
    const tempFileName = `cotizacion_${Date.now()}.pdf`;
    const tempFilePath = path.join(__dirname, '../../uploads/temp', tempFileName);
    
    // Ensure directory exists
    const dir = path.dirname(tempFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Fetch tenant (company) data to include in the quote
    let companyData = null;
    if (req.user && req.user.tenantId) {
      companyData = await prisma.tenant.findUnique({
        where: { id: req.user.tenantId }
      });
    }

    // Generate the PDF
    await PdfGeneratorService.generateQuote(client, cartItems, companyData, tempFilePath);
    
    // If conversationId is provided, send it via WhatsApp to the client
    if (conversationId) {
      try {
        const fileObj = {
          path: tempFilePath,
          mimetype: 'application/pdf',
          originalname: 'Cotizacion.pdf'
        };
        const vendorId = req.user.id || req.user.name; // Ideally we use ID, fallback to name
        await whatsappService.sendMedia(
          conversationId,
          fileObj,
          '📄 *Aquí tienes tu Cotización Formal.*\nAdjunto el documento con el detalle de tu pedido y nuestras instrucciones de pago.',
          vendorId,
          'VENDOR',
          'Cotizacion.pdf',
          false
        );
      } catch (wsErr) {
        console.error('Error sending PDF via WhatsApp:', wsErr);
      }
    }
    
    // Send the file to the client
    const fileBuffer = fs.readFileSync(tempFilePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${tempFileName}"`);
    res.send(fileBuffer);

    // Clean up the temp file after sending
    fs.unlink(tempFilePath, (unlinkErr) => {
      if (unlinkErr) console.error('Error deleting temp PDF:', unlinkErr);
    });

  } catch (error) {
    console.error('Error generating PDF route:', error);
    res.status(500).json({ error: 'Hubo un error al generar la cotización PDF' });
  }
});

router.post('/outbound', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const { clientId, message } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client || client.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // In a real scenario, we would send a template message to WhatsApp here
    // For this spec, we just create the conversation marked as isOutbound = true
    const conversation = await prisma.conversation.create({
      data: {
        clientId: client.id,
        tenantId: req.user.tenantId,
        status: 'ACTIVE',
        vendorId: req.user.id,
        isOutbound: true
      }
    });

    if (message) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: message,
          senderType: 'VENDOR',
          status: 'SENT'
        }
      });
    }

    const io = socket.getIo();
    io.of('/chat').to(`tenant_${req.user.tenantId}`).emit('new_conversation', conversation);

    res.json({ data: conversation });
  } catch (error) {
    next(error);
  }
});

router.post('/quote/send-email', authenticate, async (req, res, next) => {
  try {
    const { client, cartItems, email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' });
    }
    
    const tempFileName = `cotizacion_${Date.now()}.pdf`;
    const tempFilePath = path.join(__dirname, '../../uploads/temp', tempFileName);
    const dir = path.dirname(tempFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let companyData = null;
    if (req.user && req.user.tenantId) {
      companyData = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    }

    await PdfGeneratorService.generateQuote(client, cartItems, companyData, tempFilePath);
    
    const EmailService = require('../services/email.service');
    await EmailService.sendQuotationEmail(email, client.name || client.razonSocial || 'Cliente', tempFilePath);

    fs.unlink(tempFilePath, (err) => {
      if (err) console.error('Error deleting temp PDF:', err);
    });

    res.json({ success: true, message: 'Cotización enviada por correo exitosamente' });
  } catch (error) {
    console.error('Error sending PDF email:', error);
    res.status(500).json({ error: 'Hubo un error al enviar el correo' });
  }
});

/**
 * @swagger
 * /chat/{conversationId}/status:
 *   patch:
 *     summary: Cambiar el estado de una conversación
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:conversationId/status', authenticate, authorize('ADMIN', 'COORDINATOR', 'VENDOR'), async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { status, reason, timebombHours, scheduledAt } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'El campo status es requerido.' });
    }

    if (status === 'CLOSED_INACTIVE') {
      return res.status(403).json({ error: 'Transición a CLOSED_INACTIVE no permitida manualmente.' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { tenant: true }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada.' });
    }

    // Ownership check for vendors
    if (req.user.role === 'VENDOR' && conversation.vendorId !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado para modificar el estado de esta conversación.' });
    }
    
    // Check SLA enabled flag before entering advanced states
    const advancedStates = ['WAITING_CUSTOMER', 'SCHEDULED', 'ON_HOLD', 'DISCARDED'];
    if (advancedStates.includes(status)) {
      if (!conversation.tenant.isSlaEnabled) {
        return res.status(400).json({ error: 'SLA is disabled for this tenant. Cannot transition to advanced paused states.' });
      }
    }

    // Transaction logic
    const dayjs = require('dayjs');
    const utc = require('dayjs/plugin/utc');
    dayjs.extend(utc);

    await prisma.$transaction(async (tx) => {
      // Bloqueo explícito de la fila para evitar Race Conditions (TOCTOU) con Webhooks
      await tx.$queryRaw`SELECT id FROM "conversations" WHERE id = ${conversationId} FOR UPDATE`;

      // Logic for WAITING_CUSTOMER or SCHEDULED
      if (['WAITING_CUSTOMER', 'SCHEDULED'].includes(status)) {
        const lastMsg = await tx.message.findFirst({
          where: { conversationId },
          orderBy: { createdAt: 'desc' }
        });
        
        // Allowed senders for pause: VENDOR, IA (based on Prisma schema)
        if (!lastMsg || !['VENDOR', 'IA'].includes(lastMsg.senderType)) {
          throw new Error('400:El último mensaje debe ser del Vendedor o Bot para pausar el SLA.');
        }

        if (status === 'SCHEDULED') {
          if (!scheduledAt) throw new Error('400:scheduledAt es requerido para el estado SCHEDULED.');
          const sDate = dayjs.utc(scheduledAt);
          if (!sDate.isValid() || sDate.isBefore(dayjs.utc())) {
             throw new Error('400:scheduledAt debe ser una fecha futura válida.');
          }
          if (sDate.isAfter(dayjs.utc().add(30, 'day'))) {
             throw new Error('400:scheduledAt no puede exceder 30 días en el futuro.');
          }
        }
      }

      // Logic for ON_HOLD
      if (status === 'ON_HOLD') {
        if (!reason || typeof reason !== 'string' || reason.trim() === '') {
          throw new Error('400:reason es requerido y no puede estar vacío.');
        }
        if (reason.trim().length > 255) {
          throw new Error('400:reason no puede exceder 255 caracteres.');
        }
        if (!timebombHours || !Number.isInteger(timebombHours) || timebombHours <= 0 || timebombHours > 168) {
           throw new Error('400:timebombHours debe ser un entero entre 1 y 168.');
        }
      }

      // Update state
      let dataToUpdate = {
        status,
        statusUpdatedAt: new Date(),
      };

      if (status === 'ACTIVE' && ['WAITING_CUSTOMER', 'SCHEDULED', 'ON_HOLD'].includes(conversation.status)) {
        const now = new Date();
        const { getBusinessMinutesElapsed } = require('../utils/date');
        let pausedMins = 0;
        try {
          const statusUpdatedTime = new Date(conversation.statusUpdatedAt).getTime();
          if (conversation.tenant && conversation.tenant.businessHours) {
            pausedMins = getBusinessMinutesElapsed(statusUpdatedTime, now, conversation.tenant.businessHours);
          } else {
            pausedMins = Math.floor((now.getTime() - statusUpdatedTime) / 60000);
          }
        } catch(e) {
          console.error('[API] Error calculating paused SLA minutes:', e);
        }
        dataToUpdate.slaPausedMins = { increment: Math.floor(Math.max(0, pausedMins)) };
      }

      if (status === 'SCHEDULED') {
        dataToUpdate.scheduledAt = dayjs.utc(scheduledAt).toDate();
      } else if (status === 'ON_HOLD') {
        dataToUpdate.onHoldReason = reason.trim();
        dataToUpdate.onHoldExpiration = dayjs.utc().add(timebombHours, 'hour').toDate();
      }

      if (['CLOSED_WON', 'CLOSED', 'CLOSED_INACTIVE', 'DISCARDED'].includes(status)) {
        const clientRec = await tx.client.findUnique({ where: { id: conversation.clientId } });
        if (clientRec && clientRec.cartData) {
          dataToUpdate.cartSnapshot = clientRec.cartData;
          
          let newCartData = {};
          if (typeof clientRec.cartData === 'object' && !Array.isArray(clientRec.cartData)) {
            // Keep everything except items
            newCartData = { ...clientRec.cartData };
            delete newCartData.items;
          } else {
            newCartData = [];
          }
          
          await tx.client.update({
            where: { id: conversation.clientId },
            data: { cartData: newCartData }
          });
        }
      }

      await tx.conversation.update({
          where: { id: conversationId },
          data: dataToUpdate
        });

        if (conversation.status !== status) {
          let textContent = `[Estado cambiado a ${status}]`;
          if (status === 'ON_HOLD') {
             textContent = `[Pausado - On Hold] Motivo: ${reason.trim()} | Expira en ${timebombHours} horas`;
          } else if (status === 'SCHEDULED') {
             const djs = require('dayjs');
               const timezone = require('dayjs/plugin/timezone');
               const utcPlugin = require('dayjs/plugin/utc');
               djs.extend(utcPlugin);
               djs.extend(timezone);
               
               let tz = 'America/Mexico_City';
               if (conversation.tenant && conversation.tenant.businessHours && conversation.tenant.businessHours.timezone) {
                 tz = conversation.tenant.businessHours.timezone;
               }
               
               textContent = `[Programado] Seguimiento para el ${djs.utc(scheduledAt).tz(tz).format('YYYY-MM-DD HH:mm')}`;
          } else if (status === 'WAITING_CUSTOMER') {
             textContent = `[Esperando al Cliente]`;
          } else if (status === 'ACTIVE') {
             textContent = `[Activo] Conversación reactivada por el vendedor`;
          }

          const footprint = await tx.message.create({
            data: {
              conversationId: conversation.id,
              content: textContent,
              senderType: 'SYSTEM',
              status: 'SENT',
              isInternal: true,
              type: 'TEXT'
            }
          });
          
          // Attach footprint to request for emitting later
          req._footprint = footprint;
        }
      });

    const updated = await prisma.conversation.findUnique({ where: { id: conversationId } });

    // Emit socket
    try {
      let ioEvent = socket.getIo().of('/chat').to(`conversation:${conversationId}`).to(`tenant_${req.user.tenantId}_coordinators`);
      if (updated.vendorId) ioEvent = ioEvent.to(`vendor_${updated.vendorId}`);
      ioEvent.emit('conversation_updated', updated);
      if (req._footprint) ioEvent.emit('new_message', req._footprint);
    } catch (err) {
      console.error('[CHAT_ROUTE] Error emitting status socket:', err.message);
    }

    res.status(200).json({ data: updated });
  } catch (error) {
    if (error.message && error.message.startsWith('400:')) {
       return res.status(400).json({ error: error.message.substring(4) });
    }
    next(error);
  }
});

module.exports = router;
