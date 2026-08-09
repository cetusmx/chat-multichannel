const prisma = require('../config/database');
const { addMonths, differenceInMonths } = require('date-fns');
const logger = require('../utils/logger');

const cache = new Map();
const TTL_MS = 5 * 60 * 1000;
const pendingFetches = new Map();

class QuotaService {
  /**
   * Performs the pre-flight check for AI usage.
   * Returns true if quota is exceeded and should be blocked.
   * Returns false if allowed.
   */
  async checkAiQuotaExceeded(tenantId) {
    const cacheKey = `ai_quota_exceeded_${tenantId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      if (cached.exceeded === true) return true;
    }

    if (pendingFetches.has(cacheKey)) {
      return pendingFetches.get(cacheKey);
    }

    const fetchPromise = this._checkAiQuotaDb(tenantId, cacheKey);
    pendingFetches.set(cacheKey, fetchPromise);
    
    return fetchPromise.finally(() => {
      pendingFetches.delete(cacheKey);
    });
  }

  async _checkAiQuotaDb(tenantId, cacheKey) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          maxAiTokens: true,
          currentMonthAiTokens: true,
          lastTokenResetDate: true,
          licenseType: true
        }
      });

      if (!tenant) return false;
      if (tenant.licenseType === 'LIFETIME' || tenant.maxAiTokens === -1) return false;
      if (tenant.maxAiTokens === 0) return true;

      const now = new Date();
      let currentTokens = tenant.currentMonthAiTokens;
      let resetDate = tenant.lastTokenResetDate;
      
      const elapsedMonths = differenceInMonths(now, resetDate);
      
      if (elapsedMonths >= 1) {
        const newCycleDate = addMonths(resetDate, elapsedMonths);
        
        const updateResult = await prisma.tenant.updateMany({
          where: {
            id: tenantId,
            lastTokenResetDate: { lt: newCycleDate }
          },
          data: {
            currentMonthAiTokens: 0,
            lastTokenResetDate: newCycleDate
          }
        });

        if (updateResult.count > 0 || now >= newCycleDate) {
          currentTokens = 0;
        }
      }

      const exceeded = currentTokens >= tenant.maxAiTokens;

      if (exceeded) {
        cache.set(cacheKey, {
          exceeded: true,
          expiresAt: Date.now() + TTL_MS
        });
      }

      return exceeded;
    } catch (error) {
      logger.error('Error in quota pre-flight check', { error, tenantId });
      return false; // Fail open
    }
  }
}

module.exports = new QuotaService();
