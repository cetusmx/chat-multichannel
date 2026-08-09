const prisma = require('../config/database');

const cache = new Map();
let ongoingPromise = null;

const getGlobalMetrics = async () => {
  const cached = cache.get('global_metrics');
  
  if (!cached || cached.expiresAt < Date.now()) {
    if (ongoingPromise) {
      return ongoingPromise;
    }

    ongoingPromise = (async () => {
      try {
        const [tenants, users, tokensResult] = await Promise.all([
          prisma.tenant.count({ where: { status: 'active' } }),
          prisma.user.count({ where: { isActive: true } }),
          prisma.tenant.aggregate({ _sum: { currentMonthAiTokens: true } })
        ]);
        const aiTokens = tokensResult?._sum?.currentMonthAiTokens || 0;
        const data = { tenants, users, aiTokens };
        cache.set('global_metrics', { data, expiresAt: Date.now() + 60000 });
        return data;
      } finally {
        ongoingPromise = null;
      }
    })();

    return ongoingPromise;
  }

  return cached.data;
};

const clearCache = () => {
  cache.clear();
};

module.exports = { getGlobalMetrics, clearCache };
