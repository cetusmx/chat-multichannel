const levels = ['debug', 'info', 'warn', 'error'];
const currentLevel = process.env.LOG_LEVEL || 'info';

function shouldLog(level) {
  if (currentLevel === 'silent' || currentLevel === 'none') return false;
  return levels.indexOf(level) >= levels.indexOf(currentLevel);
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta) {
    return `${base} ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`;
  }
  return base;
}

const logger = {
  debug(message, meta) {
    if (shouldLog('debug')) console.debug(formatMessage('debug', message, meta));
  },
  info(message, meta) {
    if (shouldLog('info')) console.info(formatMessage('info', message, meta));
  },
  warn(message, meta) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, meta));
  },
  error(message, meta) {
    if (shouldLog('error')) console.error(formatMessage('error', message, meta));
  },
};

module.exports = logger;
