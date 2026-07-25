const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function generateTokens(payload) {
  let expiresIn = env.jwtExpiresIn;
  let refreshExpiresIn = env.jwtRefreshExpiresIn;
  
  if (payload.role === 'VENDOR' || payload.role === 'COORDINATOR') {
    expiresIn = '14d'; // Extended session duration
    refreshExpiresIn = '30d'; // Extended refresh duration
  }

  const token = jwt.sign(payload, env.jwtSecret, { expiresIn });
  const refreshToken = jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: refreshExpiresIn });
  return { token, refreshToken };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      passwordHash: true,
      role: true,
      tenantId: true,
      isActive: true,
      tenant: { select: { name: true } },
    },
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const payload = { id: user.id, tenantId: user.tenantId, role: user.role };
  const { token, refreshToken } = generateTokens(payload);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
    },
    token,
    refreshToken,
  };
}

async function refresh(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User not found or inactive');
  }

  const payload = { id: user.id, tenantId: user.tenantId, role: user.role };
  let expiresIn = env.jwtExpiresIn;
  if (payload.role === 'VENDOR' || payload.role === 'COORDINATOR') {
    expiresIn = '14d';
  }
  const newToken = jwt.sign(payload, env.jwtSecret, { expiresIn });

  return { token: newToken };
}

module.exports = { login, refresh };
