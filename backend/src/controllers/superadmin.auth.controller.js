const superadminAuthService = require('../services/superadmin.auth.service');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');

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
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || (req.socket && req.socket.remoteAddress) || 'unknown';
  
  if (ip === 'unknown') {
    return next(); // Bypass rate limiting for unresolvable IPs to prevent collateral blocking
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
    const { email, password } = req.body || {};
    
    // Validate types to prevent 500s or NoSQL injections
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw ApiError.badRequest('Email y contraseña son requeridos y deben ser texto');
    }
    
    // Enforce max password length for bcrypt safety
    if (password.length > 72) {
      throw ApiError.badRequest('Contraseña excede el límite permitido');
    }
    
    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw ApiError.badRequest('Formato de email inválido');
    }

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
