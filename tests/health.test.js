const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTestServer } = require('./testHelper');

test('Health, Readiness & RFC 7807 Error Handling Suite', async (t) => {
  const server = createTestServer();
  let baseUrl;

  before(async () => {
    baseUrl = await server.start();
  });

  after(async () => {
    await server.stop();
  });

  await t.test('GET /health returns 200 with system telemetry and queue metrics', async () => {
    const res = await server.request(baseUrl, '/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'UP');
    assert.equal(res.body.service, 'cynbit-backend-engine');
    assert.ok(res.body.system.nodeVersion);
    assert.ok(res.body.queue);
  });

  await t.test('GET /health/ready returns 200 READY', async () => {
    const res = await server.request(baseUrl, '/health/ready');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'READY');
    assert.equal(res.body.checks.database, 'OK');
  });

  await t.test('Nonexistent routes return RFC 7807 404 Problem Details format', async () => {
    const res = await server.request(baseUrl, '/api/v1/non-existent-endpoint');

    assert.equal(res.status, 404);
    assert.equal(res.body.title, 'Resource Not Found');
    assert.equal(res.body.status, 404);
    assert.ok(res.body.type.includes('errors/resource-not-found'));
    assert.ok(res.body.correlationId);
  });
});
