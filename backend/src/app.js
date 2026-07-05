const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const swaggerRoutes = require('./routes/swagger.routes');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const groupsRoutes = require('./routes/groups.routes');
const tenantRoutes = require('./routes/tenant.routes');
const branchRoutes = require('./routes/branch.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const authenticate = require('./middleware/auth');

// Serve uploads securely
app.use('/uploads', authenticate, (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/chat', chatRoutes);

app.use('/api-docs', swaggerRoutes);

const frontendPath = path.join(__dirname, '../public');
app.use(express.static(frontendPath));

app.get('/api', (_req, res) => {
  res.json({ service: 'SalesFlow API', version: '0.1.0' });
});

app.use(errorHandler);

// Start background cleanup job for /uploads (30 days retention to prevent disk crash)
setInterval(async () => {
  try {
    const fsp = require('fs/promises');
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) return;
    
    const tenantsDir = await fsp.opendir(uploadsDir);
    const now = Date.now();
    const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
      
    for await (const tenantDirent of tenantsDir) {
      if (!tenantDirent.isDirectory()) continue;
        
      const tenantPath = path.join(uploadsDir, tenantDirent.name);
      // temp directory gets a shorter TTL (1 day) instead of being skipped
      const isTemp = tenantDirent.name === 'temp';
      const currentTTL = isTemp ? (24 * 60 * 60 * 1000) : TTL;

      try {
        const filesDir = await fsp.opendir(tenantPath);
        for await (const fileDirent of filesDir) {
          if (!fileDirent.isFile()) continue;
            
          const filepath = path.join(tenantPath, fileDirent.name);
          const fStat = await fsp.stat(filepath).catch(() => null);
          if (!fStat) continue;
            
          const now = Date.now();
          if (now - fStat.mtimeMs > currentTTL) {
            await fsp.unlink(filepath).catch(() => {});
          }
        }
      } catch (err) {
        console.error(`[CRON] Error iterando archivos en ${tenantDirent.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Cleanup job error:', err.message);
  }
}, 12 * 60 * 60 * 1000); // Run every 12 hours

// React Router fallback (must be after all API routes)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

module.exports = app;
