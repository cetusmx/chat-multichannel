const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');
const socket = require('../socket');
const { isOffHours } = require('../utils/date');
const crypto = require('crypto');
const aiService = require('./ai.service');
const assignmentService = require('./assignment.service');
const prisma = new PrismaClient();

const incomingLocks = new Map();
const activeAiGenerations = new Set();

/**
 * Servicio para integración con WhatsApp Business API.
 */
const whatsappService = {
  /**
   * Obtiene la configuración de WhatsApp para un tenant.
   * @param {string} tenantId ID del tenant.
   */
  async getConfig(tenantId) {
    try {
      let config = await prisma.whatsAppConfig.findUnique({
        where: { tenantId }
      });
      if (config && config.accessToken) {
        const { decrypt } = require('../utils/encryption');
        try {
          config.accessToken = decrypt(config.accessToken);
        } catch (e) {
          console.error(`[WHATSAPP_SERVICE] Error decrypting token for tenant ${tenantId}`, e);
        }
      }
      return config;
    } catch (error) {
      console.error(`[WHATSAPP_SERVICE] Error fetching config for tenant ${tenantId}:`, error);
      throw error;
    }
  },

  /**
   * Actualiza las credenciales de WhatsApp Business.
   * @param {string} tenantId ID del tenant.
   * @param {Object} data payload (phoneNumberId, accessToken, verifyToken, etc)
   */
  async updateConfig(tenantId, data) {
    try {
      return await prisma.whatsAppConfig.upsert({
        where: { tenantId },
        update: data,
        create: { ...data, tenantId }
      });
    } catch (error) {
      console.error(`[WHATSAPP_SERVICE] Error updating config for tenant ${tenantId}:`, error);
      throw error;
    }
  },

  /**
   * Verifica el Webhook inicial con Meta (hub.verify_token).
   * @param {Object} query Parámetros GET (hub.mode, hub.verify_token, hub.challenge)
   * @param {string} tenantId ID del tenant (puede ser mapeado por URL o global).
   * @returns {string} El challenge si es exitoso.
   */
  async verifyWebhook(query, tenantId) {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = query;

    if (mode === 'subscribe' && token) {
      const config = await this.getConfig(tenantId);
      
      if (!config || config.verifyToken !== token) {
        const error = new Error('Verification failed');
        error.status = 403;
        throw error;
      }
      
      return challenge;
    }
    
    const error = new Error('Invalid request');
    error.status = 400;
    throw error;
  },

  /**
   * Procesa el evento entrante (POST) desde WhatsApp Webhook.
   * @param {Object} payload Payload enviado por Meta
   * @param {string} tenantId ID del tenant asociado al webhook
   */
  async handleIncomingMessage(payload, tenantId) {
    try {
      console.log(`[WHATSAPP_SERVICE] Webhook received for tenant: ${tenantId}`);
      
      if (payload.object !== 'whatsapp_business_account') return false;
      
      const entries = payload.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          // Ignoramos statuses (leídos, entregados) por ahora en este MVP.
          if (value && value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            const contact = value.contacts && value.contacts[0];
            
            const clientPhone = message.from;
            const clientName = contact?.profile?.name || null;
            const waMessageId = message.id;

            let text = '';
            let mediaData = null;
            if (message.type === 'text') {
              text = message.text.body;
            } else if (['image', 'document', 'audio', 'video'].includes(message.type)) {
              text = `[${message.type.toUpperCase()} adjunto]`;
              const mediaObj = message[message.type];
              if (mediaObj && mediaObj.id) {
                mediaData = {
                  id: mediaObj.id,
                  mime_type: mediaObj.mime_type,
                  type: message.type.toUpperCase(),
                  filename: mediaObj.filename
                };
              }
            }
            
            
            const lockKey = `${tenantId}_${clientPhone}`;
            while (incomingLocks.get(lockKey)) {
              await incomingLocks.get(lockKey);
            }
            let releaseLock;
            incomingLocks.set(lockKey, new Promise(r => releaseLock = r));
            
            try {
              // 1. Encontrar o Crear al Cliente
              const client = await prisma.client.findUnique({
                where: { tenantId_phoneNumber: { tenantId, phoneNumber: clientPhone } }
              });
              
              if (client && client.isBlocked) {
                console.log(`[WHATSAPP_SERVICE] Client ${clientPhone} is blocked. Ignoring message.`);
                continue;
              }
              
              const finalClient = client ? 
                await prisma.client.update({
                  where: { id: client.id },
                  data: { name: client.name || clientName || 'Usuario WhatsApp' }
                }) : 
                await prisma.client.create({
                  data: { tenantId, phoneNumber: clientPhone, name: clientName || 'Usuario WhatsApp' }
                });
            
            // 2. Encontrar Conversación Abierta o PENDIENTE
            let conversation = await prisma.conversation.findFirst({
              where: { 
                tenantId, 
                clientId: finalClient.id, 
                status: { in: ['ACTIVE', 'PENDING_ASSIGNMENT', 'ESCALATED'] } 
              }
            });
            
            if (!conversation) {
              conversation = await prisma.conversation.create({
                data: { tenantId, clientId: finalClient.id, status: 'PENDING_ASSIGNMENT' }
              });
              try {
                await assignmentService.autoAssign(tenantId, conversation.id);
              } catch (autoAssignErr) {
                console.error(`[WHATSAPP_SERVICE] Error auto-assigning chat for tenant ${tenantId}, conversation ${conversation.id}:`, autoAssignErr);
              }
            } else {
              if (conversation.status === 'PENDING_ASSIGNMENT') {
                try {
                  await assignmentService.autoAssign(tenantId, conversation.id);
                } catch (autoAssignErr) {
                  console.error(`[WHATSAPP_SERVICE] Error auto-assigning chat for tenant ${tenantId}, conversation ${conversation.id}:`, autoAssignErr);
                }
              }
              // Actualizar fecha del último mensaje
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { lastMessageAt: new Date() }
              });
            }
            
            // 3. Guardar el Mensaje
            let msgRecord = await prisma.message.create({
              data: {
                conversationId: conversation.id,
                senderType: 'CLIENT',
                content: text,
                waMessageId,
                status: 'DELIVERED'
              },
              include: { attachments: true }
            });
            
            // Handle Media Download
            if (mediaData) {
              const config = await this.getConfig(tenantId);
              if (config && config.accessToken) {
                try {
                  const metaRes = await fetch(`https://graph.facebook.com/${env.metaApiVersion}/${mediaData.id}`, {
                    headers: { 'Authorization': `Bearer ${config.accessToken}` }
                  });
                  if (metaRes.ok) {
                    const metaJson = await metaRes.json();
                    if (metaJson.url) {
                      const ac = new AbortController();
                      const timeoutId = setTimeout(() => ac.abort(), 60000); // 60s timeout for streaming
                      
                      const fileRes = await fetch(metaJson.url, {
                        headers: { 'Authorization': `Bearer ${config.accessToken}` },
                        signal: ac.signal
                      });
                      
                      if (fileRes.ok) {
                        const fs = require('fs');
                        const fsp = require('fs/promises');
                        const path = require('path');
                        const mime = require('mime-types');
                        const { pipeline } = require('stream/promises');
                        const { Readable } = require('stream');
                        
                        const safeTenantId = path.basename(String(tenantId));
                        const tenantDir = path.join(__dirname, '../../uploads', safeTenantId);
                        
                        try { await fsp.mkdir(tenantDir, { recursive: true }); }
                        catch (e) { if (e.code !== 'EEXIST') throw e; }
                        
                        const providedName = mediaData.filename || null;
                        const defaultExt = mime.extension(mediaData.mime_type) || 'bin';
                        const ext = providedName ? (path.extname(providedName).slice(1) || defaultExt) : defaultExt;
                        const baseName = providedName ? path.basename(providedName, `.${ext}`) : mediaData.id;
                        const filename = `${baseName}_${Date.now()}.${ext}`;
                        const filepath = path.join(tenantDir, filename);
                        
                        
                        try {
                          await pipeline(Readable.fromWeb(fileRes.body), fs.createWriteStream(filepath), { signal: ac.signal });
                          const expectedSize = fileRes.headers.get('content-length');
                          const fileStat = await fsp.stat(filepath).catch(() => ({ size: 0 }));
                          if (expectedSize && parseInt(expectedSize, 10) !== fileStat.size) {
                            throw new Error(`Downloaded size ${fileStat.size} does not match expected size ${expectedSize}`);
                          }
                        } catch (pipelineErr) {
                          await fsp.unlink(filepath).catch(() => {});
                          throw pipelineErr;
                        } finally {
                          clearTimeout(timeoutId);
                        }
                        
                        const fileStat = await fsp.stat(filepath).catch(() => ({ size: 0 }));
                        
                        const attachment = await prisma.attachment.create({
                          data: {
                            messageId: msgRecord.id,
                            type: mediaData.type,
                            url: `/uploads/${tenantId}/${filename}`,
                            mimeType: mediaData.mime_type,
                            size: fileStat.size,
                            name: providedName
                          }
                        });
                        msgRecord.attachments = [attachment];
                      } else {
                        console.error('Failed to download from Meta API:', fileRes.statusText);
                        throw new Error(`Meta API download failed: ${fileRes.status}`);
                      }
                    }
                  }
                } catch (mediaErr) {
                  console.error('[WHATSAPP_SERVICE] Error downloading media:', mediaErr);
                  throw mediaErr; // Re-throw to fail the webhook and trigger Meta retry
                }
              }
            }
            
            try {
              socket.getIo().of('/chat').to(`conversation:${conversation.id}`).to(`tenant_${tenantId}_coordinators`).emit('new_message', msgRecord);
            } catch (err) {
              console.error('[WHATSAPP_SERVICE] No se pudo emitir por socket:', err.message);
            }

            // --- PUSH NOTIFICATION INTEGRATION ---
            try {
              const updatedConv = await prisma.conversation.findUnique({
                where: { id: conversation.id },
                select: { vendorId: true }
              });
              if (updatedConv && updatedConv.vendorId) {
                const pushService = require('./push.service');
                const pushTitle = `Nuevo mensaje de ${finalClient.name || 'Cliente'}`;
                let pushBody = text || 'Nuevo archivo adjunto';
                if (text && text.length > 256) {
                  const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' });
                  const segments = Array.from(segmenter.segment(text)).map(s => s.segment);
                  pushBody = segments.slice(0, 253).join('') + '...';
                }
                const pushPayload = {
                  notification: { title: pushTitle, body: pushBody },
                  android: { priority: 'high', notification: { channel_id: 'high_priority_chat', tag: conversation.id, sound: 'notification_sound' } },
                  apns: { payload: { aps: { 'thread-id': conversation.id, sound: 'notification_sound.wav' } } },
                  data: { chatId: conversation.id, type: 'new_message' }
                };
                pushService.sendPushToVendor(updatedConv.vendorId, pushPayload).catch(err => {
                  console.error('[PUSH_SERVICE] Error trigger:', err.message);
                });
              }
            } catch (err) {
              console.error('[PUSH_SERVICE] Failed to process push notification:', err.message);
            }
            // ------------------------------------

            // AI Auto-Response Orchestration
            if (conversation.status === 'PENDING_ASSIGNMENT' && !mediaData && text && text.trim() !== '') {
              setImmediate(async () => {
                if (activeAiGenerations.has(conversation.id)) return;
                activeAiGenerations.add(conversation.id);
                try {
                  const lastMsg = await prisma.message.findFirst({
                    where: { conversationId: conversation.id },
                    orderBy: { createdAt: 'desc' }
                  });
                  if (lastMsg && lastMsg.id === msgRecord.id) {
                    const currentConv = await prisma.conversation.findUnique({
                      where: { id: conversation.id },
                      select: { status: true, vendorId: true, aiPendingEscalation: true }
                    });
                    if (currentConv && (currentConv.status !== 'PENDING_ASSIGNMENT' || currentConv.vendorId || currentConv.aiPendingEscalation)) return;

                    const tenant = await prisma.tenant.findUnique({
                      where: { id: tenantId }
                    });
                    

                    const offHours = isOffHours(tenant?.businessHours);


                    let responseText = await aiService.generateAutoResponse(tenantId, conversation.id, text, { isOffHours: offHours });
                    
                    if (!responseText || responseText.trim() === '') return;

                    let requiresEscalation = false;
                    if (/\[\[ESCALATE\]\]/i.test(responseText)) {
                      requiresEscalation = true;
                      responseText = responseText.replace(/\[\[ESCALATE\]\]/gi, '').trim();
                      if (responseText === '') {
                        responseText = 'Entiendo. Un representante se pondrá en contacto contigo en breve para ayudarte.';
                      }
                    }

                    const finalConv = await prisma.conversation.findUnique({
                      where: { id: conversation.id }
                    });
                    
                    if (finalConv && finalConv.status === 'PENDING_ASSIGNMENT') {
                      await this.sendMessage(conversation.id, responseText, null, 'IA');

                      if (requiresEscalation) {
                        const updatedConv = await prisma.conversation.update({
                          where: { id: conversation.id },
                          data: { 
                            aiPendingEscalation: true,
                            status: 'ESCALATED' 
                          }
                        });
                        
                        try {
                          const io = socket.getIo();
                          io.of('/chat')
                            .to(`tenant_${tenantId}_coordinators`)
                            .emit('chat:escalated', { 
                              type: 'ESCALATION_ALERT', 
                              payload: { 
                                conversationId: conversation.id, 
                                tenantId,
                                reason: 'AI handoff requested'
                              }, 
                              timestamp: new Date().toISOString(), 
                              correlationId: crypto.randomUUID() 
                            });
                          
                          io.of('/chat')
                            .to(`conversation:${conversation.id}`)
                            .emit('conversation_escalated', updatedConv);
                        } catch (err) {
                          console.error('[WHATSAPP_SERVICE] Error emitting escalation event:', err.message);
                        }
                      }
                    }
                  }
                } catch (aiErr) {
                  console.error('[WHATSAPP_SERVICE] AI auto-response failed:', aiErr.message);
                } finally {
                  activeAiGenerations.delete(conversation.id);
                }
              });
            }

            } catch (innerErr) {
              console.error('[WHATSAPP_SERVICE] Error processing specific message:', innerErr);
            } finally {
              incomingLocks.delete(lockKey);
              if (releaseLock) releaseLock();
            }
            
            console.log(`[WHATSAPP_SERVICE] Mensaje guardado correctamente de ${clientPhone}`);
          }
        }
      }
      return true;
    } catch (error) {
      console.error(`[WHATSAPP_SERVICE] Error processing incoming message:`, error);
      throw error;
    }
  },

  /**
   * Envía un mensaje al cliente vía Meta Graph API.
   * @param {string} conversationId ID local
   * @param {string} content Texto
   * @param {string} senderId ID del usuario
   */
  async sendMessage(conversationId, content, senderId = null, senderType = 'VENDOR') {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { client: true }
      });
      if (!conversation) throw new Error('Conversación no encontrada');
      if (conversation.client.isBlocked) throw new Error('Client is blocked');
      
      const config = await this.getConfig(conversation.tenantId);
      if (!config || !config.accessToken || !config.phoneNumberId) {
        throw new Error('Configuración de WhatsApp incompleta');
      }

      let cleanPhoneNumber = conversation.client.phoneNumber.replace(/\D/g, '');
      if (cleanPhoneNumber.startsWith('521') && cleanPhoneNumber.length === 13) {
        cleanPhoneNumber = '52' + cleanPhoneNumber.substring(3);
      }
      
      const url = `https://graph.facebook.com/${env.metaApiVersion}/${config.phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhoneNumber,
        type: 'text',
        text: { preview_url: false, body: content }
      };

      console.log('[WHATSAPP_SERVICE] Payload to Meta API (sendMessage):', JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const metaData = await response.json();
      if (!response.ok) {
        throw new Error(`Meta API Error: ${metaData.error?.message || 'Unknown error'}`);
      }
      
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderType: senderType || 'SYSTEM',
          senderId,
          content,
          waMessageId: metaData.messages?.[0]?.id,
          status: 'SENT'
        }
      });
      
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() }
      });

      try {
        socket.getIo().of('/chat').to(`conversation:${conversationId}`).to(`tenant_${conversation.tenantId}_coordinators`).emit('new_message', message);
      } catch (err) {
        console.error('[WHATSAPP_SERVICE] No se pudo emitir por socket:', err.message);
      }

      return message;
    } catch (error) {
      console.error(`[WHATSAPP_SERVICE] Error enviando mensaje a Meta:`, error);
      throw error;
    }
  },

  /**
   * Envía media al cliente vía Meta Graph API, opcionalmente con un texto (caption).
   */
  async sendMedia(conversationId, file, caption = null, senderId = null, senderType = 'VENDOR', originalName = null) {
    const fs = require('fs');
    const fsp = require('fs/promises');
    let fileStream = null;
    try {
      const path = require('path');
      const mime = require('mime-types');
      
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { client: true }
      });
      if (!conversation) throw new Error('Conversación no encontrada');
      if (conversation.client.isBlocked) throw new Error('Client is blocked');
      
      const config = await this.getConfig(conversation.tenantId);
      if (!config || !config.accessToken || !config.phoneNumberId) {
        throw new Error('Configuración de WhatsApp incompleta');
      }

      // 1. Upload media to Meta
      const uploadUrl = `https://graph.facebook.com/${env.metaApiVersion}/${config.phoneNumberId}/media`;
      const formData = new FormData();
      const fileBuffer = await fsp.readFile(file.path);
      
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', new Blob([fileBuffer], { type: file.mimetype }), originalName || file.originalname);
      
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        },
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        console.error('[WHATSAPP_SERVICE] Meta API Upload Error Data:', JSON.stringify(uploadData, null, 2));
        throw new Error(`Meta API Upload Error: ${uploadData.error?.message || 'Unknown error'}`);
      }
      
      const mediaId = uploadData.id;
      
      // 2. Send message with media
      let mediaType = 'document';
      if (['image/jpeg', 'image/png'].includes(file.mimetype)) mediaType = 'image';
      else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
      else if (file.mimetype.startsWith('video/')) mediaType = 'video';

      let cleanPhoneNumber = conversation.client.phoneNumber.replace(/\D/g, '');
      if (cleanPhoneNumber.startsWith('521') && cleanPhoneNumber.length === 13) {
        cleanPhoneNumber = '52' + cleanPhoneNumber.substring(3);
      }
      
      const msgUrl = `https://graph.facebook.com/${env.metaApiVersion}/${config.phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhoneNumber,
        type: mediaType,
        [mediaType]: { id: mediaId }
      };

      if (mediaType === 'document' && (originalName || file.originalname)) {
        payload.document.filename = originalName || file.originalname;
      }
      // Validate and truncate caption length to 1024 characters
      if (caption && caption.trim() !== '') {
        const trimmed = caption.trim();
        payload[mediaType].caption = trimmed.length > 1024 ? trimmed.substring(0, 1021) + '...' : trimmed;
      }

      console.log('[WHATSAPP_SERVICE] Payload to Meta API (sendMedia):', JSON.stringify(payload, null, 2));

      const response = await fetch(msgUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const metaData = await response.json();
      if (!response.ok) throw new Error(`Meta API Message Error: ${metaData.error?.message || 'Unknown error'}`);
      
      // 3. Save locally
      const ext = mime.extension(file.mimetype) || 'bin';
      const filename = `${mediaId}.${ext}`;
      const safeTenantId = path.basename(String(conversation.tenantId));
      const tenantDir = path.join(__dirname, '../../uploads', safeTenantId);
      
      try { await fsp.mkdir(tenantDir, { recursive: true }); }
      catch (e) { if (e.code !== 'EEXIST') throw e; }
      
      const filepath = path.join(tenantDir, filename);
      await fsp.copyFile(file.path, filepath);
      
      // 4. Insert message and attachment transactionally
      const msgRecord = await prisma.message.create({
        data: {
          conversationId,
          senderType: senderId ? senderType : 'SYSTEM',
          senderId,
          content: caption ? `[${mediaType.toUpperCase()} enviado] ${caption.trim()}` : `[${mediaType.toUpperCase()} enviado]`,
          waMessageId: metaData.messages?.[0]?.id,
          status: 'SENT',
          attachments: {
            create: {
              type: mediaType.toUpperCase(),
              url: `/uploads/${conversation.tenantId}/${filename}`,
              mimeType: file.mimetype,
              size: file.size,
              name: originalName || file.originalname
            }
          }
        },
        include: { attachments: true }
      });

      // 5. Update conversation (outside transaction to prevent deadlocks with incoming webhooks)
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() }
      }).catch(err => console.error('Error updating conversation lastMessageAt:', err.message));

      try {
        socket.getIo().of('/chat').to(`conversation:${conversationId}`).to(`tenant_${conversation.tenantId}_coordinators`).emit('new_message', msgRecord);
      } catch (err) {
        console.error('[WHATSAPP_SERVICE] No se pudo emitir por socket:', err.message);
      }

      return msgRecord;
    } catch (error) {
      console.error(`[WHATSAPP_SERVICE] Error enviando media a Meta:`, error.response?.data || error.message);
      throw error;
    } finally {
      if (fileStream) fileStream.destroy();
      // Cleanup temp file safely
      if (file && typeof file.path === 'string') {
        try {
          if (fs.existsSync(file.path)) {
            await fsp.unlink(file.path);
          }
        } catch (err) {
          console.error('Error unlinking temp file:', err.message);
        }
      }
    }
  }
};

module.exports = whatsappService;
