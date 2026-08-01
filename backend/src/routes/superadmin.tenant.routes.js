const express = require('express');
const superadminTenantController = require('../controllers/superadmin.tenant.controller');
const superadminAuth = require('../middleware/superadmin.auth.middleware');

const router = express.Router();

router.use(superadminAuth);

router.get('/', superadminTenantController.getTenants);
router.post('/', superadminTenantController.createTenant);
router.get('/:id', superadminTenantController.getTenantById);
router.patch('/:id/status', superadminTenantController.updateTenantStatus);
router.put('/:id/licenses', superadminTenantController.updateTenantLicenses);

module.exports = router;
