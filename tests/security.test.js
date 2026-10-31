const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTestServer } = require('./testHelper');

test('Security Middleware & Headers Suite', async (t) => {
  const server = createTestServer();
  let baseUrl;

  before(async () => {
    baseUrl = await server.start();
  });

  after(async () => {
    await server.stop();
  });

  await t.test('verifies presence of critical OWASP security headers', async () => {
    const res = await server.request(baseUrl, '/health');

    assert.equal(res.status, 200);
    // Anti-Clickjacking
    assert.equal(res.headers['x-frame-options'], 'DENY');
    // MIME type protection
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    // Content-Security-Policy
    assert.ok(res.headers['content-security-policy'], 'CSP must be defined');
    assert.match(res.headers['content-security-policy'], /frame-ancestors 'none'/);
    // HSTS
    assert.ok(res.headers['strict-transport-security']);
    // Mask Express fingerprint
    assert.equal(res.headers['x-powered-by'], undefined);
    // Correlation ID
    assert.ok(res.headers['x-correlation-id'], 'X-Correlation-ID should be set on response');
  });

  await t.test('verifies CORS blocks disallowed external origins', async () => {
    const res = await server.request(baseUrl, '/api/v1/inquiries', {
      method: 'POST',
      headers: {
        Origin: 'https://malicious-attacker-site.com',
      },
      body: { name: 'Test' },
    });

    assert.equal(res.status, 403);
    assert.match(res.body.detail, /not allowed by Cynbit CORS policy/);
  });

  await t.test('verifies CORS allows whitelisted Cynbit domain', async () => {
    const res = await server.request(baseUrl, '/health', {
      headers: {
        Origin: 'https://cynbit.in',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'https://cynbit.in');
  });
});
