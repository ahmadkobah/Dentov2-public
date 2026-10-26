# Dento v2 — API BUILD_RULES Compliance Audit

> **Audit Date:** 2025-01-28
> **Scope:** All 51 files under `apps/api/src/` (config, plugins, utils, middleware, services, routes)
> **Reference:** `docs/planning/BUILD_RULES.md`

---

## Executive Summary

| Severity    |  Count | Description                                      |
| :---------- | -----: | :----------------------------------------------- |
| 🔴 CRITICAL |      1 | Runtime crash — code calls non-existent methods  |
| 🟠 HIGH     |     14 | Security / middleware chain / logging violations |
| 🟡 MEDIUM   |      9 | Naming, consistency, env reference issues        |
| 🔵 LOW      |      3 | Minor style / convention mismatches              |
| **Total**   | **27** |                                                  |

---

## Detailed Findings

---

### 🔴 CRITICAL — Runtime Crash

#### C-1. `notifications.route.ts` — Calls non-existent methods on `apiResponse`

**File:** `apps/api/src/tenant/routes/notifications/notifications.route.ts`
**Rule:** §3.6, §4.3
**Lines:** 248, 264, 281, 292, 303, 315, 328, 346, 357, 376, 400, 440, 476, 508, 530

**Description:**
`apiResponse` is exported from `utils/api-response.ts` as a **plain function** with signature `apiResponse(reply, statusCode, data, message?, meta?)`. However, `notifications.route.ts` calls it as an **object with methods**:

```typescript
// ACTUAL export (plain function):
export function apiResponse(reply, statusCode, data, message?, meta?) { ... }

// What notifications.route.ts calls (DOES NOT EXIST):
apiResponse.paginated(reply, notifications, { page, limit, total })  // L248
apiResponse.success(reply, { unreadCount: count })                   // L264
apiResponse.notFound(reply, 'Notification not found')                // L281
apiResponse.badRequest(reply, '...')                                 // ~L440
apiResponse.created(reply, { template })                             // ~L376
```

**Impact:** Every route handler in this file will throw `TypeError: apiResponse.paginated is not a function` at runtime. The entire notification module is non-functional.

**Fix:** Replace all `apiResponse.paginated(...)`, `apiResponse.success(...)`, `apiResponse.notFound(...)`, `apiResponse.badRequest(...)`, `apiResponse.created(...)` calls with the correct signatures:

- `apiResponse.paginated(reply, data, meta)` → `apiResponse(reply, 200, data, undefined, meta)`
- `apiResponse.success(reply, data)` → `apiResponse(reply, 200, data)`
- `apiResponse.notFound(reply, msg)` → `apiError(reply, 404, msg)`
- `apiResponse.badRequest(reply, msg)` → `apiError(reply, 400, msg)`
- `apiResponse.created(reply, data)` → `apiResponse(reply, 201, data)`

---

### 🟠 HIGH — Security & Middleware Chain Violations

#### H-1. `notifications.route.ts` — Missing middleware chain

**File:** `apps/api/src/tenant/routes/notifications/notifications.route.ts`
**Rule:** §5.4
**Lines:** Entire file (no `preHandler` on any route)

**Description:** No `authGuard`, `tenantDbMiddleware`, or `roleGuard` in any preHandler. The file manually casts `request` to access `.user.id`, `.tenantId`, and `.tenantDb` — these properties are only populated by the middleware chain. Without the chain, they will be `undefined`.

**Impact:** All notification routes are unauthenticated and will crash with `Cannot read property 'id' of undefined`.

---

#### H-2. `notifications.route.ts` — Wrong property names for request user

**File:** `apps/api/src/tenant/routes/notifications/notifications.route.ts`
**Rule:** §5.3
**Lines:** 237, 260, 275, 288, 299, 311

