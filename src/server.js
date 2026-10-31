const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, config.host, () => {
  console.log(`[Cynbit Backend Engine] Running in ${config.env} mode on http://${config.host}:${config.port}`);
  console.log(`[Cynbit Backend Engine] Whitelisted CORS origins: ${config.allowedOrigins.join(', ')}`);
});

// Graceful Shutdown Handling
const shutdown = (signal) => {
  console.log(`\n[Cynbit Backend Engine] Received ${signal}. Initiating graceful shutdown...`);

  server.close((err) => {
    if (err) {
      console.error('[Cynbit Backend Engine] Error while closing server:', err);
      process.exit(1);
    }
    console.log('[Cynbit Backend Engine] HTTP server closed cleanly. Exiting.');
    process.exit(0);
  });

  // Force shutdown after timeout if requests hang
  setTimeout(() => {
    console.error('[Cynbit Backend Engine] Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Cynbit Backend Engine] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Cynbit Backend Engine] Uncaught Exception:', err);
  process.exit(1);
});
