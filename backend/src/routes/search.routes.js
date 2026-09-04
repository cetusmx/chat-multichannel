const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const authenticate = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting middleware: max 20 requests per minute
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many search requests, please try again later.' }
});

router.get('/', authenticate, searchLimiter, searchController.globalSearch);

module.exports = router;
