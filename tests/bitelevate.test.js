const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTestServer } = require('./testHelper');

test('BitElevate Student/Engineer Application Suite', async (t) => {
  const server = createTestServer();
  let baseUrl;

  before(async () => {
    baseUrl = await server.start();
  });

  after(async () => {
    await server.stop();
  });

  await t.test('accepts valid application for backend developer track', async () => {
    const payload = {
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@college.edu',
      collegeOrOrg: 'MNIT Jaipur',
      track: 'backend-developer-intern',
      experienceLevel: 'intermediate',
      portfolioUrl: 'https://github.com/rahul-engineer',
      resumeUrl: 'https://drive.google.com/resume.pdf',
      statementOfPurpose: 'Passionate about building scalable Node.js microservices and distributed systems.',
    };

    const res = await server.request(baseUrl, '/api/v1/bitelevate/apply', {
      method: 'POST',
      body: payload,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.track, 'backend-developer-intern');
    assert.ok(res.body.data.applicationId.startsWith('be_app_'));
  });

  await t.test('rejects application with invalid track selection', async () => {
    const payload = {
      fullName: 'Anita Roy',
      email: 'anita@domain.com',
      track: 'quantum-computing-specialist', // Not in allowed enum
    };

    const res = await server.request(baseUrl, '/api/v1/bitelevate/apply', {
      method: 'POST',
      body: payload,
    });

    assert.equal(res.status, 400);
    assert.match(res.body.errors[0].message, /Track is required. Choose from:/);
  });
});
