const cors = require('cors');
const config = require('../config');

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error(`Origin ${origin} is not allowed by CORS policy`);
    err.statusCode = 403;
    return callback(err);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Idempotency-Key'],
  exposedHeaders: ['X-Correlation-ID', 'Idempotency-Key'],
  credentials: true,
  maxAge: 86400,
};

const corsMiddleware = cors(corsOptions);

module.exports = { corsMiddleware };
