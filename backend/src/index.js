const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');

const server = http.createServer(app);

const { setupSocket } = require('./socket');
const io = setupSocket(server);



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

module.exports = { app, server, io };
