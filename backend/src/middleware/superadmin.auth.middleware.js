const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function isSuperadmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Token no provisto'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.superadminJwtSecret);
    
    if (decoded.role !== 'SUPERADMIN') {
      return next(ApiError.forbidden('Acceso denegado: Se requiere rol SUPERADMIN'));
    }

    req.superadmin = decoded;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' && err.message === 'invalid signature') {
      return next(ApiError.forbidden('Firma de token inválida para esta ruta'));
    }
    return next(ApiError.unauthorized('Token inválido o expirado'));
  }
}

module.exports = isSuperadmin;
