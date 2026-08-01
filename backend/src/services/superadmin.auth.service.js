const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

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
    },
    token,
  };
}

module.exports = { login };
