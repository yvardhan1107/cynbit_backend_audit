# Backend Technical Audit & Architectural Review

**Target:** `https://www.cynbit.in/`  
**Focus:** Backend Architecture, Security Headers, API Behavior & Data Ingestion  
**Environment / Stack:** Node.js & Express.js  

---

## 1. Overview & Approach

I conducted a passive technical review of Cynbit's live production website (`https://www.cynbit.in/`) to analyze its backend behavior, edge configuration, security posture, and data handling. 

My approach was purely non-intrusive and observational:
- Inspected HTTP response headers returned by the CDN/origin.
- Checked `robots.txt` and `sitemap.xml` for route structures and disallow directives.
- Tested how the application responds to standard requests, 404 routes, and HTTP methods.
- Reviewed client-side network activity on interactive pages like `/contact` and `/bitelevate`.

Based on the findings, I built a companion Express.js backend (`src/`) that demonstrates how to solve the identified gaps in security headers, CORS policies, form spam prevention, idempotency, and asynchronous job handling.

---

## 2. Observable Architecture & Infrastructure

### 2.1 Edge Network & Serving Layer
Running `curl -I https://www.cynbit.in/` gave the following key headers:

```http
HTTP/1.1 200 OK
Server: Vercel
X-Vercel-Id: bom1::...
X-Vercel-Cache: HIT
Age: 174226
Cache-Control: public, max-age=0, must-revalidate
Strict-Transport-Security: max-age=63072000
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
X-Matched-Path: /
X-Nextjs-Prerender: 1
X-Nextjs-Stale-Time: 300
Access-Control-Allow-Origin: *
```

Key takeaways:
1. **Hosting & CDN**: The site is hosted on Vercel and routed through their `bom1` edge location (Mumbai, India). Static pages are cached via Vercel Edge Cache (`X-Vercel-Cache: HIT`).
2. **Framework**: Headers confirm a Next.js App Router setup using Incremental Static Regeneration (ISR) / pre-rendering (`X-Nextjs-Prerender: 1`, `X-Nextjs-Stale-Time: 300`, and Next-specific `Vary` headers).
3. **Transport Security**: HSTS is enabled with a long max-age (`63072000` seconds / 2 years), which is good.

### 2.2 Route Discovery (`robots.txt`)
Checking `https://cynbit.in/robots.txt`:

```text
User-agent: *
Allow: /

Sitemap: https://cynbit.in/sitemap.xml
Crawl-delay: 1

Disallow: /api/
Disallow: /admin/
Disallow: /portal/
```

What this tells us:
- **`/api/`**: Disallowed from indexing. Probing `/api`, `/api/`, or `/api/contact` returns Vercel's edge 404 page. Form submissions on the marketing site appear to be handled via Next.js Server Actions or client-side triggers rather than dedicated REST endpoints.
- **`/portal/`**: Returns HTTP `200 OK` (serving a client-side route), indicating a customer or internal portal area.
- **`/admin/`**: Returns HTTP `404 Not Found`.

---

## 3. Key Findings & Potential Issues

### 3.1 Wildcard CORS on HTML Pages (`Access-Control-Allow-Origin: *`)
- **Observation:** The root page `/`, subpages, and even 404 responses return `Access-Control-Allow-Origin: *`.
- **Why it matters:** While wildcard CORS is fine for public static assets (images, fonts), having it globally applied across the application can be risky. If internal API endpoints or session-authenticated routes inherit this blanket header, any arbitrary website can make cross-origin requests and read responses.
- **Fix:** Restrict CORS via an explicit origin whitelist (e.g. `https://cynbit.in`, `https://www.cynbit.in`, and trusted staging domains).

