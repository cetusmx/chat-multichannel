const superadminAuthService = require('../services/superadmin.auth.service');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');
const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Contraseña es requerida').max(72, 'Contraseña excede el límite permitido')
});

const loginAttempts = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_MAP_SIZE = 10000;

// Cleanup memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of loginAttempts.entries()) {
    const active = timestamps.filter((t) => now - t < WINDOW_MS);
    if (active.length === 0) {
      loginAttempts.delete(ip);
    } else {
      loginAttempts.set(ip, active);
    }
  }
}, WINDOW_MS * 2).unref();

function rateLimitLogin(req, res, next) {
  let ip = req.ip || (req.connection && req.connection.remoteAddress) || (req.socket && req.socket.remoteAddress) || 'unknown-ip';

  if (ip === 'unknown-ip' || ip === 'unknown') {
    return next();
  }

  const now = Date.now();

  if (!loginAttempts.has(ip)) {
    // Prevent unbounded memory growth DoS
    if (loginAttempts.size >= MAX_MAP_SIZE) {
      loginAttempts.delete(loginAttempts.keys().next().value);
    }
    loginAttempts.set(ip, []);
  }

  const timestamps = loginAttempts.get(ip).filter((t) => now - t < WINDOW_MS);
  
  if (timestamps.length >= MAX_ATTEMPTS) {
    return next(ApiError.rateLimited('Demasiados intentos. Intente más tarde.'));
  }
  
  timestamps.push(now);
  loginAttempts.set(ip, timestamps);

  next();
}

async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.errors
      });
    }
    const { email, password } = parsed.data;

    const normalizedEmail = email.toLowerCase();
    const result = await superadminAuthService.login(normalizedEmail, password);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  rateLimitLogin,
  login,
};
