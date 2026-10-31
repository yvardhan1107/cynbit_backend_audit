const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTestServer } = require('./testHelper');

test('Authentication, Multi-Tenancy & RBAC Suite', async (t) => {
  const server = createTestServer();
  let baseUrl;

  before(async () => {
    baseUrl = await server.start();
  });

  after(async () => {
    await server.stop();
  });

  let adminToken;
  let clientToken;

  await t.test('authenticates valid admin and returns signed bearer token', async () => {
    const res = await server.request(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@cynbit.in',
        password: 'SecureAdminPass2026!',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.equal(res.body.data.user.role, 'admin');
    assert.equal(res.body.data.user.tenantId, 'cynbit_corp');
    adminToken = res.body.data.accessToken;
  });

  await t.test('authenticates enterprise tenant client', async () => {
    const res = await server.request(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'client@tenantease.in',
        password: 'ClientSecretPass2026!',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'client');
    assert.equal(res.body.data.user.tenantId, 'tenant_enterprise_42');
    clientToken = res.body.data.accessToken;
  });

  await t.test('rejects login with invalid password', async () => {
    const res = await server.request(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@cynbit.in',
        password: 'WrongPassword!',
      },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.title, 'Unauthorized');
  });

  await t.test('enforces RBAC: allows admin to view leads list', async () => {
    const res = await server.request(baseUrl, '/api/v1/inquiries', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  await t.test('enforces RBAC: denies client from viewing admin leads list (403 Forbidden)', async () => {
    const res = await server.request(baseUrl, '/api/v1/inquiries', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${clientToken}`,
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.title, 'Forbidden');
    assert.match(res.body.detail, /Role 'client' lacks sufficient privileges/);
  });

  await t.test('demonstrates tenant isolation on dashboard endpoint', async () => {
    const res = await server.request(baseUrl, '/api/v1/portal/dashboard', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${clientToken}`,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.tenantId, 'tenant_enterprise_42');
  });
});
