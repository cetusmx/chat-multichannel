const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');
const socket = require('../socket');
const { isOffHours, getBusinessMinutesElapsed } = require('../utils/date');
const crypto = require('crypto');
const logger = require('../utils/logger');
const aiService = require('./ai.service');
const assignmentService = require('./assignment.service');
const prisma = new PrismaClient();

const incomingLocks = new Map();
const activeAiGenerations = new Set();
const { getTenantStatusAsync } = require('../utils/tenant-cache.util');
const ApiError = require('../utils/ApiError');

async function isTenantSuspended(tenantId) {
  try {
    const status = await getTenantStatusAsync(tenantId);
    // If status is null (tenant not found), treat as suspended/invalid
    return !status || status === 'suspended';
  } catch (err) {
    logger.error(`[WHATSAPP_SERVICE] Error checking tenant status for ${tenantId}:`, err);
    // Fail safe to suspended if we can't query the database
    return true;
  }
}

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
          logger.error(`[WHATSAPP_SERVICE] Error decrypting token for tenant ${tenantId}`, e);
        }
      }
      return config;
    } catch (error) {
      logger.error(`[WHATSAPP_SERVICE] Error fetching config for tenant ${tenantId}:`, error);
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
      logger.error(`[WHATSAPP_SERVICE] Error updating config for tenant ${tenantId}:`, error);
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
    if (!tenantId) {
      const error = new Error('tenantId is required');
      error.status = 400;
      throw error;
    }
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
      if (!tenantId) {
        logger.error('[WHATSAPP_SERVICE] Incoming message payload missing tenantId.');
        return false;
      }
      if (await isTenantSuspended(tenantId)) {
        logger.info(`[WHATSAPP_SERVICE] Tenant ${tenantId} is suspended, discarding incoming webhook early.`);
        return false;
      }

      logger.info(`[WHATSAPP_SERVICE] Webhook received for tenant: ${tenantId}`);
      
      if (payload.object !== 'whatsapp_business_account') return false;
      
      const entries = payload.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          
          // Process delivery statuses (capturing asynchronous failures from Meta, e.g. 24h window or unsupported codecs)
          if (value && value.statuses && value.statuses.length > 0) {
            for (const st of value.statuses) {
              if (st.status === 'failed' && st.id) {
                logger.error(`[WHATSAPP_SERVICE] Delivery failure status from Meta for waMessageId ${st.id}:`, JSON.stringify(st));
                try {
                  const errObj = st.errors && st.errors[0];
                  const errCode = errObj ? errObj.code : 'Desconocido';
                  const errTitle = errObj ? (errObj.title || errObj.message || '') : '';
                  const errDetails = errObj && errObj.error_data ? errObj.error_data.details : '';
                  const fullErrText = `[Error de entrega de Meta (Code: ${errCode}): ${errTitle} ${errDetails}]`.trim();

                  const msgRecord = await prisma.message.findFirst({
                    where: { waMessageId: st.id },
                    include: { attachments: true, conversation: true }
                  });

                  if (msgRecord && !msgRecord.content.includes('Error de entrega de Meta')) {
                    const updatedMsg = await prisma.message.update({
                      where: { id: msgRecord.id },
                      data: {
                        status: 'FAILED',
                        content: `${msgRecord.content}\n\n⚠️ ${fullErrText}`
                      },
                      include: { attachments: true }
                    });
                    
                    try {
                      const socket = require('../socket');
                      socket.getIo().of('/chat').to(`conversation:${msgRecord.conversationId}`).to(`tenant_${msgRecord.conversation.tenantId}_coordinators`).emit('message_updated', updatedMsg);
                    } catch (socErr) {
                      logger.error('[WHATSAPP_SERVICE] Error emitting message_updated socket:', socErr.message);
                    }
                  }
                } catch (e) {
                  logger.error('[WHATSAPP_SERVICE] Error processing status update:', e.message);
                }
              }
            }
          }

          if (value && value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            const contact = value.contacts && value.contacts[0];
            const metadata = value.metadata || {};
            
            const clientPhone = message.from;
            const clientName = contact?.profile?.name || null;
            const waMessageId = message.id;

            // BSP Echo check: ignore messages sent from the business's own number
            if (metadata.display_phone_number && clientPhone === metadata.display_phone_number.replace(/\D/g, '')) {
               logger.info(`[WHATSAPP_SERVICE] Ignoring echo message from business number ${clientPhone}`);
               continue;
            }

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
              } else {
                logger.warn('[WHATSAPP_SERVICE] Webhook received media but no media ID found in payload:', JSON.stringify(message));
              }
            }

            // --- Handle Replies (context) ---
            if (message.context && message.context.id) {
              const repliedWaId = message.context.id;
              try {
                const repliedMsg = await prisma.message.findUnique({
                  where: { waMessageId: repliedWaId }
                });
                let snippet = 'Archivo multimedia o mensaje anterior';
                if (repliedMsg && repliedMsg.content) {
                  snippet = repliedMsg.content.substring(0, 60).replace(/\n/g, ' ');
                  if (repliedMsg.content.length > 60) snippet += '...';
                }
                // Prepend quote to the incoming text
                text = `> [Respuesta a]: "${snippet}"\n\n${text}`;
              } catch (ctxErr) {
                logger.error('[WHATSAPP_SERVICE] Error fetching context message:', ctxErr.message);
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
                logger.info(`[WHATSAPP_SERVICE] Client ${clientPhone} is blocked. Ignoring message.`);
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
            
            // 2. Encontrar Conversación Abierta o PENDIENTE o PAUSADA
            let conversation = await prisma.conversation.findFirst({
              where: { 
                tenantId, 
                clientId: finalClient.id, 
                status: { in: ['ACTIVE', 'PENDING_ASSIGNMENT', 'ESCALATED', 'WAITING_CUSTOMER', 'SCHEDULED', 'ON_HOLD'] } 
              },
              include: { tenant: { select: { businessHours: true } } }
            });
            
            if (!conversation) {
              conversation = await prisma.conversation.create({
                data: { tenantId, clientId: finalClient.id, status: 'PENDING_ASSIGNMENT', isOutbound: false }
              });
            }

              // Auto-resume atomic update for paused SLA states
              if (['WAITING_CUSTOMER', 'SCHEDULED', 'ON_HOLD'].includes(conversation.status)) {
                const now = new Date();
                let pausedBusinessMins = 0;
                
                try {
                  const statusUpdatedTime = new Date(conversation.statusUpdatedAt).getTime();
                  if (conversation.tenant && conversation.tenant.businessHours) {
                    pausedBusinessMins = getBusinessMinutesElapsed(statusUpdatedTime, now, conversation.tenant.businessHours);
                  } else {
                    pausedBusinessMins = Math.floor((now.getTime() - statusUpdatedTime) / 60000);
                  }
                } catch (e) {
                  logger.error('[WHATSAPP_SERVICE] Error calculating paused SLA minutes:', e);
                }

                await prisma.conversation.update({
                  where: { id: conversation.id },
                  data: {
                    status: 'ACTIVE',
                    statusUpdatedAt: now,
                    lastMessageAt: now,
                    slaPausedMins: { increment: Math.max(0, pausedBusinessMins) },
                    unreadCount: { increment: 1 }
                  }
                });

                // Fetch updated conversation to have correct status for sockets
                conversation = await prisma.conversation.findUnique({ where: { id: conversation.id } });
                try {
                  // Subtask 2.3 Webhook WebSocket Ordering: Emit 'conversation_updated'
                  const socket = require('../socket');
                  let ioEvent = socket.getIo().of('/chat').to(`conversation:${conversation.id}`).to(`tenant_${tenantId}_coordinators`);
                  if (conversation.vendorId) ioEvent = ioEvent.to(`vendor_${conversation.vendorId}`);
                  ioEvent.emit('conversation_updated', conversation);
                } catch (err) {
                  logger.error('[WHATSAPP_SERVICE] No se pudo emitir conversation_updated por socket:', err.message);
                }
              } else {
                 // Si no estaba pausada, solo actualizamos lastMessageAt y unreadCount
                 await prisma.conversation.update({
                   where: { id: conversation.id },
                   data: { 
                     lastMessageAt: new Date(),
                     unreadCount: { increment: 1 }
                   }
                 });
               }
            
            // Re-fetch conversation in case autoAssign changed vendorId or status
            conversation = await prisma.conversation.findUnique({
              where: { id: conversation.id }
            });

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
                  const metaResUrl = `https://graph.facebook.com/${env.metaApiVersion}/${mediaData.id}`;
                  const metaRes = await fetch(metaResUrl, {
                    headers: { 'Authorization': `Bearer ${config.accessToken.trim()}` }
                  });
                  if (metaRes.ok) {
                    const metaJson = await metaRes.json();
                    if (metaJson.url) {
                      const axios = require('axios');
                      let fileRes;
                      try {
                        fileRes = await axios({
                          url: metaJson.url,
                          method: 'GET',
                          responseType: 'stream',
                          headers: { 
                            'Authorization': `Bearer ${config.accessToken.trim()}`,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                          },
                          timeout: 60000
                        });
                      } catch (downloadErr) {
                         logger.error('Failed to download from Meta API:', downloadErr.message);
                         throw new Error(`Meta API download failed: ${downloadErr.message}`);
                      }
                      
                      if (fileRes && fileRes.status === 200) {
                        const fs = require('fs');
                        const fsp = require('fs/promises');
                        const path = require('path');
                        const mime = require('mime-types');
                        const { pipeline } = require('stream/promises');
                        
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
                          await pipeline(fileRes.data, fs.createWriteStream(filepath));
                          const expectedSize = fileRes.headers['content-length'];
                          const fileStat = await fsp.stat(filepath).catch(() => ({ size: 0 }));
                          if (expectedSize && parseInt(expectedSize, 10) !== fileStat.size) {
                            throw new Error(`Downloaded size ${fileStat.size} does not match expected size ${expectedSize}`);
                          }
                          if (fileStat.size === 0) {
                            throw new Error('Downloaded file is 0 bytes');
                          }
                        } catch (pipelineErr) {
                          await fsp.unlink(filepath).catch(() => {});
                          throw pipelineErr;
                        }
                        
                        const fileStat = await fsp.stat(filepath).catch(() => ({ size: 0 }));
                        
                        const attachment = await prisma.attachment.create({
                          data: {
                            messageId: msgRecord.id,
                            type: mediaData.type,
                            url: `/uploads/${tenantId}/${filename}`,
                            mimeType: mediaData.mime_type,
                            size: fileStat.size,
                            name: providedName || filename
                          }
                        });
                        msgRecord.attachments = [attachment];
                      } else {
                        logger.error('Failed to download from Meta API:', fileRes ? fileRes.statusText : 'Unknown');
                        throw new Error(`Meta API download failed: ${fileRes ? fileRes.status : 'Unknown'}`);
                      }
                    } else {
                      logger.error('Meta API returned JSON without url:', metaJson);
                      throw new Error('Meta API returned JSON without url');
                    }
                  } else {
                    const errText = await metaRes.text();
                    logger.error(`Meta API error getting media URL. Status: ${metaRes.status}, Body: ${errText}`);
                    throw new Error(`Meta API error getting media URL: ${metaRes.status}. Body: ${errText}`);
                  }
                } catch (mediaErr) {
                  logger.error('[WHATSAPP_SERVICE] Error downloading media:', mediaErr);
                  // Inject error into the message content so the user can see it in the UI
                  const errorMsg = `\n[Error de descarga: ${mediaErr.message}]`;
                  msgRecord = await prisma.message.update({
                    where: { id: msgRecord.id },
                    data: { content: msgRecord.content + errorMsg },
                    include: { attachments: true }
                  });
                }
              } else {
                logger.error('[WHATSAPP_SERVICE] No config or accessToken found for tenant:', tenantId);
                const errorMsg = `\n[Error de descarga: Configuración o token faltante]`;
                msgRecord = await prisma.message.update({
                  where: { id: msgRecord.id },
                  data: { content: msgRecord.content + errorMsg },
                  include: { attachments: true }
                });
              }
            }
            
            try {
              let ioEvent = socket.getIo().of('/chat').to(`conversation:${conversation.id}`).to(`tenant_${tenantId}_coordinators`);
              if (conversation.vendorId) ioEvent = ioEvent.to(`vendor_${conversation.vendorId}`);
              ioEvent.emit('new_message', msgRecord);
            } catch (err) {
              logger.error('[WHATSAPP_SERVICE] No se pudo emitir por socket:', err.message);
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
                  android: { priority: 'high', notification: { channel_id: 'salesflow_urgent_v1', tag: conversation.id, sound: 'default' } },
                  apns: { payload: { aps: { 'thread-id': conversation.id, sound: 'default' } } },
                  data: { 
                    chatId: conversation.id, 
                    type: 'new_message',
                    notifee_title: pushTitle,
                    notifee_body: pushBody
                  }
                };
                pushService.sendPushToVendor(updatedConv.vendorId, pushPayload).catch(err => {
                  logger.error('[PUSH_SERVICE] Error trigger:', err.message);
                });
              }
            } catch (err) {
              logger.error('[PUSH_SERVICE] Failed to process push notification:', err.message);
            }
            // ------------------------------------

            // AI Auto-Response Orchestration
            if (conversation.status === 'PENDING_ASSIGNMENT' && text && text.trim() !== '') {
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

                    // Revisa si la IA está activa
                    const aiConfig = await prisma.aiConfig.findUnique({ where: { tenantId } });
                    const isAiActive = aiConfig ? aiConfig.isActive : true;

                    // Pre-flight check para cuota de IA
                    const quotaService = require('./quota.service');
                    const isQuotaExceeded = await quotaService.checkAiQuotaExceeded(tenantId);

                    if (!isAiActive || isQuotaExceeded) {
                      if (isQuotaExceeded) {
                        logger.warn(`[WHATSAPP_SERVICE] QUOTA_EXCEEDED for tenant ${tenantId}. Bypassing AI.`);
                      }

                      const fallbackResult = await assignmentService.fallbackToHuman(tenantId, conversation.id);

                      try {
                        const io = socket.getIo();
                        io.of('/chat')
                          .to(`tenant_${tenantId}_coordinators`)
                          .emit('chat:escalated', { 
                            type: 'ESCALATION_ALERT', 
                            conversationId: conversation.id, 
                            message: isQuotaExceeded ? 'Nueva conversación requiere atención (Cuota IA excedida).' : 'Nueva conversación requiere atención (IA inactiva).' 
                          });
                        io.of('/chat')
                          .to(`tenant_${tenantId}_vendors`)
                          .emit('conversation_escalated', fallbackResult.conversation);
                      } catch (e) {
                        logger.error('Socket notification error on silent escalation:', e);
                      }

                      if (!fallbackResult.vendor) {
                        try {
                          await this.sendMessage(conversation.id, 'Nuestro asistente virtual no está disponible en este momento. Un humano te atenderá a la brevedad.', null, 'SYSTEM');
                        } catch (msgErr) {
                          logger.error('Error sending fallback message:', msgErr);
                        }
                      }
                      return;
                    }

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
                        const vendor = await assignmentService.autoAssign(tenantId, conversation.id);
                        let updatedConv;

                        if (!vendor) {
                          updatedConv = await prisma.conversation.update({
                            where: { id: conversation.id },
                            data: { 
                              aiPendingEscalation: true,
                              status: 'ESCALATED' 
                            }
                          });
                        } else {
                          updatedConv = await prisma.conversation.findUnique({
                            where: { id: conversation.id }
                          });
                        }
                        
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
                          logger.error('[WHATSAPP_SERVICE] Error emitting escalation event:', err.message);
                        }
                      }
                    }
                  }
                } catch (aiErr) {
                  logger.error('[WHATSAPP_SERVICE] AI auto-response failed:', aiErr.message);
                } finally {
                  activeAiGenerations.delete(conversation.id);
                }
              });
            }

            } catch (innerErr) {
              logger.error('[WHATSAPP_SERVICE] Error processing specific message:', innerErr);
              console.error('PRISMA_ERROR:', innerErr.message);
            } finally {
              incomingLocks.delete(lockKey);
              if (releaseLock) releaseLock();
            }
            
            logger.info(`[WHATSAPP_SERVICE] Mensaje guardado correctamente de ${clientPhone}`);
          }
        }
      }
      return true;
    } catch (error) {
      logger.error(`[WHATSAPP_SERVICE] Error processing incoming message:`, error);
      throw error;
    }
  },
  /**
   * Envía un mensaje al cliente vía Meta Graph API.
   * @param {string} conversationId ID local
   * @param {string} content Texto
   * @param {string} senderId ID del usuario
   */
  async sendMessage(conversationId, content, senderId = null, senderType = 'VENDOR', type = 'TEXT', metadata = null) {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { client: true }
      });
      if (!conversation) throw new Error('Conversación no encontrada');
      if (conversation.client.isBlocked) throw new Error('Client is blocked');
      
      if (await isTenantSuspended(conversation.tenantId)) {
        throw new ApiError(403, 'Tenant is suspended. Cannot send messages.', 'TENANT_SUSPENDED');
      }
      
      const config = await this.getConfig(conversation.tenantId);
      if (!config || !config.accessToken || !config.phoneNumberId) {
        throw new Error('Configuración de WhatsApp incompleta');
      }

      // Build WhatsApp Payload dynamically
      let textToSend = content;
      let payload = null;
      
      let cleanPhoneNumber = conversation.client.phoneNumber.replace(/\D/g, '');
      if (cleanPhoneNumber.startsWith('521') && cleanPhoneNumber.length === 13) {
        cleanPhoneNumber = '52' + cleanPhoneNumber.substring(3);
      }

      if (type === 'PRODUCT_CARD' && metadata) {
        const priceNet = metadata.priceNet || '0.00';
        textToSend = `Tengo esta opción:\n*${metadata.clave}* - ${metadata.description}\nPrecio: ${priceNet} Neto (IVA Inc.)`;
        
        try {
          const headRes = await fetch(metadata.imageUrl, { method: 'HEAD' });
          const contentType = headRes.headers.get('content-type') || '';
          if (headRes.ok && contentType.startsWith('image/')) {
            payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhoneNumber,
              type: 'image',
              image: { link: metadata.imageUrl, caption: textToSend }
            };
          }
        } catch (e) {
          console.error('[WHATSAPP_SERVICE] Failed to verify image URL', e.message);
        }

        if (!payload) {
          textToSend += `\n\nVer imagen: ${metadata.imageUrl}`;
        }
      }

      if (!payload) {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhoneNumber,
          type: 'text',
          text: { preview_url: true, body: textToSend }
        };
      }

      logger.info('[WHATSAPP_SERVICE] Payload to Meta API (sendMessage):', JSON.stringify(payload, null, 2));

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
          content: textToSend,
          type,
          metadata: metadata ? metadata : undefined,
          waMessageId: metaData.messages?.[0]?.id,
          status: 'SENT'
        }
      });
      
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() }
      });

      try {
        let ioEvent = socket.getIo().of('/chat').to(`conversation:${conversationId}`).to(`tenant_${conversation.tenantId}_coordinators`);
        if (conversation.vendorId) ioEvent = ioEvent.to(`vendor_${conversation.vendorId}`);
        ioEvent.emit('new_message', message);
      } catch (err) {
        logger.error('[WHATSAPP_SERVICE] No se pudo emitir por socket:', err.message);
      }

      return message;
    } catch (error) {
      logger.error(`[WHATSAPP_SERVICE] Error enviando mensaje a Meta:`, error);
      throw error;
    }
  },

  /**
   * Envía media al cliente vía Meta Graph API, opcionalmente con un texto (caption).
   */
  async sendMedia(conversationId, file, caption = null, senderId = null, senderType = 'VENDOR', originalName = null, cleanup = true) {
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
      
      if (await isTenantSuspended(conversation.tenantId)) {
        throw new ApiError(403, 'Tenant is suspended. Cannot send messages.', 'TENANT_SUSPENDED');
      }
      
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
        logger.error('[WHATSAPP_SERVICE] Meta API Upload Error Data:', JSON.stringify(uploadData, null, 2));
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

      logger.info('[WHATSAPP_SERVICE] Payload to Meta API (sendMedia):', JSON.stringify(payload, null, 2));

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

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() }
      }).catch(err => logger.error('Error updating conversation lastMessageAt:', err.message));

      try {
        let ioEvent = socket.getIo().of('/chat').to(`conversation:${conversationId}`).to(`tenant_${conversation.tenantId}_coordinators`);
        if (conversation.vendorId) ioEvent = ioEvent.to(`vendor_${conversation.vendorId}`);
        ioEvent.emit('new_message', msgRecord);
      } catch (err) {
        logger.error('[WHATSAPP_SERVICE] No se pudo emitir por socket:', err.message);
      }

      return msgRecord;
    } catch (error) {
      logger.error(`[WHATSAPP_SERVICE] Error enviando media a Meta:`, error.response?.data || error.message);
      throw error;
    } finally {
      if (fileStream) fileStream.destroy();
      // Cleanup temp file safely
      if (cleanup && file && typeof file.path === 'string') {
        try {
          if (fs.existsSync(file.path)) {
            await fsp.unlink(file.path);
          }
        } catch (err) {
          logger.error('Error unlinking temp file:', err.message);
        }
      }
    }
  }
};

module.exports = whatsappService;