**Description:** Uses `request.user.id` instead of `request.user.userId` (as set by `authGuard`). Also uses `request.tenantId` (doesn't exist) — should access tenant info from `request.tenantDb` or the middleware-attached property.

---

#### H-3. `recurring.route.ts` — Missing middleware chain

**File:** `apps/api/src/tenant/routes/recurring/recurring.route.ts`
**Rule:** §5.4
**Lines:** Entire file (no `preHandler` on any route)

**Description:** No `authGuard`, `tenantDbMiddleware`, or `roleGuard`. The file directly accesses `request.tenantDb` via casting without the middleware that populates it.

**Impact:** All recurring rule endpoints are effectively unprotected.

---

#### H-4. `reports.route.ts` — `dashboardRoutes` missing middleware chain

**File:** `apps/api/src/tenant/routes/reports/reports.route.ts`
**Rule:** §5.4
**Lines:** ~90-400 (all dashboardRoutes handlers)

**Description:** The `dashboardRoutes` function registers 7+ endpoints without `authGuard`, `tenantDbMiddleware`, or `roleGuard` in preHandler. Uses manual `getTenantDb(request)` and `getUserId(request)` helpers that assume middleware has run.

---

#### H-5. `reports.route.ts` — `reportRoutes` missing middleware chain

**File:** `apps/api/src/tenant/routes/reports/reports.route.ts`
**Rule:** §5.4
**Lines:** ~400-894 (all reportRoutes handlers)

**Description:** Same as H-4 but for advanced report endpoints. No middleware chain protecting these premium endpoints.

---

#### H-6. `logger.ts` — Missing §21.3 redaction config

**File:** `apps/api/src/utils/logger.ts`
**Rule:** §21.3
**Lines:** 4-17 (entire Pino config)

**Description:** The Pino logger is configured without any `redact` option. §21.3 requires these fields to be redacted:

```
authorization, cookie, password, refreshToken, accessToken,
nationalId, policyNumber, ENCRYPTION_MASTER_KEY
```

**Fix:** Add to the Pino config:

```typescript
redact: {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'password',
    'refreshToken',
    'accessToken',
    'nationalId',
    'policyNumber',
    'ENCRYPTION_MASTER_KEY',
  ],
  censor: '[REDACTED]',
}
```

---

#### H-7. `impersonation.route.ts` — Uses `console.error` instead of Pino logger

**File:** `apps/api/src/platform/routes/impersonation/impersonation.route.ts`
**Rule:** §21.1
**Lines:** 151, 189, 252, 282, 320

**Description:** 5 instances of `console.error(...)` in catch blocks. §21.1 mandates Pino structured JSON logging exclusively. `console.error` bypasses log level filtering, structured output, and redaction.

---

#### H-8. `modules.route.ts` — Uses `console.error` instead of Pino logger

**File:** `apps/api/src/platform/routes/modules/modules.route.ts`
**Rule:** §21.1
**Lines:** 152, 223, 265, 292

**Description:** 4 instances of `console.error(...)` in catch blocks.

---

#### H-9. `support.route.ts` — Uses `console.error` instead of Pino logger

**File:** `apps/api/src/platform/routes/support/support.route.ts`
**Rule:** §21.1
**Lines:** 186, 244, 259, 298, 338, 353, 402, 432, 476

**Description:** 9 instances of `console.error(...)` across every catch block. Worst offender for this rule.

---

#### H-10. All platform routes — Manual role checks instead of `authGuard` + `roleGuard` middleware

**Files:**

- `apps/api/src/platform/routes/api-keys/api-keys.route.ts`
- `apps/api/src/platform/routes/backups/backups.route.ts`
- `apps/api/src/platform/routes/db-explorer/db-explorer.route.ts`
- `apps/api/src/platform/routes/impersonation/impersonation.route.ts`
- `apps/api/src/platform/routes/modules/modules.route.ts`
- `apps/api/src/platform/routes/payments/payments.route.ts`
- `apps/api/src/platform/routes/payments/stripe.route.ts`
- `apps/api/src/platform/routes/pricing/pricing.route.ts`
- `apps/api/src/platform/routes/rate-limits/rate-limits.route.ts`
- `apps/api/src/platform/routes/support/support.route.ts`
- `apps/api/src/platform/routes/versioning/versioning.route.ts`
- `apps/api/src/platform/routes/webhooks/webhooks.route.ts`

**Rule:** §5.4
**Pattern across all files:**

```typescript
const user = getUser(request);
if (!user || !['platform_admin'].includes(user.role)) {
  return apiError(reply, 403, '...');
}
```

**Description:** All 12 platform route files use manual inline role checks with a `getUser()` helper that casts `request.user` instead of using the `authGuard` → `roleGuard` middleware chain in preHandler. This means:

1. JWT verification depends on a previous hook having run (fragile)
2. Each handler re-implements auth logic (DRY violation)
3. Missed handlers get no protection at all

**Note:** This is a systemic pattern across the entire platform layer. While the inline checks _work_ if a global or parent auth hook is registered, they don't follow §5.4's prescribed pattern.

---

#### H-11. `avatar.route.ts` — Not registered in `server.ts`

**File:** `apps/api/src/tenant/routes/users/avatar.route.ts`
**Rule:** §3.5
**Server.ts:** Lines 139-176 (route registrations)

**Description:** `avatar.route.ts` is imported but **not registered** in `server.ts`. The import exists at line 48 (implicitly via other imports) but no `fastify.register(avatarRoutes, ...)` call appears in the routes section. The entire avatar upload/download feature is unreachable.

---

#### H-12. `payments.route.ts` + `stripe.route.ts` — Direct `process.env` access bypassing validated env

**Files:**

- `apps/api/src/platform/routes/payments/payments.route.ts` — Line 239
- `apps/api/src/platform/routes/payments/stripe.route.ts` — Line 189

**Rule:** §16 (security), implicit in env.ts pattern

**Description:**

```typescript
// payments.route.ts L239
const hmacSecret = process.env.PAYMOB_HMAC_SECRET || '';

// stripe.route.ts L189
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
```

Both files read `process.env` directly instead of importing from `config/env.ts`. While these specific vars _are_ defined in the env schema, accessing via `process.env` bypasses Zod validation. Additionally, the fallback to empty string `''` means webhooks can be processed **without signature verification** if the env var is missing.

---

#### H-13. `branding.route.ts` — `settingsRoutes` missing `tenantDbMiddleware`

**File:** `apps/api/src/tenant/routes/branding/branding.route.ts`
**Rule:** §5.4
**Lines:** Settings routes (registered at `/api/settings` prefix)

**Description:** The `settingsRoutes` export handles general clinic settings but does not use `tenantDbMiddleware` in its preHandler chain, relying on direct request casting to access tenant DB.

---

#### H-14. `env.ts` — Default secrets in production risk

**File:** `apps/api/src/config/env.ts`
**Rule:** §16 (general security)
**Lines:** 13-15

**Description:**

```typescript
PAYLOAD_SECRET: z.string().min(16).default('dev-payload-secret-change-me'),
JWT_ACCESS_SECRET: z.string().min(16).default('dev-jwt-access-secret-change-me'),
JWT_REFRESH_SECRET: z.string().min(16).default('dev-jwt-refresh-secret-change-me'),
```

Default secrets mean the app can start in production without real secrets being configured. These should have no defaults or should throw in production.

---

### 🟡 MEDIUM — Naming, Consistency, & Convention Violations

#### M-1. `socket.plugin.ts` — References non-existent `env.CORS_ORIGINS`

**File:** `apps/api/src/plugins/socket.plugin.ts`
**Rule:** Correctness (env schema)
**Line:** 96

**Description:** References `env.CORS_ORIGINS` (plural with S) but the env schema defines `env.CORS_ORIGIN` (singular). This will cause a TypeScript error or `undefined` at runtime.

---

#### M-2. `branding.route.ts` — Verb in URL path `POST /branding/reset`

**File:** `apps/api/src/tenant/routes/branding/branding.route.ts`
**Rule:** §3.2 ("No verbs in URL")
**Line:** ~219

**Description:** `POST /branding/reset` uses a verb ("reset") in the URL path. §3.2 says "No verbs in URL". Alternative: `DELETE /branding` or `PUT /branding/defaults`.

---

#### M-3. `server.ts` — Inconsistent route prefix patterns

**File:** `apps/api/src/server.ts`
**Rule:** §3.5
**Lines:** 140, 146, 151, 154

**Description:** Some routes use `/api` as prefix with internal path segments, while others use the full prefix:

```typescript
// Inconsistent (prefix is /api, internal routes define sub-paths):
await fastify.register(authRoutes, { prefix: '/api' }); // L140
await fastify.register(translationRoutes, { prefix: '/api' }); // L146
await fastify.register(brandingRoutes, { prefix: '/api' }); // L151
await fastify.register(versioningRoutes, { prefix: '/api' }); // L154

// Correct pattern (full prefix, routes use / internally):
await fastify.register(patientRoutes, { prefix: '/api/patients' });
await fastify.register(appointmentRoutes, { prefix: '/api/appointments' });
```

§3.5 prescribes: `app.register(featureRoutes, { prefix: '/api/feature' })`. The `/api`-only registrations require the route files to internally define path prefixes like `/auth/login`, `/translations/:locale`, `/branding`, etc., making the actual path opaque from `server.ts`.

---

#### M-4. `server.ts` — `dashboardRoutes` uses singular "dashboard"

**File:** `apps/api/src/server.ts`
**Rule:** §3.2 ("Plural nouns")
**Line:** 149

**Description:** Registered as `{ prefix: '/api/dashboard' }`. §3.2 requires plural nouns in URLs. Should be `/api/dashboards` or more accurately this is a feature namespace rather than a resource — acceptable if documented.

---

#### M-5. `server.ts` — `healthRoutes` registered without `/api` prefix

**File:** `apps/api/src/server.ts`
**Rule:** §3.1
**Line:** 139

**Description:** `healthRoutes` is registered without any prefix: `await fastify.register(healthRoutes)`. This puts the health endpoint at `/health` rather than `/api/health`. While health checks are conventionally at the root, this is inconsistent with §3.1 which defines all routes under `/api/{resource}`.

---

#### M-6. `payments.route.ts` — `POST /paymob/payments/:id/expire` uses verb in URL

**File:** `apps/api/src/platform/routes/payments/payments.route.ts`
**Rule:** §3.2
**Line:** 371

**Description:** "expire" is a verb in the URL path.

---

#### M-7. `payments.route.ts` + `stripe.route.ts` — `POST .../refund` uses verb in URL

**Files:**

- `apps/api/src/platform/routes/payments/payments.route.ts` — Line 401
- `apps/api/src/platform/routes/payments/stripe.route.ts` — Line 320

**Rule:** §3.2
**Description:** `POST /paymob/payments/:id/refund` and `POST /stripe/payments/:id/refund` use "refund" as a verb. Per §3.2, should use resource-style: `POST /paymob/payments/:id/refunds` (plural noun, the refund as a sub-resource).

---

#### M-8. API key routes — `POST /:id/revoke` and `POST /:id/rotate` use verbs

**File:** `apps/api/src/platform/routes/api-keys/api-keys.route.ts`
**Rule:** §3.2
**Lines:** 346, 395

**Description:** `POST /:id/revoke` and `POST /:id/rotate` use verbs in URL. Should be e.g. `PATCH /:id/status` (for revoke) and `POST /:id/rotations` (for rotate).

---

#### M-9. `support.route.ts` — No Zod validation on query params for list routes

**File:** `apps/api/src/platform/routes/support/support.route.ts`
**Rule:** §7.3
**Lines:** 126-149

**Description:** The `GET /tickets` endpoint extracts query params via raw `request.query as { ... }` without Zod validation. Query filter values like `status`, `priority`, `category` are not validated. Contrast with other list endpoints that use Zod query schemas properly.

---

### 🔵 LOW — Minor / Stylistic

#### L-1. `env.ts` — Uses `console.error` for env parse failure

**File:** `apps/api/src/config/env.ts`
**Rule:** §21.1
**Line:** 58

**Description:** Uses `console.error('❌ Invalid environment variables:', ...)` instead of Pino logger. **Justified exception:** Logger depends on env being parsed first, so logger is unavailable at this point. Acceptable but should be documented with a comment explaining why.

---

#### L-2. `health.route.ts` — Uses `process.env.NODE_ENV` directly

**File:** `apps/api/src/tenant/routes/health/health.route.ts`
**Rule:** Consistency
**Line:** 10

**Description:** `environment: process.env.NODE_ENV || 'development'` — all other files use `env.NODE_ENV` from the validated config. Minor inconsistency.

---

#### L-3. `versioning.route.ts` — Search query not sanitized for regex injection

**File:** `apps/api/src/platform/routes/versioning/versioning.route.ts`
**Rule:** §16 (input sanitization)
**Line:** 168

**Description:**

```typescript
{ slug: { $regex: query.search, $options: 'i' } }
```

User-supplied `query.search` is passed directly to MongoDB `$regex` without escaping special regex characters. Contrast with `support.route.ts` which does:

```typescript
const safeSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

---

## Summary Table

| #    | Severity    | File                               | Line(s)                             | Rule        | Description                                                                                       |
| :--- | :---------- | :--------------------------------- | :---------------------------------- | :---------- | :------------------------------------------------------------------------------------------------ |
| C-1  | 🔴 CRITICAL | notifications.route.ts             | 248,264,281+                        | §3.6        | Calls non-existent `apiResponse.paginated()`, `.success()`, `.notFound()` etc. — runtime crash    |
| H-1  | 🟠 HIGH     | notifications.route.ts             | all                                 | §5.4        | Missing authGuard / tenantDbMiddleware / roleGuard chain                                          |
| H-2  | 🟠 HIGH     | notifications.route.ts             | 237,260,275+                        | §5.3        | Uses `request.user.id` (wrong) instead of `request.user.userId`                                   |
| H-3  | 🟠 HIGH     | recurring.route.ts                 | all                                 | §5.4        | Missing authGuard / tenantDbMiddleware / roleGuard chain                                          |
| H-4  | 🟠 HIGH     | reports.route.ts                   | 90-400                              | §5.4        | `dashboardRoutes` missing middleware chain                                                        |
| H-5  | 🟠 HIGH     | reports.route.ts                   | 400-894                             | §5.4        | `reportRoutes` missing middleware chain                                                           |
| H-6  | 🟠 HIGH     | logger.ts                          | 4-17                                | §21.3       | Missing Pino redaction for sensitive fields                                                       |
| H-7  | 🟠 HIGH     | impersonation.route.ts             | 151,189,252,282,320                 | §21.1       | 5× `console.error` instead of Pino                                                                |
| H-8  | 🟠 HIGH     | modules.route.ts                   | 152,223,265,292                     | §21.1       | 4× `console.error` instead of Pino                                                                |
| H-9  | 🟠 HIGH     | support.route.ts                   | 186,244,259,298,338,353,402,432,476 | §21.1       | 9× `console.error` instead of Pino                                                                |
| H-10 | 🟠 HIGH     | 12 platform route files            | various                             | §5.4        | Manual inline role checks instead of authGuard + roleGuard middleware                             |
| H-11 | 🟠 HIGH     | avatar.route.ts / server.ts        | —                                   | §3.5        | avatar.route.ts imported but never registered — feature unreachable                               |
| H-12 | 🟠 HIGH     | payments.route.ts, stripe.route.ts | 239, 189                            | §16         | Direct `process.env` access bypassing validated env; empty fallback disables webhook verification |
| H-13 | 🟠 HIGH     | branding.route.ts                  | settings                            | §5.4        | `settingsRoutes` missing `tenantDbMiddleware`                                                     |
| H-14 | 🟠 HIGH     | env.ts                             | 13-15                               | §16         | Default secrets allow production start without real secrets                                       |
| M-1  | 🟡 MEDIUM   | socket.plugin.ts                   | 96                                  | env schema  | References `env.CORS_ORIGINS` (doesn't exist; should be `CORS_ORIGIN`)                            |
| M-2  | 🟡 MEDIUM   | branding.route.ts                  | ~219                                | §3.2        | `POST /branding/reset` — verb in URL                                                              |
| M-3  | 🟡 MEDIUM   | server.ts                          | 140,146,151,154                     | §3.5        | Inconsistent prefix patterns (some use `/api` with internal sub-paths)                            |
| M-4  | 🟡 MEDIUM   | server.ts                          | 149                                 | §3.2        | `/api/dashboard` — singular noun (should be plural per §3.2)                                      |
| M-5  | 🟡 MEDIUM   | server.ts                          | 139                                 | §3.1        | `healthRoutes` at `/health` without `/api` prefix                                                 |
| M-6  | 🟡 MEDIUM   | payments.route.ts                  | 371                                 | §3.2        | `POST .../expire` — verb in URL                                                                   |
| M-7  | 🟡 MEDIUM   | payments.route.ts, stripe.route.ts | 401, 320                            | §3.2        | `POST .../refund` — verb in URL                                                                   |
| M-8  | 🟡 MEDIUM   | api-keys.route.ts                  | 346, 395                            | §3.2        | `POST /:id/revoke`, `POST /:id/rotate` — verbs in URL                                             |
| M-9  | 🟡 MEDIUM   | support.route.ts                   | 126-149                             | §7.3        | No Zod validation on query params for ticket list                                                 |
| L-1  | 🔵 LOW      | env.ts                             | 58                                  | §21.1       | `console.error` at startup (justified — logger unavailable)                                       |
| L-2  | 🔵 LOW      | health.route.ts                    | 10                                  | consistency | `process.env.NODE_ENV` instead of `env.NODE_ENV`                                                  |
| L-3  | 🔵 LOW      | versioning.route.ts                | 168                                 | §16         | Unsanitized regex in MongoDB `$regex` query                                                       |

---

## Files That Passed Audit (No Violations)

The following files showed no BUILD_RULES violations:

| Category        | Files                                                                                                                                                       |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config          | `database.ts`, `redis.ts`, `constants.ts`                                                                                                                   |
| Plugins         | `cors.plugin.ts`, `helmet.plugin.ts`, `rate-limit.plugin.ts`, `swagger.plugin.ts`                                                                           |
| Utils           | `encryption.ts`, `jwt.ts`                                                                                                                                   |
| Middleware      | `auth-guard.ts`, `tenant-db.ts`, `role-guard.ts`, `audit-logger.ts`, `brute-force.ts`, `input-sanitizer.ts`, `index.ts`                                     |
| Tenant Services | `patient.service.ts`, `appointment.service.ts`, `doctor-sync.service.ts`                                                                                    |
| Global Services | `avatar-upload.service.ts`, `notification.service.ts`, `recurring-appointments.service.ts`                                                                  |
| Tenant Routes   | `patients.route.ts` ✅, `appointments.route.ts` ✅, `appointment-types.route.ts` ✅, `waitlist.route.ts` ✅, `auth.route.ts` ✅, `translations.route.ts` ✅ |
| Platform Routes | `rate-limits.route.ts` ✅ (aside from H-10 systemic pattern)                                                                                                |

---

## Recommended Priority Order for Fixes

1. **C-1** — `notifications.route.ts` non-existent methods (blocks entire feature)
2. **H-1 + H-2** — `notifications.route.ts` middleware chain + property names
3. **H-3** — `recurring.route.ts` middleware chain
4. **H-4 + H-5** — `reports.route.ts` middleware chains
5. **H-6** — `logger.ts` add Pino redaction config
6. **H-11** — Register `avatar.route.ts` in server.ts
7. **H-12** — Use `env.PAYMOB_HMAC_SECRET` / `env.STRIPE_WEBHOOK_SECRET` instead of `process.env`
8. **H-7 + H-8 + H-9** — Replace all `console.error` with `logger.error` (18 instances total)
9. **H-10** — Refactor platform routes to use `authGuard` + `roleGuard` in preHandler
10. **H-13** — Add `tenantDbMiddleware` to `settingsRoutes`
11. **H-14** — Remove default secrets or add production guard
12. **M-1** — Fix `env.CORS_ORIGINS` → `env.CORS_ORIGIN` in socket plugin
13. **M-2 through M-8** — URL naming fixes (can batch)
14. **M-9** — Add Zod query schema to support ticket list
15. **L-1 through L-3** — Low-priority cleanups
