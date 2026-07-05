const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  logger.error(`${req.method} ${req.path} - ${status} ${code}: ${message}`, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (process.env.NODE_ENV === 'development' && status === 500) {
    return res.status(status).json({
      error: { message, code, stack: err.stack },
    });
  }

  res.status(status).json({
    error: { message, code },
  });
}

module.exports = errorHandler;
