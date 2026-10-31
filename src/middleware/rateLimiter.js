const rateLimit = require('express-rate-limit');
const config = require('../config');

// Standard error responder for rate limit violations
const rateLimitHandler = (req, res, next, options) => {
  res.status(options.statusCode).json({
    type: 'https://cynbit.in/errors/rate-limit-exceeded',
    title: 'Too Many Requests',
    status: options.statusCode,
    detail: 'Request quota exceeded. Please throttle your requests and try again later.',
    instance: req.originalUrl,
    correlationId: req.correlationId,
    retryAfterSeconds: Math.ceil(options.windowMs / 1000),
  });
};

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { default: true, xForwardedForHeader: false, ip: false },
};

const globalRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: config.rateLimits.global.windowMs,
  max: config.rateLimits.global.max,
});

const inquiryRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: config.rateLimits.inquiries.windowMs,
  max: config.rateLimits.inquiries.max,
  message: 'Lead/Application submission limit reached. Please wait before submitting another inquiry.',
});

const authRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: config.rateLimits.auth.windowMs,
  max: config.rateLimits.auth.max,
  message: 'Too many authentication attempts. IP temporarily restricted.',
});

module.exports = {
  globalRateLimiter,
  inquiryRateLimiter,
  authRateLimiter,
};
