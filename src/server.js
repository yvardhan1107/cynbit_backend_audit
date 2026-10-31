const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, config.host, () => {
  console.log(`Server listening on http://${config.host}:${config.port} (${config.env})`);
});

const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Closing server gracefully...`);

  server.close((err) => {
    if (err) {
      console.error('Error while closing server:', err);
      process.exit(1);
    }
    console.log('Server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
