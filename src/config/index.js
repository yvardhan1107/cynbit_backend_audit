const dotenv = require('dotenv');

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'https://cynbit.in,https://www.cynbit.in,http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_cynbit_fallback_key',
  rateLimits: {
    global: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    inquiries: {
      windowMs: 15 * 60 * 1000, // 15 mins
      max: parseInt(process.env.INQUIRY_RATE_LIMIT_MAX || '10', 10), // Strict limit to prevent form spam
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5, // Strict brute-force prevention
    },
  },
  queue: {
    enabled: process.env.ENABLE_ASYNC_WORKER !== 'false',
    retryAttempts: parseInt(process.env.WORKER_RETRY_ATTEMPTS || '3', 10),
  },
};

module.exports = config;
