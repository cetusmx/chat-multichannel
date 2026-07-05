const { Router } = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const branchService = require('../services/branch.service');
const { success, created, noContent, list } = require('../utils/response');

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'COORDINATOR'), async (req, res, next) => {
  try {
    const branches = await branchService.listBranches(req.user.tenantId);
    list(res, branches);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('ADMIN'), async (req, res, next) => {
  try {
    const branch = await branchService.createBranch(req.user.tenantId, req.body);
    created(res, branch);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const branch = await branchService.updateBranch(req.params.id, req.user.tenantId, req.body);
    success(res, branch);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    await branchService.deleteBranch(req.params.id, req.user.tenantId);
    noContent(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
