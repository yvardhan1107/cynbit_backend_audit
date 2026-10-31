const config = require('../config');

// 404 Route Not Found Handler
function notFoundHandler(req, res, next) {
  res.status(404).json({
    type: 'https://cynbit.in/errors/resource-not-found',
    title: 'Resource Not Found',
    status: 404,
    detail: `The requested path '${req.originalUrl}' does not exist on this Cynbit backend service.`,
    instance: req.originalUrl,
    correlationId: req.correlationId,
  });
}

// Global Error Handler
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  const errorResponse = {
    type: err.type || 'https://cynbit.in/errors/internal-server-error',
    title: err.title || (statusCode === 500 ? 'Internal Server Error' : 'Request Error'),
    status: statusCode,
    detail: statusCode === 500 && config.env === 'production'
      ? 'An unexpected error occurred while processing your request. Please contact support with the correlationId.'
      : err.message,
    instance: req.originalUrl,
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
  };

  if (config.env !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
