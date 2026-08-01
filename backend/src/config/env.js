const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  superadminJwtSecret: process.env.SUPERADMIN_JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret' : (() => { throw new Error('SUPERADMIN_JWT_SECRET must be defined in environment'); })()),
  superadminJwtExpiresIn: process.env.SUPERADMIN_JWT_EXPIRES_IN || '1h',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  metaApiVersion: process.env.META_API_VERSION || 'v19.0',
};

module.exports = env;
