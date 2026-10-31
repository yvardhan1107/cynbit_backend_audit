# Cynbit Backend Technical Audit & Implementation

This repository contains my backend technical audit and code implementation for the Cynbit backend engineering assignment.

The assignment deliverables are split into two main parts:
1. **Technical Audit Report (`AUDIT_REPORT.md`)**: A detailed review of `https://www.cynbit.in/` covering observable edge configuration, response headers, CORS settings, route handling, and data ingestion risks.
2. **Backend Engine (`src/`)**: A Node.js and Express.js backend implementation that demonstrates how to address the identified issues with security hardening, origin-whitelisted CORS, tiered rate limiting, request idempotency, asynchronous job queues, and multi-tenant authentication.

---

## Project Structure

```text
├── AUDIT_REPORT.md             # Full technical audit report
├── Dockerfile                  # Production container configuration
├── render.yaml                 # Render cloud deployment blueprint
├── vercel.json                 # Vercel deployment configuration
├── package.json
├── src/
│   ├── config/
│   │   └── index.js            # Environment config & rate limit policies
│   ├── middleware/
│   │   ├── auth.js             # JWT verification & multi-tenant RBAC
│   │   ├── cors.js             # Origin-whitelisted CORS middleware
│   │   ├── errorHandler.js     # RFC 7807 problem details error handler
│   │   ├── idempotency.js      # Idempotency-Key cache middleware
│   │   ├── logger.js           # Request logger with correlation IDs
│   │   ├── rateLimiter.js      # Global, lead ingestion & auth rate limiters
│   │   ├── securityHeaders.js  # Helmet CSP & anti-clickjacking headers
│   │   └── validator.js        # Input validation & sanitization
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bitelevateController.js
│   │   ├── healthController.js
│   │   └── inquiryController.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── bitelevateService.js
│   │   ├── inquiryService.js
│   │   └── queueService.js     # Background job queue with retry backoff & DLQ
│   ├── routes/
│   │   ├── api.v1.js           # REST API routes
│   │   └── health.routes.js    # Health and readiness routes
│   ├── app.js                  # Express application setup
│   └── server.js               # Server entry point & graceful shutdown
└── tests/
    ├── auth_rbac.test.js
    ├── bitelevate.test.js
    ├── health.test.js
    ├── inquiries.test.js
    ├── mockClient.js
    ├── rateLimiter.test.js
    ├── security.test.js
    └── testHelper.js
```

---

## Getting Started

### Prerequisites
- Node.js 20 or higher
- npm 10 or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/yvardhan1107/cynbit_backend_audit.git
cd cynbit_backend_audit

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### Running Locally
```bash
# Start server in development mode
npm run dev

# Start server in production mode
npm start
```
The server will run on `http://localhost:5000`.

---

## Running the Test Suite

Tests use Node.js's built-in test runner (`node:test`) and test the Express app directly in memory:

```bash
npm test
```

All 24 test cases cover:
- Helmet security headers (`Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- CORS origin whitelisting (blocking unauthorized origins).
- Lead inquiry submission, schema validation, and input sanitization.
- Idempotency checks via `Idempotency-Key` headers.
- BitElevate application ingestion and track enum validation.
- JWT authentication, role-based authorization (`admin`, `staff`, `client`), and multi-tenant scoping.
- Rate limit enforcement returning HTTP 429 when thresholds are exceeded.
- Health checks and RFC 7807 error formatting.

---

## Key Backend Features Implemented

### 1. Security Headers & CORS Policy
The live site returns `Access-Control-Allow-Origin: *` across all pages and lacks CSP and `X-Frame-Options`. Here, `src/middleware/securityHeaders.js` configures Helmet with a strict CSP (`frame-ancestors 'none'`) and clickjacking prevention. `src/middleware/cors.js` replaces the wildcard with a whitelist of permitted origins (`ALLOWED_ORIGINS`).

### 2. Tiered Rate Limiting
To prevent lead form spamming and credential brute-forcing, `src/middleware/rateLimiter.js` defines three limiters:
- General API: 100 requests / 15 minutes.
- Ingestion (`/api/v1/inquiries`, `/api/v1/bitelevate/apply`): 10 requests / 15 minutes.
- Auth (`/api/v1/auth/login`): 5 attempts / 15 minutes.

### 3. Idempotency Handling
State-modifying requests can pass an `Idempotency-Key` header. If a user double-clicks or their client retries after a network drop, `src/middleware/idempotency.js` returns the cached response with `X-Cache-Lookup: IDEMPOTENT_HIT`, preventing duplicate records in the database.

### 4. Asynchronous Queue & Dead Letter Queue (DLQ)
Instead of blocking the client while sending emails or syncing with CRMs, `src/services/queueService.js` enqueues jobs in the background. If a job fails, it retries with exponential backoff. Repeated failures are sent to a Dead Letter Queue (DLQ) for inspection.

### 5. Multi-Tenant Role-Based Access Control (RBAC)
Protected portal routes verify JWT bearer tokens and attach `req.user` and `req.tenantId` to the request, ensuring users can only access data belonging to their specific tenant.

---

## API Endpoints & Example Requests

### Health Check
```bash
curl http://localhost:5000/health
```

### Submit Lead Inquiry (with Idempotency Key)
```bash
curl -X POST http://localhost:5000/api/v1/inquiries \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: lead-submission-001" \
  -d '{
    "name": "Aman Verma",
    "email": "aman@example.com",
    "company": "Tech Logistics",
    "serviceInterest": "ai-automation",
    "message": "Interested in evaluating autonomous agent workflows for our logistics operations."
  }'
```

### Submit BitElevate Application
```bash
curl -X POST http://localhost:5000/api/v1/bitelevate/apply \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Rohit Kumar",
    "email": "rohit@college.edu",
    "track": "backend-developer-intern",
    "collegeOrOrg": "NIT Jaipur",
    "portfolioUrl": "https://github.com/rohitkumar",
    "statementOfPurpose": "Looking to build practical experience in distributed systems and Node.js."
  }'
```

### Login & Get JWT Token
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cynbit.in",
    "password": "SecureAdminPass2026!"
  }'
```

### Access Protected Dashboard
```bash
curl http://localhost:5000/api/v1/portal/dashboard \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Docker Support

A Dockerfile is included for containerized deployment:

```bash
# Build the image
docker build -t cynbit-backend-engine .

# Run container
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e ALLOWED_ORIGINS="https://cynbit.in,https://www.cynbit.in" \
  cynbit-backend-engine
```
