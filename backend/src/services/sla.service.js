const EventEmitter = require('events');
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

class SlaService extends EventEmitter {
  constructor() {
    super();
    this.configCache = new Map();
    this.notifiedBreaches = new Map();
    this.monitorTimeout = null;
    this.isChecking = false;
    this.isStopping = false;
  }

  /**
   * Retrieves the SLA configuration for a given tenant.
   * If it doesn't exist, returns default values.
   */
  async getSlaConfig(tenantId) {
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'VALIDATION_ERROR');

    if (this.configCache.has(tenantId)) {
      return this.configCache.get(tenantId);
    }

    const config = await prisma.slaConfig.findUnique({
      where: { tenantId }
    });

    const finalConfig = config || {
      tenantId,
      firstResponseMins: 15,
      resolutionMins: 60
    };

    while (this.configCache.size > 1000) {
      this.configCache.delete(this.configCache.keys().next().value);
    }
    
    this.configCache.set(tenantId, finalConfig);
    return finalConfig;
  }

  /**
   * Updates or creates the SLA configuration for a given tenant.
   */
  async updateSlaConfig(tenantId, data) {
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'VALIDATION_ERROR');

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new ApiError(400, 'Payload is empty or invalid', 'VALIDATION_ERROR');
    }

    const { firstResponseMins, resolutionMins } = data;

    if (firstResponseMins !== undefined && (!Number.isInteger(firstResponseMins) || firstResponseMins <= 0 || firstResponseMins > 10080)) {
      throw new ApiError(400, 'firstResponseMins must be an integer between 1 and 10080', 'VALIDATION_ERROR');
    }

    if (resolutionMins !== undefined && (!Number.isInteger(resolutionMins) || resolutionMins <= 0 || resolutionMins > 10080)) {
      throw new ApiError(400, 'resolutionMins must be an integer between 1 and 10080', 'VALIDATION_ERROR');
    }

    if (firstResponseMins !== undefined && resolutionMins !== undefined) {
      if (firstResponseMins > resolutionMins) {
        throw new ApiError(400, 'firstResponseMins cannot be greater than resolutionMins', 'VALIDATION_ERROR');
      }
    }

    const config = await prisma.slaConfig.upsert({
      where: { tenantId },
      update: {
        ...(firstResponseMins !== undefined && { firstResponseMins }),
        ...(resolutionMins !== undefined && { resolutionMins })
      },
      create: {
        tenantId,
        firstResponseMins: firstResponseMins || 15,
        resolutionMins: resolutionMins || 60
      }
    });

    this.configCache.set(tenantId, config);
    return config;
  }

  startMonitor(intervalMs = 60000) {
    this.isStopping = false;
    if (this.monitorTimeout || this.isChecking) return;
    
    const loop = async () => {
      if (this.isStopping) return;
      if (this.isChecking) {
        this.monitorTimeout = setTimeout(loop, intervalMs);
        return;
      }
      this.isChecking = true;
      try {
        await Promise.race([
          this.checkSlaBreaches(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SLA check timed out')), 30000))
        ]);
      } catch (error) {
        console.error('[SLA Monitor] Error checking SLA breaches:', error);
      } finally {
        this.isChecking = false;
        if (!this.isStopping) {
          this.monitorTimeout = setTimeout(loop, intervalMs);
        }
      }
    };
    
    this.monitorTimeout = setTimeout(loop, intervalMs);
  }

  stopMonitor() {
    this.isStopping = true;
    if (this.monitorTimeout) {
      clearTimeout(this.monitorTimeout);
      this.monitorTimeout = null;
    }
  }

  async checkSlaBreaches() {
    let cursor = null;
    let hasMore = true;
    const now = Date.now();
    
    // Evict oldest entries one by one to strictly maintain memory bound
    while (this.notifiedBreaches.size > 20000) {
      this.notifiedBreaches.delete(this.notifiedBreaches.keys().next().value);
    }

    while (hasMore) {
      const conversations = await prisma.conversation.findMany({
        where: {
          status: {
            in: ['PENDING_ASSIGNMENT', 'ACTIVE']
          },
          ...(cursor ? { id: { gt: cursor } } : {})
        },
        take: 500,
        orderBy: { id: 'asc' }
      });

      if (!conversations || conversations.length === 0) break;
      
      cursor = conversations[conversations.length - 1].id;
      if (conversations.length < 500) hasMore = false;

      // Batch pre-fetch SLA configs to avoid N+1
      const tenantIds = [...new Set(conversations.map(c => c.tenantId))];
      const configs = {};
      await Promise.all(tenantIds.map(tId => 
        this.getSlaConfig(tId)
          .then(cfg => { configs[tId] = cfg; })
          .catch(e => console.error(`Error fetching SLA config for tenant ${tId}:`, e))
      ));

      for (const conv of conversations) {
        try {
          const config = configs[conv.tenantId];
          if (!config) continue;
          
          let metric = null;
          let thresholdMins = 0;
          let startTime = null;

          if (conv.status === 'PENDING_ASSIGNMENT') {
            metric = 'firstResponse';
            thresholdMins = config.firstResponseMins;
            startTime = conv.lastMessageAt || conv.createdAt;
          } else if (conv.status === 'ACTIVE') {
            metric = 'resolution';
            thresholdMins = config.resolutionMins;
            startTime = conv.createdAt;
          }

          if (metric && startTime) {
            const startTimeMs = startTime instanceof Date ? startTime.getTime() : new Date(startTime).getTime();
            const elapsedMins = (now - startTimeMs) / (1000 * 60);
            if (elapsedMins > thresholdMins) {
              const excessMinutes = Math.round(elapsedMins - thresholdMins);
              const notifKey = `${conv.id}:${metric}:${startTimeMs}`;
              
              if (!this.notifiedBreaches.has(notifKey)) {
                this.notifiedBreaches.set(notifKey, now);
                this.emit('alerts:breach', {
                  type: 'SLA_BREACH',
                  tenantId: conv.tenantId,
                  payload: {
                    conversationId: conv.id,
                    metric,
                    excessMinutes
                  },
                  timestamp: new Date().toISOString(),
                  correlationId: `sla-${conv.id}-${Date.now()}`
                });
              }
            }
          }
        } catch (innerError) {
          console.error(`Error processing conversation ${conv.id} for SLA:`, innerError);
        }
      }
    }
  }
}

module.exports = new SlaService();
