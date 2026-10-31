const idempotencyStore = new Map();

// Expire cache entries after 1 hour
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
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return next();
  }

  const cached = idempotencyStore.get(idempotencyKey);
  if (cached) {
    if (cached.status === 'in_progress') {
      return res.status(409).json({
        type: 'https://cynbit.in/errors/concurrent-request',
        title: 'Conflict',
        status: 409,
        detail: 'An identical request is currently being processed.',
        correlationId: req.correlationId,
      });
    }

    res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
    return res.status(cached.statusCode).json(cached.body);
  }

  idempotencyStore.set(idempotencyKey, {
    status: 'in_progress',
    timestamp: Date.now(),
  });

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
