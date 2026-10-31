const express = require('express');
const { securityHeaders } = require('./middleware/securityHeaders');
const { corsMiddleware } = require('./middleware/cors');
const { requestLogger } = require('./middleware/logger');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const apiV1Routes = require('./routes/api.v1');

const app = express();

app.set('trust proxy', 1);

// Middleware
app.use(requestLogger);
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(globalRateLimiter);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Routes
app.use('/', healthRoutes);
app.use('/api/v1', apiV1Routes);

app.get('/', (req, res) => {
  res.status(200).json({
    service: 'cynbit-backend-api',
    status: 'running',
    endpoints: {
      health: '/health',
      inquiries: '/api/v1/inquiries',
      bitElevate: '/api/v1/bitelevate/apply',
      auth: '/api/v1/auth/login',
      portalDashboard: '/api/v1/portal/dashboard',
    },
    correlationId: req.correlationId,
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
