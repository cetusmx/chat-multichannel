const prisma = require('../config/database');

const tenantStatusCache = new Map();
const TTL_MS = 60 * 1000; // 60 seconds

// Promise deduplication map to prevent thundering herd
const pendingFetches = new Map();

function getTenantStatus(tenantId) {
  const cached = tenantStatusCache.get(tenantId);
  if (!cached) return undefined;
  
  if (Date.now() > cached.expiresAt) {
    tenantStatusCache.delete(tenantId);
    return undefined;
  }
  
  return cached.status;
}

function setTenantStatus(tenantId, status) {
  tenantStatusCache.set(tenantId, {
    status,
    expiresAt: Date.now() + TTL_MS
  });
}

function invalidateTenantCache(tenantId) {
  tenantStatusCache.delete(tenantId);
}

/**
 * Gets tenant status from cache, or safely fetches it from the DB using promise deduplication
 */
async function getTenantStatusAsync(tenantId) {
  let status = getTenantStatus(tenantId);
  if (status) return status;

  if (!pendingFetches.has(tenantId)) {
    const dbPromise = prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tenant status fetch timeout')), 5000);
    });

    const fetchPromise = Promise.race([dbPromise, timeoutPromise])
      .then(tenant => {
        const fetchedStatus = tenant ? tenant.status : null;
        if (fetchedStatus) {
          setTenantStatus(tenantId, fetchedStatus);
        }
        pendingFetches.delete(tenantId);
        return fetchedStatus;
      })
      .catch(err => {
        pendingFetches.delete(tenantId);
        throw err;
      });
    
    pendingFetches.set(tenantId, fetchPromise);
  }
  return pendingFetches.get(tenantId);
}

module.exports = {
  getTenantStatus,
  setTenantStatus,
  invalidateTenantCache,
  getTenantStatusAsync
};
