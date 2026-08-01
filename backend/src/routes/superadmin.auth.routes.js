const { Router } = require('express');
const superadminAuthController = require('../controllers/superadmin.auth.controller');

const router = Router();

router.post('/login', superadminAuthController.rateLimitLogin, superadminAuthController.login);

module.exports = router;