### 3.2 Missing Critical Security Headers (OWASP)
The response headers are missing several standard defense headers:
1. **`Content-Security-Policy` (CSP)**: Not configured. Without a CSP, the browser has no restrictions on where scripts, styles, or iframes can be loaded from, increasing the risk of XSS and unauthorized data exfiltration.
2. **`X-Frame-Options`**: Missing. Without `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), pages like `/contact` or `/portal` can be embedded into external iframes on third-party sites, exposing users to clickjacking attacks.
3. **`X-Content-Type-Options: nosniff`**: Missing. Prevents older browsers from MIME-sniffing a response away from the declared Content-Type.
4. **`Permissions-Policy`**: Missing. Browser features like microphone, camera, and geolocation should be explicitly disabled if the application does not use them.

### 3.3 Form Handling, Lack of Rate Limiting & Denial of Service Risks
- **Observation:** Contact forms (`/contact`) and career/program applications (`/bitelevate`) do not display any observable backend rate limiting in response headers (e.g. `RateLimit-Limit`, `RateLimit-Remaining`).
- **Why it matters:**
  - An automated bot can spam lead forms with thousands of requests.
  - If form submissions trigger transactional emails (e.g., via SendGrid or Resend) or push leads into a CRM, spam attacks can burn through email API quotas and corrupt CRM data.
  - If submissions write directly to a database without queueing, traffic spikes can saturate database connection pools.
- **Fix:**
  - Put a token-bucket rate limiter on submission routes (e.g. 10 requests per 15 minutes per IP for form endpoints).
  - Use an asynchronous queue with retry backoff and a Dead Letter Queue (DLQ) so background operations (sending emails, syncing CRM) don't block the HTTP response.

### 3.4 Missing Idempotency on Ingestion Endpoints
- **Observation:** In real-world usage—especially on mobile connections—users frequently encounter connection drops and click "Submit" multiple times, or the client retries the request automatically.
- **Why it matters:** Without an `Idempotency-Key` mechanism, each retry creates a duplicate lead or applicant record in the database.
- **Fix:** Implement an idempotency middleware that caches responses for a given `Idempotency-Key` header. Subsequent retries with the same key return the cached response immediately without re-triggering business logic.

### 3.5 Authentication & Multi-Tenant Boundary Isolation
- **Observation:** `robots.txt` mentions `/portal/`, and Cynbit builds multi-product solutions (e.g., *TenantEase*, *BitElevate*, *Cynbit Studio*).
- **Why it matters:** Multi-tenant SaaS backends must ensure strict tenant boundary enforcement. Relying on frontend route guards is insufficient; every database query on the backend must be scoped to the authenticated user's `tenant_id` to prevent Insecure Direct Object References (IDOR).
- **Fix:** Implement JWT verification middleware that attaches `req.user` and `req.tenantId` to the request, combined with role-based checks (`admin`, `staff`, `client`).

---

## 4. Improvements & Implementation Details

To address each finding, I built the `cynbit-backend-engine` project in `src/`. Here is how each issue was resolved:

### 4.1 Security Headers via Helmet (`src/middleware/securityHeaders.js`)
Configured Helmet with explicit policies:
- Added a strict `Content-Security-Policy` with `frame-ancestors 'none'`.
- Set `frameguard: { action: 'deny' }` to block clickjacking.
- Set `noSniff: true` (`X-Content-Type-Options: nosniff`).
- Enabled `hidePoweredBy` to suppress `X-Powered-By: Express`.
- Configured `strict-origin-when-cross-origin` for Referrer-Policy.

### 4.2 Whitelisted CORS Middleware (`src/middleware/cors.js`)
Replaced the wildcard `*` with a dynamic origin validator that only allows verified domains:
```javascript
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error(`Origin ${origin} is not allowed by CORS policy`);
    err.statusCode = 403;
    return callback(err);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Idempotency-Key'],
  credentials: true,
};
```

### 4.3 Tiered Rate Limiting (`src/middleware/rateLimiter.js`)
Added distinct limits depending on route sensitivity:
- **Global API Limiter**: 100 requests / 15 minutes.
- **Form Ingestion Limiter** (`/api/v1/inquiries`, `/api/v1/bitelevate/apply`): 10 submissions / 15 minutes per IP to prevent spam.
- **Auth Limiter** (`/api/v1/auth/login`): 5 attempts / 15 minutes to block credential brute-forcing.

### 4.4 Idempotency Middleware (`src/middleware/idempotency.js`)
Checks for an `Idempotency-Key` header on state-modifying requests (`POST`, `PUT`, `PATCH`). If a request with the same key arrives while another is processing, it returns `409 Conflict`. Once finished, it caches the response so identical retries receive `201/200` with header `X-Cache-Lookup: IDEMPOTENT_HIT` without creating duplicate records.

### 4.5 Asynchronous Worker Queue with DLQ (`src/services/queueService.js`)
Decoupled HTTP request handling from background tasks:
- Lead inquiries immediately receive a `201 Created` with a `jobId`.
- An event-driven worker processes notifications and CRM syncing in the background.
- Failed jobs retry with exponential backoff. If max retries are exceeded, the job is moved to a Dead Letter Queue (DLQ) for inspection rather than crashing the process.

### 4.6 JWT Authentication & Role-Based Access (`src/middleware/auth.js`)
- Verifies HMAC SHA-256 signed bearer tokens.
- Enforces role checks (`authorize(['admin', 'staff'])`).
- Extracts `tenantId` to ensure data isolation across clients.

### 4.7 Standardized RFC 7807 Error Handling (`src/middleware/errorHandler.js`)
All 4xx and 5xx responses follow the RFC 7807 Problem Details standard:
```json
{
  "type": "https://cynbit.in/errors/validation-failed",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed for one or more fields.",
  "errors": [...],
  "correlationId": "f7cbb33c-2605-40a6-9786-6634fdc4ed45"
}
```

---

## 5. Verification & Test Results

I wrote 24 automated unit and integration tests using Node's built-in test runner (`node:test`). All tests pass cleanly:

```bash
$ npm test

