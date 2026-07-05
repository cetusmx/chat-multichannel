const { Router } = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const tenantService = require('../services/tenant.service');
const { success } = require('../utils/response');

const router = Router();

router.use(authenticate);

router.get('/profile', async (req, res, next) => {
  try {
    const profile = await tenantService.getProfile(req.user.tenantId);
    success(res, profile);
  } catch (err) {
    next(err);
  }
});

router.put('/profile', authorize('ADMIN'), async (req, res, next) => {
  try {
    const profile = await tenantService.updateProfile(req.user.tenantId, req.body);
    success(res, profile);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
