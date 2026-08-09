const express = require('express');
const router = express.Router();
const isSuperadmin = require('../middleware/superadmin.auth.middleware');
const { getMetrics } = require('../controllers/superadmin.metrics.controller');

router.get('/', isSuperadmin, getMetrics);

module.exports = router;
