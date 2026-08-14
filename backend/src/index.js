const http = require('http');
const { Server } = require('socket.io');

// Override console methods to prepend timestamps
['log', 'info', 'warn', 'error'].forEach(method => {
  const original = console[method];
  console[method] = function (...args) {
    original.apply(console, [`[${new Date().toISOString()}]`, ...args]);
  };
});

const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');

const server = http.createServer(app);

const { setupSocket } = require('./socket');
const io = setupSocket(server);
const slaService = require('./services/sla.service');
const { startSlaCron, waitForShutdown } = require('./workers/sla-cron');
const prisma = require('./config/database');

slaService.startMonitor();
startSlaCron();

server.listen(env.port, () => {
  logger.info(`SalesFlow API running on port ${env.port} [${env.nodeEnv}]`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
  process.exit(1);
});

let isShuttingDown = false;
const gracefulShutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('Graceful shutdown initiated...');
  
  // Force exit if things take too long
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000).unref();

  slaService.stopMonitor();
  
  io.close(() => {
    logger.info('Socket.io server closed');
  });

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await waitForShutdown();
      await prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error('Error during database disconnection:', err);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { app, server, io };
