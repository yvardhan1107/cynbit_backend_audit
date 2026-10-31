const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeRequest } = require('./mockClient');

test('Rate Limiter Protection Suite', async (t) => {
  await t.test('triggers 429 Too Many Requests when auth rate limit is exceeded', async () => {
    // Auth limiter threshold is 5 attempts per window
    const invalidAuthAttempt = {
      email: 'attacker@botnet.com',
      password: 'BruteForceGuess',
    };

    let lastResponse;
    for (let i = 0; i < 6; i++) {
      lastResponse = await makeRequest('POST', '/api/v1/auth/login', {
        headers: { 'X-Forwarded-For': '198.51.100.25' },
        body: invalidAuthAttempt,
      });
    }

    assert.equal(lastResponse.status, 429);
    assert.equal(lastResponse.body.title, 'Too Many Requests');
    assert.equal(lastResponse.body.type, 'https://cynbit.in/errors/rate-limit-exceeded');
    assert.ok(lastResponse.body.retryAfterSeconds > 0);
  });
});
