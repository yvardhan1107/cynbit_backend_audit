// In-memory idempotency cache (In production, backed by Redis cluster)
const idempotencyStore = new Map();

// Cleanup expired entries periodically (TTL: 1 hour)
const TTL_MS = 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function idempotency(req, res, next) {
  // Only apply to state-modifying requests
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    // If no key provided, continue normally
    return next();
  }

  const cached = idempotencyStore.get(idempotencyKey);
  if (cached) {
    if (cached.status === 'in_progress') {
      return res.status(409).json({
        type: 'https://cynbit.in/errors/concurrent-request',
        title: 'Conflict',
        status: 409,
        detail: 'An identical request with this Idempotency-Key is currently being processed.',
        correlationId: req.correlationId,
      });
    }

    // Return cached response
    res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
    return res.status(cached.statusCode).json(cached.body);
  }

  // Mark as in-progress
  idempotencyStore.set(idempotencyKey, {
    status: 'in_progress',
    timestamp: Date.now(),
  });

  // Intercept response send
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    idempotencyStore.set(idempotencyKey, {
      status: 'completed',
      statusCode: res.statusCode,
      body,
      timestamp: Date.now(),
    });
    return originalJson(body);
  };

  next();
}

module.exports = { idempotency, idempotencyStore };