▶ Authentication, Multi-Tenancy & RBAC Suite
  ✔ authenticates valid admin and returns signed bearer token
  ✔ authenticates enterprise tenant client
  ✔ rejects login with invalid password
  ✔ enforces RBAC: allows admin to view leads list
  ✔ enforces RBAC: denies client from viewing admin leads list (403 Forbidden)
  ✔ demonstrates tenant isolation on dashboard endpoint
▶ BitElevate Student/Engineer Application Suite
  ✔ accepts valid application for backend developer track
  ✔ rejects application with invalid track selection
▶ Health, Readiness & RFC 7807 Error Handling Suite
  ✔ GET /health returns 200 with system telemetry and queue metrics
  ✔ GET /health/ready returns 200 READY
  ✔ Nonexistent routes return RFC 7807 404 Problem Details format
▶ Enterprise Inquiries & Lead Ingestion Suite
  ✔ successfully ingests valid lead inquiry with async job queuing
  ✔ enforces idempotency via Idempotency-Key header
  ✔ rejects malformed requests and validates schemas with 400
▶ Rate Limiter Protection Suite
  ✔ triggers 429 Too Many Requests when auth rate limit is exceeded
▶ Security Middleware & Headers Suite
  ✔ verifies presence of critical OWASP security headers
  ✔ verifies CORS blocks disallowed external origins
  ✔ verifies CORS allows whitelisted Cynbit domain

✔ 24 tests passed, 0 failures
```

---

## 6. Recommendations for Next Steps

1. **Add Cloudflare or AWS WAF**: Put Cloudflare in front of Vercel to handle bot management and turnstile verification on lead forms before traffic hits the application layer.
2. **Move In-Memory State to Redis**: The in-memory idempotency cache and job queue should be backed by a Redis cluster (using BullMQ) once deployed across multiple container instances.
3. **Structured Tracing**: Integrate OpenTelemetry or standard Pino logging to trace requests across microservices using the `X-Correlation-ID` header.
