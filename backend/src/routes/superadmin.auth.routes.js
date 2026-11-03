const express = require('express');
const superadminAuthController = require('../controllers/superadmin.auth.controller');
const isSuperadmin = require('../middleware/superadmin.auth.middleware');

const router = express.Router();

router.post('/login', superadminAuthController.rateLimitLogin, superadminAuthController.login);
router.post('/forgot-password', superadminAuthController.rateLimitLogin, superadminAuthController.forgotPassword);
router.post('/reset-password', superadminAuthController.rateLimitLogin, superadminAuthController.resetPassword);
router.post('/change-password', isSuperadmin, superadminAuthController.changePassword);
router.get('/email-config', isSuperadmin, superadminAuthController.getEmailConfig);
router.put('/email-config', isSuperadmin, superadminAuthController.updateEmailConfig);

module.exports = router;
