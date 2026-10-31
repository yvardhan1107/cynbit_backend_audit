const crypto = require('crypto');
const config = require('../config');

// HMAC SHA-256 token helper for stateless auth simulation
function signToken(payload, secret = config.jwtSecret, expiresInSeconds = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

function verifyToken(token, secret = config.jwtSecret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  if (signature !== expectedSig) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      type: 'https://cynbit.in/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Missing or malformed Authorization header. Bearer token required.',
      correlationId: req.correlationId,
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      type: 'https://cynbit.in/errors/invalid-token',
      title: 'Unauthorized',
      status: 401,
      detail: 'Provided authentication token is invalid or expired.',
      correlationId: req.correlationId,
    });
  }

  req.user = decoded;
  req.tenantId = decoded.tenantId || 'global';
  next();
}

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        type: 'https://cynbit.in/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required prior to authorization check.',
        correlationId: req.correlationId,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        type: 'https://cynbit.in/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: `Access denied. Role '${req.user.role}' lacks sufficient privileges.`,
        correlationId: req.correlationId,
      });
    }

    next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  authenticate,
  authorize,
};
