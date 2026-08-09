const { getGlobalMetrics } = require('../services/superadmin.metrics.service');
const { success } = require('../utils/response');

const getMetrics = async (req, res, next) => {
  try {
    const { tenants, users, aiTokens } = await getGlobalMetrics();
    return success(res, { tenants, users, aiTokens });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMetrics };
