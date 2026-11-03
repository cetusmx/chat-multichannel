const { Router } = require('express');
const authService = require('../services/auth.service');
const authenticate = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');

const loginAttempts = new Map();

function rateLimitAuth(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 10;

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, []);
  }

  const timestamps = loginAttempts.get(ip).filter((t) => now - t < windowMs);
  timestamps.push(now);
  loginAttempts.set(ip, timestamps);

  if (timestamps.length > maxAttempts) {
    return res.status(429).json({ error: { message: 'Too many attempts. Try again later.', code: 'RATE_LIMITED' } });
  }

  next();
}

const router = Router();

router.post('/login', rateLimitAuth, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }
    const result = await authService.login(email, password);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw ApiError.badRequest('Refresh token is required');
    }
    const result = await authService.refresh(refreshToken);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', rateLimitAuth, async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      throw ApiError.badRequest('El correo electrónico es requerido');
    }
    const origin = req.headers.origin || '';
    const result = await authService.forgotPassword(email, origin);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', rateLimitAuth, async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      throw ApiError.badRequest('El token y la nueva contraseña son requeridos');
    }
    const result = await authService.resetPassword(token, password);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
