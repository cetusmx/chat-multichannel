const crypto = require('crypto');

function hashPasswordResetToken(rawToken) {
  return crypto
    .createHash('sha256')
    .update(String(rawToken || ''))
    .digest('hex');
}

function generatePasswordResetToken(ttlMinutes = 60) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
}

function resolveTenantBaseUrl(origin) {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  if (origin && !origin.includes(':4006') && !origin.includes('salesflow-admin')) {
    return origin.replace(/\/$/, '');
  }
  return 'http://salesflow.algor.mx';
}

function resolveSuperadminBaseUrl(origin) {
  if (process.env.SUPERADMIN_URL) {
    return process.env.SUPERADMIN_URL.replace(/\/$/, '');
  }
  if (origin) {
    return origin.replace(/\/$/, '');
  }
  return 'http://salesflow-admin.algor.mx';
}

module.exports = {
  hashPasswordResetToken,
  generatePasswordResetToken,
  resolveTenantBaseUrl,
  resolveSuperadminBaseUrl,
};
