const cron = require('node-cron');
const prisma = require('../config/database');
const slaService = require('../services/sla.service');
const socket = require('../socket');

let isRunning = false;
let isShuttingDown = false;

// Setup graceful shutdown
process.on('SIGTERM', () => { isShuttingDown = true; });
process.on('SIGINT', () => { isShuttingDown = true; });

async function runSlaCleanup() {
  if (isRunning) return;
  
  try {
    isRunning = true;
    console.log('[SLA-CRON] Starting cleanup execution');
    let totalClosed = 0;
    let totalResumed = 0;
    
    // 1. Bulk Close WAITING_CUSTOMER
    let hasMoreClosed = true;
    while (hasMoreClosed) {
      if (isShuttingDown) break;
      
      const closedIdsResult = await prisma.$queryRaw`
        WITH cte AS (
          SELECT "conversations"."id" 
          FROM "conversations" 
          JOIN "tenants" ON "conversations"."tenant_id" = "tenants"."id" 
          WHERE "conversations"."status" = 'WAITING_CUSTOMER' 
          AND COALESCE("tenants"."is_sla_enabled", true) = true 
          AND "conversations"."status_updated_at" + (COALESCE("tenants"."auto_close_inactive_hours", 48) * INTERVAL '1 hour') < NOW() 
          LIMIT 100 
          FOR UPDATE SKIP LOCKED
        ) 
        UPDATE "conversations" 
        SET "status" = 'CLOSED_INACTIVE', "status_updated_at" = NOW(), "updated_at" = NOW() 
        FROM cte 
        WHERE "conversations"."id" = cte."id" 
        RETURNING "conversations"."id";
      `;
      
      if (closedIdsResult.length === 0) {
        hasMoreClosed = false;
        break;
      }
      
      totalClosed += closedIdsResult.length;
      const ids = closedIdsResult.map(r => r.id);
      
      // Create system messages
      const messagesToCreate = ids.map(id => ({
        conversationId: id,
        senderType: 'SYSTEM',
        content: 'Sistema: Conversación cerrada automáticamente por inactividad',
        status: 'SENT',
        isInternal: true
      }));
      
      try {
        await prisma.message.createMany({ data: messagesToCreate });
        
        // Fetch full objects for WebSockets
        const updatedConversations = await prisma.conversation.findMany({
          where: { id: { in: ids } },
          include: { client: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });
        
        for (const conv of updatedConversations) {
          // Clean up cartData items for auto-closed clients
          if (conv.client && conv.client.cartData) {
            let newCartData = {};
            if (typeof conv.client.cartData === 'object' && !Array.isArray(conv.client.cartData)) {
              newCartData = { ...conv.client.cartData };
              delete newCartData.items;
            } else {
              newCartData = [];
            }
            
            await prisma.$transaction([
              prisma.conversation.update({
                where: { id: conv.id },
                data: { cartSnapshot: conv.client.cartData }
              }),
              prisma.client.update({
                where: { id: conv.clientId },
                data: { cartData: newCartData }
              })
            ]);
            
            // Sync the local object so socket broadcast has the latest state
            conv.cartSnapshot = conv.client.cartData;
            conv.client.cartData = newCartData;
          }

          try {
            socket.getIo().of('/chat').to(`tenant_${conv.tenantId}_coordinators`).emit('conversation_updated', conv);
            if (conv.vendorId) {
               socket.getIo().of('/chat').to(`vendor_${conv.vendorId}`).emit('conversation_updated', conv);
            }
          } catch (e) {
            console.error('[SLA-CRON] WebSocket Error:', e.message);
          }
        }
      } catch (err) {
        console.error('[SLA-CRON] Error finalizing closed conversations, breaking loop', err);
        hasMoreClosed = false;
        break;
      }
    }
    
    // 2. Orphan Rescues (isSlaEnabled=false)
    let hasMoreOrphans = true;
    let failedOrphanIds = [];
    while (hasMoreOrphans) {
      if (isShuttingDown || failedOrphanIds.length > 200) break;
      const batch = await prisma.conversation.findMany({
        where: {
          status: { in: ['WAITING_CUSTOMER', 'ON_HOLD', 'SCHEDULED'] },
          tenant: { isSlaEnabled: false },
          id: { notIn: failedOrphanIds }
        },
        take: 100
      });
      if (batch.length === 0) break;
      
      const results = await Promise.allSettled(batch.map(async (conv) => {
        await slaService.transitionToActive(conv.id);
      }));
      
      results.forEach((res, i) => { 
        if (res.status === 'rejected') failedOrphanIds.push(batch[i].id); 
        else if (res.value) totalResumed++;
      });
    }

    // 3. Null Expiration Zombies (is null)
    let hasMoreZombies = true;
    let failedZombieIds = [];
    while (hasMoreZombies) {
      if (isShuttingDown || failedZombieIds.length > 200) break;
      const batch = await prisma.conversation.findMany({
        where: {
          OR: [
            { status: 'ON_HOLD', onHoldExpiration: null },
            { status: 'SCHEDULED', scheduledAt: null }
          ],
          id: { notIn: failedZombieIds }
        },
        take: 100
      });
      if (batch.length === 0) break;
      
      const results = await Promise.allSettled(batch.map(async (conv) => {
        await slaService.transitionToActive(conv.id);
      }));
      
      results.forEach((res, i) => { 
        if (res.status === 'rejected') failedZombieIds.push(batch[i].id); 
        else if (res.value) totalResumed++;
      });
    }

    // 4. Normal Time Expirations
    let hasMoreExpired = true;
    let failedExpiredIds = [];
    while (hasMoreExpired) {
      if (isShuttingDown || failedExpiredIds.length > 200) break;
      const batch = await prisma.conversation.findMany({
        where: {
          OR: [
            { status: 'ON_HOLD', onHoldExpiration: { not: null, lt: new Date() } },
            { status: 'SCHEDULED', scheduledAt: { not: null, lt: new Date() } }
          ],
          id: { notIn: failedExpiredIds }
        },
        take: 100
      });
      if (batch.length === 0) break;
      
      const results = await Promise.allSettled(batch.map(async (conv) => {
        await slaService.transitionToActive(conv.id);
      }));
      
      results.forEach((res, i) => { 
        if (res.status === 'rejected') failedExpiredIds.push(batch[i].id); 
        else if (res.value) totalResumed++;
      });
    }

    console.log(`[SLA-CRON] Execution complete. Closed: ${totalClosed}, Resumed: ${totalResumed}`);
  } catch (error) {
    console.error('[SLA-CRON] Fatal Error:', error);
  } finally {
    isRunning = false;
  }
}

function startSlaCron() {
  cron.schedule('*/5 * * * *', runSlaCleanup);
  console.log('[SLA-CRON] Worker scheduled: */5 * * * *');
}

async function waitForShutdown() {
  while (isRunning) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

module.exports = { startSlaCron, runSlaCleanup, waitForShutdown };
