const config = require('../config');

function notFoundHandler(req, res, next) {
  res.status(404).json({
    type: 'https://cynbit.in/errors/resource-not-found',
    title: 'Resource Not Found',
    status: 404,
    detail: `The requested path '${req.originalUrl}' was not found.`,
    instance: req.originalUrl,
    correlationId: req.correlationId,
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  const errorResponse = {
    type: err.type || 'https://cynbit.in/errors/internal-server-error',
    title: err.title || (statusCode === 500 ? 'Internal Server Error' : 'Request Error'),
    status: statusCode,
    detail: statusCode === 500 && config.env === 'production'
      ? 'An unexpected error occurred. Please contact support with the correlationId.'
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
