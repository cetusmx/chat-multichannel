const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');
const { validatePasswordComplexity } = require('./auth.service');
const {
  hashPasswordResetToken,
  generatePasswordResetToken,
  resolveSuperadminBaseUrl,
} = require('../utils/passwordToken');

const SALT_ROUNDS = 10;
// Dummy hash to prevent timing attacks (hash of 'dummy')
const DUMMY_HASH = '$2a$10$C.Xv.hFqL1N.O3X.pX.0.e9Q.Q3.8.v.p.r.x.v.v.v.v.v.v.v';

function generateTokens(payload) {
  const expiresIn = env.superadminJwtExpiresIn;
  const token = jwt.sign(payload, env.superadminJwtSecret, { expiresIn });
  return { token };
}

async function login(email, password) {
  const admin = await prisma.superadmin.findUnique({
    where: { email },
  });

  const hashToCompare = admin ? admin.passwordHash : DUMMY_HASH;
  const valid = await bcrypt.compare(password, hashToCompare);

  if (!admin || !valid) {
    throw ApiError.unauthorized('Credenciales inválidas');
  }

  const payload = { id: admin.id, role: 'SUPERADMIN' };
  const { token } = generateTokens(payload);

  return {
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'SUPERADMIN',
      mustChangePassword: Boolean(admin.mustChangePassword),
    },
    token,
  };
}

async function forgotPassword(email, origin) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const genericResponse = {
    message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
  };

  if (!normalizedEmail) {
    return genericResponse;
  }

  const admin = await prisma.superadmin.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
  });

  if (!admin) {
    return genericResponse;
  }

  const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken(60);

  await prisma.superadmin.update({
    where: { id: admin.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const baseUrl = resolveSuperadminBaseUrl(origin);
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  emailService
    .sendPasswordResetEmail({
      to: admin.email,
      name: admin.name,
      resetUrl,
      tenantName: 'SalesFlow Superadmin',
      preferPlatform: true,
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
  const admin = await prisma.superadmin.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
    },
  });

  if (!admin) {
    throw ApiError.badRequest('El enlace de recuperación es inválido o ha expirado');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.superadmin.update({
    where: { id: admin.id },
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
      to: admin.email,
      name: admin.name,
      tenantName: 'SalesFlow Superadmin',
      preferPlatform: true,
    })
    .catch(() => {});

  return { message: 'Contraseña restablecida exitosamente' };
}

async function changePassword(superadminId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Debes proporcionar la contraseña actual y la nueva contraseña');
  }

  validatePasswordComplexity(newPassword);

  const admin = await prisma.superadmin.findUnique({
    where: { id: superadminId },
  });

  if (!admin) {
    throw ApiError.unauthorized('Superadmin no encontrado');
  }

  const validCurrent = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!validCurrent) {
    throw ApiError.badRequest('La contraseña actual es incorrecta');
  }

  const isSamePassword = await bcrypt.compare(newPassword, admin.passwordHash);
  if (isSamePassword) {
    throw ApiError.badRequest('La nueva contraseña debe ser diferente a la actual');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.superadmin.update({
    where: { id: admin.id },
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
      to: admin.email,
      name: admin.name,
      tenantName: 'SalesFlow Superadmin',
      preferPlatform: true,
    })
    .catch(() => {});

  return { message: 'Contraseña actualizada exitosamente', mustChangePassword: false };
}

async function getPlatformEmailConfig() {
  const config = await prisma.platformEmailConfig.findUnique({
    where: { id: 'default' },
  });

  if (!config) {
    return { isConfigured: false };
  }

  return {
    isConfigured: true,
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    password: config.password,
    fromName: config.fromName,
    fromEmail: config.fromEmail,
  };
}

async function updatePlatformEmailConfig(data) {
  const { host, port, secure, user, password, fromName, fromEmail } = data || {};
  if (!host || !user || !password) {
    throw ApiError.badRequest('Servidor SMTP, usuario y contraseña son requeridos');
  }

  const parsedPort = parseInt(port, 10) || 465;

  const updated = await prisma.platformEmailConfig.upsert({
    where: { id: 'default' },
    update: {
      host: String(host).trim(),
      port: parsedPort,
      secure: Boolean(secure),
      user: String(user).trim(),
      password: String(password),
      fromName: fromName ? String(fromName).trim() : null,
      fromEmail: fromEmail ? String(fromEmail).trim() : null,
    },
    create: {
      id: 'default',
      host: String(host).trim(),
      port: parsedPort,
      secure: Boolean(secure),
      user: String(user).trim(),
      password: String(password),
      fromName: fromName ? String(fromName).trim() : null,
      fromEmail: fromEmail ? String(fromEmail).trim() : null,
    },
  });

  return {
    isConfigured: true,
    host: updated.host,
    port: updated.port,
    secure: updated.secure,
    user: updated.user,
    password: updated.password,
    fromName: updated.fromName,
    fromEmail: updated.fromEmail,
  };
}

module.exports = {
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getPlatformEmailConfig,
  updatePlatformEmailConfig,
};
