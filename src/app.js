const express = require('express');
const { securityHeaders } = require('./middleware/securityHeaders');
const { corsMiddleware } = require('./middleware/cors');
const { requestLogger } = require('./middleware/logger');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const apiV1Routes = require('./routes/api.v1');

const app = express();

// Set trust proxy for deployment behind reverse proxies (Vercel, AWS ALB, Nginx, Cloudflare)
app.set('trust proxy', 1);

// 1. Structured Logging with Correlation IDs
app.use(requestLogger);

// 2. Hardened Security Headers (Helmet, CSP, Anti-Clickjacking, NoSniff)
app.use(securityHeaders);

// 3. Strict Whitelisted CORS (Replacing dangerous wildcard *)
app.use(corsMiddleware);

// 4. Global Tier-1 Rate Limiting (DDoS & Scraping Mitigation)
app.use(globalRateLimiter);

// 5. Body Parsing with Safe Payload Size Limits (Mitigates Memory Exhaustion Attacks)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 6. Routes
app.use('/', healthRoutes);
app.use('/api/v1', apiV1Routes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Cynbit Enterprise Backend Gateway',
    version: '1.0.0',
    documentation: 'https://github.com/cynbit-engineering/cynbit-backend-engine',
    endpoints: {
      health: '/health',
      readiness: '/health/ready',
      inquiries: '/api/v1/inquiries',
      bitElevate: '/api/v1/bitelevate/apply',
      auth: '/api/v1/auth/login',
      portalDashboard: '/api/v1/portal/dashboard',
    },
    correlationId: req.correlationId,
  });
});

// 7. Route 404 Handler
app.use(notFoundHandler);

// 8. Centralized RFC 7807 Error Handler
app.use(errorHandler);

module.exports = app;
