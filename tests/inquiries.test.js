const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { createTestServer } = require('./testHelper');

test('Enterprise Inquiries & Lead Ingestion Suite', async (t) => {
  const server = createTestServer();
  let baseUrl;

  before(async () => {
    baseUrl = await server.start();
  });

  after(async () => {
    await server.stop();
  });

  await t.test('successfully ingests valid lead inquiry with async job queuing', async () => {
    const payload = {
      name: 'Yashvardhan Singh',
      email: 'lead@enterprise.com',
      company: 'Enterprise Corp',
      serviceInterest: 'ai-automation',
      message: 'Looking for autonomous AI agent workflows and custom backend development.',
    };

    const res = await server.request(baseUrl, '/api/v1/inquiries', {
      method: 'POST',
      body: payload,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id.startsWith('inq_'));
    assert.ok(res.body.data.jobId.startsWith('job_'));
    assert.equal(res.body.data.status, 'received');
  });

  await t.test('enforces idempotency via Idempotency-Key header', async () => {
    const key = `test_key_${crypto.randomUUID()}`;
    const payload = {
      name: 'Duplicate Checker',
      email: 'dup@enterprise.com',
      message: 'Testing network drop retry behavior with same idempotency key.',
    };

    // First request
    const res1 = await server.request(baseUrl, '/api/v1/inquiries', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: payload,
    });
    assert.equal(res1.status, 201);
    const initialId = res1.body.data.id;

    // Second request with same key
    const res2 = await server.request(baseUrl, '/api/v1/inquiries', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: payload,
    });

    assert.equal(res2.status, 201);
    assert.equal(res2.headers['x-cache-lookup'], 'IDEMPOTENT_HIT');
    assert.equal(res2.body.data.id, initialId, 'Should return cached duplicate ID');
  });

  await t.test('rejects malformed requests and validates schemas with 400', async () => {
    const invalidPayload = {
      name: 'A', // Too short
      email: 'invalid-email-address',
      message: 'short', // Too short (< 10 chars)
      serviceInterest: 'unsupported-service',
    };

    const res = await server.request(baseUrl, '/api/v1/inquiries', {
      method: 'POST',
      body: invalidPayload,
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.title, 'Bad Request');
    assert.ok(Array.isArray(res.body.errors));
    assert.equal(res.body.errors.length, 4);
  });
});
