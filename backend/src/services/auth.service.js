const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');
const {
  hashPasswordResetToken,
  generatePasswordResetToken,
  resolveTenantBaseUrl,
} = require('../utils/passwordToken');

const SALT_ROUNDS = 10;

function validatePasswordComplexity(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    throw ApiError.badRequest('La contraseña debe tener entre 8 y 72 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    throw ApiError.badRequest('La contraseña debe incluir al menos una letra mayúscula');
  }
  if (!/[0-9]/.test(password)) {
    throw ApiError.badRequest('La contraseña debe incluir al menos un número');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw ApiError.badRequest('La contraseña debe incluir al menos un carácter especial');
  }
}

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
    where: { email: String(email).trim() },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      passwordHash: true,
      role: true,
      tenantId: true,
      isActive: true,
      mustChangePassword: true,
      tenant: { select: { name: true, status: true } },
    },
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.role !== 'SUPERADMIN' && (!user.tenant || user.tenant.status === 'suspended')) {
    throw new ApiError(403, 'Tenant is suspended or invalid', 'TENANT_SUSPENDED');
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
      tenantName: user.tenant?.name || null,
      mustChangePassword: Boolean(user.mustChangePassword),
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

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, tenantId: true, role: true, isActive: true, tenant: { select: { status: true } } },
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User not found or inactive');
  }

  if (user.role !== 'SUPERADMIN' && (!user.tenant || user.tenant.status === 'suspended')) {
    throw new ApiError(403, 'Tenant is suspended or invalid', 'TENANT_SUSPENDED');
  }

  const payload = { id: user.id, tenantId: user.tenantId, role: user.role };
  let expiresIn = env.jwtExpiresIn;
  if (payload.role === 'VENDOR' || payload.role === 'COORDINATOR') {
    expiresIn = '14d';
  }
  const newToken = jwt.sign(payload, env.jwtSecret, { expiresIn });

  return { token: newToken };
}

async function forgotPassword(email, origin) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const genericResponse = {
    message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
  };

  if (!normalizedEmail) {
    return genericResponse;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
    },
    include: {
      tenant: { select: { id: true, name: true, status: true } },
    },
  });

  if (!user || !user.isActive || (user.tenant && user.tenant.status === 'suspended')) {
    return genericResponse;
  }

  const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken(60);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const baseUrl = resolveTenantBaseUrl(origin);
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  emailService
    .sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      tenantName: user.tenant?.name || 'SalesFlow',
      tenantId: user.tenantId,
    })
    .catch(() => {});

  return genericResponse;
}

async function resetPassword(rawToken, newPassword) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw ApiError.badRequest('El token de recuperación es requerido');
  }

  validatePasswordComplexity(newPassword);

  const tokenHash = hashPasswordResetToken(rawToken);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
      isActive: true,
    },
    include: {
      tenant: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    throw ApiError.badRequest('El enlace de recuperación es inválido o ha expirado');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      passwordChangedAt: new Date(),
    },
  });

  emailService
    .sendPasswordChangedNotification({
      to: user.email,
      name: user.name,
      tenantName: user.tenant?.name || 'SalesFlow',
      tenantId: user.tenantId,
    })
    .catch(() => {});

  return { message: 'Contraseña restablecida exitosamente' };
}

async function changePassword(userId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Debes proporcionar la contraseña actual y la nueva contraseña');
  }

  validatePasswordComplexity(newPassword);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: { select: { id: true, name: true } },
    },
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Usuario no encontrado o inactivo');
  }

  const validCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!validCurrent) {
    throw ApiError.badRequest('La contraseña actual es incorrecta');
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw ApiError.badRequest('La nueva contraseña debe ser diferente a la actual');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      passwordChangedAt: new Date(),
    },
  });

  emailService
    .sendPasswordChangedNotification({
      to: user.email,
      name: user.name,
      tenantName: user.tenant?.name || 'SalesFlow',
      tenantId: user.tenantId,
    })
    .catch(() => {});

  return { message: 'Contraseña actualizada exitosamente', mustChangePassword: false };
}

module.exports = {
  login,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
  validatePasswordComplexity,
};
