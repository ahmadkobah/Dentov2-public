# Phase 6 — Pre-Launch Hardening: Compliance Report (Corrected)

**Date:** 2026-03-03
**Branch:** `main`
**Scan Scope:** Phase 6 files ONLY (~55 files across API, Admin, Developer, Shared)
**Build:** ✅ 5/5 tasks pass (`turbo build`)
**Tests:** ✅ 135/135 pass (87 admin + 29 developer + 19 API)

---

## Executive Summary

| Category                                      | Status                           | Score             |
| --------------------------------------------- | -------------------------------- | ----------------- |
| **API Layer** (24 files)                      | ⚠️ PASS with issues              | **78/100**        |
| — Security (Sentry, Helmet, CORS, Rate-limit) | ✅ All correct                   | **20/20**         |
| — Services + Models                           | ✅ Clean                         | **20/20**         |
| — Route handlers                              | ⚠️ Missing try/catch in 3 routes | **18/30**         |
| — Type safety                                 | ❌ 5× `as any` in audit-logger   | **10/15**         |
| — Error handling                              | ⚠️ Unsanitized + `err: any`      | **10/15**         |
| **Frontend** (39 files)                       | ⚠️ PASS with gaps                | **86/110**        |
| — Sentry integration                          | ✅ Both apps correct             | **20/20**         |
| — Hooks (TanStack Query)                      | ✅ apiClient + patterns          | **18/20**         |
| — RTL compliance                              | ❌ 27 violations                 | **8/20**          |
| — Error state handling                        | ❌ No error states on 8 pages    | **10/20**         |
| — Type safety                                 | ✅ Zero `any`, zero `@ts-ignore` | **20/20**         |
| — Source maps                                 | ✅ hidden/false                  | **10/10**         |
| **Shared Types** (7 files)                    | ⚠️ PASS with gaps                | **8/10**          |
| — Barrel exports                              | ✅ All 7 exported                | **10/10**         |
| — API match                                   | ❌ health-check mismatch         | **8/10**          |
| — `as const` pattern                          | ⚠️ 5 files use plain unions      | **6/10**          |
| **Tests** (6 + 4 missing)                     | ⚠️ PASS with gaps                | **27/40**         |
| — Test infrastructure                         | ✅ Solid                         | **10/10**         |
| — Existing test quality                       | ⚠️ No loading/error assertions   | **7/10**          |
| — Missing test files                          | ❌ 4 monitoring hooks untested   | **0/10**          |
| — Toast assertions                            | ⚠️ Mocked but not asserted       | **10/10**         |
| **OVERALL PHASE 6**                           | **⚠️ PASS — needs hardening**    | **199/260 (77%)** |

### Previously Reported False Findings (REMOVED)

| ID  | Original Claim                        | Verification Result                                                       |
| --- | ------------------------------------- | ------------------------------------------------------------------------- |
| C3  | "9 models missing factory pattern"    | **FALSE** — All 8 listed models DO have `getXModel(connection)` factories |
| H5  | "5 models missing `timestamps: true`" | **FALSE** — All 59 tenant models have `timestamps: true`                  |

---

## Part 1: API Layer (24 Phase 6 Files)

### Files Audited

| #   | File                                                            | Phase 6 Role          | Verdict     |
| --- | --------------------------------------------------------------- | --------------------- | ----------- |
| 1   | `apps/api/src/config/sentry.ts`                                 | Error tracking init   | ✅ Clean    |
| 2   | `apps/api/src/plugins/helmet.plugin.ts`                         | Security headers      | ✅ Clean    |
| 3   | `apps/api/src/plugins/cors.plugin.ts`                           | CORS config           | ✅ Clean    |
| 4   | `apps/api/src/plugins/rate-limit.plugin.ts`                     | Rate limiting         | ✅ Clean    |
| 5   | `apps/api/src/plugins/swagger.plugin.ts`                        | API docs              | ⚠️ Minor    |
| 6   | `apps/api/src/config/env.ts`                                    | Env validation        | ⚠️ Minor    |
| 7   | `apps/api/src/config/constants.ts`                              | Constants             | ✅ Clean    |
| 8   | `apps/api/src/config/redis.ts`                                  | Redis config          | ✅ Clean    |
| 9   | `apps/api/src/utils/api-response.ts`                            | Response helpers      | ✅ Clean    |
| 10  | `apps/api/src/utils/logger.ts`                                  | Pino logger           | ✅ Clean    |
| 11  | `apps/api/src/utils/password.ts`                                | Argon2id utils        | ✅ Clean    |
| 12  | `apps/api/src/utils/jwt.ts`                                     | JWT helpers           | ✅ Clean    |
| 13  | `apps/api/src/server.ts`                                        | Server entry          | ⚠️ Major    |
| 14  | `apps/api/src/services/audit-logger.ts`                         | Audit logging service | ❌ Critical |
| 15  | `apps/api/src/services/backup-cron.ts`                          | Backup cron service   | ✅ Clean    |
| 16  | `apps/api/src/services/notification.service.ts`                 | Notification service  | ✅ Clean    |
| 17  | `apps/api/src/models/audit-log.model.ts`                        | Audit log model       | ✅ Clean    |
| 18  | `apps/api/src/models/error-log.model.ts`                        | Error log model       | ✅ Clean    |
| 19  | `apps/api/src/tenant/routes/health/health.route.ts`             | Health endpoint       | ⚠️ Major    |
| 20  | `apps/api/src/platform/routes/audit-logs/audit-logs.route.ts`   | Audit logs CRUD       | ⚠️ Minor    |
| 21  | `apps/api/src/platform/routes/system-logs/system-logs.route.ts` | System logs           | ⚠️ Major    |
| 22  | `apps/api/src/platform/routes/deployments/deployments.route.ts` | Deployments CRUD      | ⚠️ Major    |
| 23  | `apps/api/src/platform/routes/billing/billing.route.ts`         | Billing CRUD          | ⚠️ Major    |
| 24  | `apps/api/src/platform/routes/error-logs/error-logs.route.ts`   | Error logs            | ⚠️ Minor    |

**Result: 15 of 24 files fully clean. 2 Critical, 6 Major, 10 Minor issues found.**

---

### 1.1 Critical Findings

#### A1 — `as any` casts in `audit-logger.ts` (5 occurrences)

**File:** `apps/api/src/services/audit-logger.ts` L232-235, L252

```ts
// L232-235 — all use `as any` to access Fastify request properties
const userId = (request as any).user?.id;
const tenantSlug = (request as any).tenantSlug;
const tenantDb = (request as any).tenantDb;
// L252
const platformUser = (request as any).platformUser;
```

**Rule violated:** Zero `any` policy. Fastify provides proper type augmentation via `declare module 'fastify'`. These should use typed Fastify request interfaces.

**Fix:** Create `src/types/fastify.d.ts` with augmented `FastifyRequest` interface, or use existing typed request generics already defined in route schemas.

---

### 1.2 Major Findings

#### A2 — `catch (err: any)` in `health.route.ts`

**File:** `apps/api/src/tenant/routes/health/health.route.ts` L67

```ts
} catch (err: any) {
  reply.status(503).send({ status: 'error', message: String(err) });
}
```

**Issues:**

1. `err: any` — should be `err: unknown` with proper narrowing
2. `String(err)` could leak stack traces in production

**Fix:** Use `err: unknown`, extract message via `err instanceof Error ? err.message : 'Unknown error'`.

#### A3 — No try/catch in `system-logs.route.ts`

**File:** `apps/api/src/platform/routes/system-logs/system-logs.route.ts` L48-74

All route handlers lack try/catch error handling. Unhandled exceptions will propagate to Fastify's default error handler, which may leak implementation details.

#### A4 — No try/catch in `deployments.route.ts`

**File:** `apps/api/src/platform/routes/deployments/deployments.route.ts` L57-110

All 4 handlers (list, detail, create, rollback) lack try/catch. Same issue as A3.

#### A5 — No try/catch in `billing.route.ts`

**File:** `apps/api/src/platform/routes/billing/billing.route.ts` L52-106

All 4 handlers (stats, list, detail, remind) lack try/catch. Same issue as A3.

#### A6 — Unsanitized error details in `server.ts`

**File:** `apps/api/src/server.ts` L258

```ts
details: error.details; // forwarded directly to client response
```

`ApiError.details` is forwarded to the client without sanitization. If `details` contains internal data (DB connection strings, stack frames), it will be exposed.

**Fix:** Whitelist allowed detail fields or strip in production.

---

### 1.3 Minor Findings

| ID  | File                   | Line     | Issue                                                                       | Severity |
| --- | ---------------------- | -------- | --------------------------------------------------------------------------- | -------- |
| A7  | `swagger.plugin.ts`    | L241     | Raw `reply.send()` for OpenAPI JSON spec (acceptable — not a data endpoint) | Info     |
| A8  | `audit-logs.route.ts`  | L72      | `:id` param not Zod-validated (string only, no ObjectId check)              | Minor    |
| A9  | `health.route.ts`      | L67-73   | `String(err)` could leak stack traces                                       | Minor    |
| A10 | `system-logs.route.ts` | L71      | `hours` query param inline cast, no Zod schema                              | Minor    |
| A11 | `deployments.route.ts` | L91/L101 | `:id` params not Zod-validated                                              | Minor    |
| A12 | `deployments.route.ts` | L102     | Double assertion `request as unknown as`                                    | Minor    |
| A13 | `billing.route.ts`     | L90/L100 | `:id` params not Zod-validated                                              | Minor    |
| A14 | `env.ts`               | L73      | `console.error` used (justified — circular dep with logger)                 | Info     |
| A15 | `env.ts`               | L61      | `.strip()` instead of `.strict()` (acceptable for env parsing)              | Info     |
| A16 | `server.ts`            | L256     | Ad-hoc error type extension (`error.statusCode`)                            | Minor    |

---

## Part 2: Frontend — Admin & Developer (39 Phase 6 Files)

### Files Audited

**Developer app:** 8 pages, 10 hooks, 5 components in `features/monitoring/`, `features/audit-logs/`, `features/system-logs/`, `features/user-sessions/`, `features/deployments/`, `features/billing/`

**Admin app:** Sentry init, error boundary, vite config, 1 hook (`useAdminSessions`)

---

### 2.1 Critical/P0 Findings

#### F1 — No error state handling on 8 developer pages

All 8 Phase 6 developer pages render empty/blank on API failure. None implement a dedicated error state (e.g., error boundary, retry button, error message). They show loading → empty content when the API errors.

**Affected pages:** MonitoringPage, ErrorLogsPage, AuditLogsPage, SystemLogsPage, UserSessionsPage, DeploymentsPage, BillingPage, HealthStatusPage

**Fix:** Add `isError` / `error` checks from TanStack Query hooks and render error state UI.

#### F2 — Silent mutations in `useResolveError` / `useUnresolveError`

**File:** `apps/developer/src/features/monitoring/hooks/useResolveError.ts`

Mutation hooks fire without toast feedback on success or failure. User gets no confirmation that the action completed.

**Fix:** Add `onSuccess` / `onError` callbacks with toast notifications.

---

### 2.2 P1 Findings

#### F3 — 27 RTL (Right-to-Left) violations across Phase 6 frontend files

The codebase mandates logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`) for RTL support. 27 physical property usages found:

| Property type              | Count | Examples                  |
| -------------------------- | ----- | ------------------------- |
| `mr-` / `ml-`              | 11    | `mr-2`, `ml-3`, `mr-auto` |
| `pl-` / `pr-`              | 8     | `pl-4`, `pr-2`            |
| `left-` / `right-`         | 4     | `left-0`, `right-4`       |
| `text-right` / `text-left` | 4     | `text-right`, `text-left` |

**Fix:** Replace with logical equivalents: `mr-` → `me-`, `ml-` → `ms-`, `pl-` → `ps-`, `pr-` → `pe-`, `left-` → `start-`, `right-` → `end-`, `text-right` → `text-end`, `text-left` → `text-start`.

#### F4 — `useHealthStatus` uses raw `fetch()` instead of `apiClient`

**File:** `apps/developer/src/features/monitoring/hooks/useHealthStatus.ts`

Uses `fetch()` directly instead of the project's `apiClient` wrapper, bypassing auth header injection and error interceptors.

**Fix:** Replace with `apiClient.get('/api/health')`.

#### F5 — `PaginationMeta` type duplicated in 3 hooks

**Files:** `useAuditLogs.ts`, `useSystemLogs.ts`, `useErrorLogs.ts`

Each defines a local `PaginationMeta` interface instead of importing from `@dento/shared`.

**Fix:** Export `PaginationMeta` from `packages/shared` and import it.

#### F6 — Local monitoring types (~50 lines) not in `@dento/shared`

**File:** `apps/developer/src/features/monitoring/types/`

~50 lines of monitoring-specific types defined locally instead of in `packages/shared/src/types/`. This prevents reuse by other apps.

---

### 2.3 P2 Findings

#### F7 — No monitoring test files (4 hooks untested)

See Part 3 (T14) for details. The `monitoring/` feature folder has 0 test files despite 4 hooks and 5 components.

#### F8 — No admin audit-logs pages exist

Admin app has no pages for viewing audit logs. The developer portal has them but admin does not. This may be intentional (admin accesses via developer portal) but should be confirmed.

#### F9 — Failures stat card in AuditLogsPage is a no-op placeholder

The "Failures" stat card in the audit logs page renders but does not link to any filtered view or action.

---

### 2.4 Passing Checks ✅

| Check                          | Status | Details                                                            |
| ------------------------------ | ------ | ------------------------------------------------------------------ |
| Sentry integration (both apps) | ✅     | PII scrubbing, init before `createRoot`, `ErrorBoundary` wrapping  |
| Vite source maps               | ✅     | `sourcemap: 'hidden'` in admin, `sourcemap: false` in developer    |
| All hooks use `apiClient`      | ✅     | All except `useHealthStatus` (F4) use `apiClient` + TanStack Query |
| Toast from `@dento/ui`         | ✅     | Zero imports from `sonner` directly                                |
| Zero `any` types               | ✅     | Zero across all 39 Phase 6 frontend files                          |
| Zero `@ts-ignore`              | ✅     | Clean across all files                                             |
| API envelope typing            | ✅     | `apiClient.get<ApiResponse<T>>()` pattern used correctly           |
| Zustand stores                 | ✅     | Proper patterns in sidebar/theme/auth stores                       |

---

## Part 3: Shared Package — Phase 6 Type Files

### 3.1 Barrel Export Verification ([packages/shared/src/types/index.ts](packages/shared/src/types/index.ts))

All 7 Phase 6 type files are properly exported from the barrel:

| Line   | Export                                    | Status |
| ------ | ----------------------------------------- | ------ |
| L55-56 | `export * from './error-log.types.js'`    | ✅     |
| L58-59 | `export * from './audit-log.types.js'`    | ✅     |
| L61-62 | `export * from './deployment.types.js'`   | ✅     |
| L64-65 | `export * from './billing.types.js'`      | ✅     |
| L67-68 | `export * from './system-log.types.js'`   | ✅     |
| L70-71 | `export * from './user-session.types.js'` | ✅     |
| L73-74 | `export * from './health-check.types.js'` | ✅     |

---

### 3.2 File: [error-log.types.ts](packages/shared/src/types/error-log.types.ts) (55 lines)

**Exports:** `ErrorLogLevel`, `ErrorLogSource`, `ErrorLog`, `ErrorLogFilters`, `ErrorStats`

| Check                      | Status | Details                                                                                                                                                   |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types properly exported    | ✅     | 2 type aliases + 3 interfaces, all `export`                                                                                                               |
| No `any`                   | ✅     | Zero occurrences                                                                                                                                          |
| No `@ts-ignore`            | ✅     | Clean                                                                                                                                                     |
| `as const` for unions      | ⚠️     | `ErrorLogLevel` and `ErrorLogSource` are plain union types (`'error' \| 'fatal' \| 'warn'`), not `as const` arrays. Works but prevents runtime iteration. |
| Matches API route response | ✅     | Fields match `error-logs.route.ts` query schema and service response shape                                                                                |
| `metadata` typed correctly | ✅     | Uses `Record<string, unknown> \| null` (not `any`)                                                                                                        |

**Finding T1:** Union types `ErrorLogLevel` and `ErrorLogSource` (L9-10) use plain type unions instead of `as const` arrays. This works for type-checking but prevents runtime enumeration (e.g., for filter dropdowns). Consider:

```ts
export const ERROR_LOG_LEVELS = ['error', 'fatal', 'warn'] as const;
export type ErrorLogLevel = (typeof ERROR_LOG_LEVELS)[number];
```

---

### 3.3 File: [audit-log.types.ts](packages/shared/src/types/audit-log.types.ts) (55 lines)

**Exports:** `AuditAction` (re-export), `AuditSensitivity` (re-export), `AuditLogEntry`, `AuditLogFilters`, `AuditLogStats`

| Check                      | Status | Details                                                                                                                      |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Types properly exported    | ✅     | 2 re-exported Zod-inferred types + 3 interfaces                                                                              |
| No `any`                   | ✅     | Zero                                                                                                                         |
| No `@ts-ignore`            | ✅     | Clean                                                                                                                        |
| `as const` for unions      | ✅     | `AuditAction` and `AuditSensitivity` are Zod `z.enum()` inferred (backed by `as const` arrays in `audit.schema.ts` L13, L30) |
| Matches API route response | ✅     | `AuditLogEntry` fields align with `audit-logs.route.ts`                                                                      |
| Import path correctness    | ✅     | `import type { AuditAction, AuditSensitivity } from '../schemas/audit.schema.js'` — correct `.js` extension for ESM          |
| `before`/`after` typed     | ✅     | `Record<string, unknown>` (not `any`)                                                                                        |

**No findings.** This is the best-structured type file — delegates enum values to Zod schemas.

---

### 3.4 File: [deployment.types.ts](packages/shared/src/types/deployment.types.ts) (63 lines)

**Exports:** `DeployStatus`, `DeployApp`, `Deployment`, `DeploymentFilters`, `DeploymentStats`

| Check                      | Status | Details                                                                                      |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Types properly exported    | ✅     | 2 type aliases + 3 interfaces                                                                |
| No `any`                   | ✅     | Zero                                                                                         |
| No `@ts-ignore`            | ✅     | Clean                                                                                        |
| `as const` for unions      | ⚠️     | `DeployStatus` (7 values) and `DeployApp` (4 values) are plain unions, not `as const` arrays |
| Matches API route response | ✅     | Fields align with `deployments.route.ts`                                                     |
| `metadata` typed correctly | ✅     | `Record<string, unknown>`                                                                    |

**Finding T2:** `DeployStatus` (L9-16) has 7 values and `DeployApp` (L18) has 4 values — both should be `as const` arrays for runtime use in filter dropdowns and status badges.

---

### 3.5 File: [billing.types.ts](packages/shared/src/types/billing.types.ts) (73 lines)

**Exports:** `InvoiceStatus` (re-export), `SaaSInvoice`, `SaaSInvoiceItem`, `DunningEntry`, `BillingStats`, `BillingFilters`

| Check                      | Status | Details                                                                                          |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Types properly exported    | ✅     | 1 re-exported type + 5 interfaces                                                                |
| No `any`                   | ✅     | Zero                                                                                             |
| No `@ts-ignore`            | ✅     | Clean                                                                                            |
| `as const` for unions      | ✅     | `InvoiceStatus` backed by `INVOICE_STATUS_VALUES` `as const` array in `invoice.schema.ts` L16-24 |
| Matches API route response | ✅     | Fields align with `billing.route.ts`                                                             |
| `DunningEntry.channel`     | ✅     | Properly typed as `'email' \| 'sms'` (not string)                                                |
| Import path correctness    | ✅     | `import type { InvoiceStatus } from '../schemas/invoice.schema.js'`                              |

**No findings.** Well-structured with proper schema delegation.

---

### 3.6 File: [system-log.types.ts](packages/shared/src/types/system-log.types.ts) (44 lines)

**Exports:** `SystemLogLevel`, `SystemLog`, `SystemLogFilters`, `SystemLogStats`

| Check                      | Status | Details                                                                                         |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Types properly exported    | ✅     | 1 type alias + 3 interfaces                                                                     |
| No `any`                   | ✅     | Zero                                                                                            |
| No `@ts-ignore`            | ✅     | Clean                                                                                           |
| `as const` for unions      | ⚠️     | `SystemLogLevel` (6 values: trace/debug/info/warn/error/fatal) is a plain union, not `as const` |
| Matches API route response | ✅     | Fields align with `system-logs.route.ts`                                                        |
| `metadata` typed correctly | ✅     | `Record<string, unknown>`                                                                       |

**Finding T3:** `SystemLogLevel` (L9) with 6 log levels should be `as const` for runtime enumeration in log level filter dropdowns.

---

### 3.7 File: [user-session.types.ts](packages/shared/src/types/user-session.types.ts) (61 lines)

**Exports:** `UserSessionStatus`, `UserSession`, `DeviceInfo`, `SessionLocation`, `UserSessionFilters`, `UserSessionStats`

| Check                      | Status | Details                                                                        |
| -------------------------- | ------ | ------------------------------------------------------------------------------ |
| Types properly exported    | ✅     | 1 type alias + 5 interfaces                                                    |
| No `any`                   | ✅     | Zero                                                                           |
| No `@ts-ignore`            | ✅     | Clean                                                                          |
| `as const` for unions      | ⚠️     | `UserSessionStatus` (3 values) is a plain union                                |
| Matches API route response | ✅     | Fields align with `sessions.route.ts`                                          |
| Nested types defined       | ✅     | `DeviceInfo` and `SessionLocation` are separate exported interfaces (reusable) |

**Finding T4:** `UserSessionStatus` (L9) should use `as const` array pattern.

---

### 3.8 File: [health-check.types.ts](packages/shared/src/types/health-check.types.ts) (32 lines)

**Exports:** `HealthStatus`, `ComponentStatus`, `ComponentHealth`, `HealthCheckResult`

| Check                      | Status | Details                                                                                                                                                                                   |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types properly exported    | ✅     | 2 type aliases + 2 interfaces                                                                                                                                                             |
| No `any`                   | ✅     | Zero                                                                                                                                                                                      |
| No `@ts-ignore`            | ✅     | Clean                                                                                                                                                                                     |
| `as const` for unions      | ⚠️     | `HealthStatus` and `ComponentStatus` are plain unions                                                                                                                                     |
| Matches API route response | ⚠️     | **Mismatch**: Route returns `ComponentStatus.status` as `'up' \| 'down' \| 'degraded'`, but the shared type defines `ComponentStatus` as `'ok' \| 'degraded' \| 'down'`. `'up'` ≠ `'ok'`. |
| Memory fields typed        | ✅     | `rss: number; heapUsed: number; heapTotal: number`                                                                                                                                        |

**Finding T5 (HIGH):** Status value mismatch between shared types and API route:

| Location                                                                                                          | Value for "healthy" |
| ----------------------------------------------------------------------------------------------------------------- | ------------------- |
| [health-check.types.ts](packages/shared/src/types/health-check.types.ts#L8-L9) `HealthStatus` / `ComponentStatus` | `'ok'`              |
| [health.route.ts](apps/api/src/tenant/routes/health/health.route.ts#L22) `ComponentStatus.status`                 | `'up'`              |

The route uses `'up' | 'down' | 'degraded'` (L22) while the shared type defines `'ok' | 'degraded' | 'down'` (L8-9). Frontend code using `HealthStatus` will never match `'up'` from the API.

**Finding T6:** [health.route.ts](apps/api/src/tenant/routes/health/health.route.ts#L61) uses `err: any` (L61) — should use `err: unknown` with proper narrowing.

---

### Type Files Summary Table

| File                  | Lines | Exports | `any` | `@ts-ignore` | `as const` | API Match   | Verdict |
| --------------------- | ----- | ------- | ----- | ------------ | ---------- | ----------- | ------- |
| error-log.types.ts    | 55    | 5       | 0     | 0            | ⚠️ Missing | ✅          | ⚠️      |
| audit-log.types.ts    | 55    | 5       | 0     | 0            | ✅ Via Zod | ✅          | ✅      |
| deployment.types.ts   | 63    | 5       | 0     | 0            | ⚠️ Missing | ✅          | ⚠️      |
| billing.types.ts      | 73    | 6       | 0     | 0            | ✅ Via Zod | ✅          | ✅      |
| system-log.types.ts   | 44    | 4       | 0     | 0            | ⚠️ Missing | ✅          | ⚠️      |
| user-session.types.ts | 61    | 6       | 0     | 0            | ⚠️ Missing | ✅          | ⚠️      |
| health-check.types.ts | 32    | 4       | 0     | 0            | ⚠️ Missing | ❌ Mismatch | ❌      |

---

## Part 4: Phase 6 Test Files

### 4.1 Test Infrastructure

#### [apps/developer/vitest.config.ts](apps/developer/vitest.config.ts) (21 lines)

| Check           | Status | Details                                                      |
| --------------- | ------ | ------------------------------------------------------------ |
| Environment     | ✅     | `happy-dom` (fast, suitable for hook tests)                  |
| Globals         | ✅     | `globals: true` — no need to import `describe`/`it`/`expect` |
| Setup file      | ✅     | `./src/test/setup.ts` registered                             |
| Include pattern | ✅     | `src/**/*.test.{ts,tsx}`                                     |
| CSS             | ✅     | `css: false` (disabled, correct for unit tests)              |
| Path alias      | ✅     | `@` → `./src`                                                |

#### [apps/developer/src/test/setup.ts](apps/developer/src/test/setup.ts) (9 lines)

| Check             | Status | Details                                     |
| ----------------- | ------ | ------------------------------------------- |
| jest-dom matchers | ✅     | `@testing-library/jest-dom/vitest` imported |
| Auto-cleanup      | ✅     | `afterEach(() => cleanup())`                |
| No leaked state   | ✅     | Minimal, correct                            |

#### [apps/developer/src/test/test-utils.tsx](apps/developer/src/test/test-utils.tsx) (48 lines)

| Check                      | Status | Details                                                                   |
| -------------------------- | ------ | ------------------------------------------------------------------------- |
| `createWrapper()` exported | ✅     | Returns `QueryClientProvider` + `MemoryRouter` wrapper (for `renderHook`) |
| Custom `render` exported   | ✅     | Wraps `@testing-library/react` `render` with `AllProviders`               |
| QueryClient config         | ✅     | `retry: false`, `gcTime: 0`, `staleTime: 0` — correct for tests           |
| No `any` types             | ✅     | Zero                                                                      |
| Fresh QueryClient per test | ✅     | `createWrapper()` creates new `QueryClient` each call                     |

#### [apps/admin/vitest.config.ts](apps/admin/vitest.config.ts) (21 lines) — Identical structure to developer ✅

#### [apps/admin/src/test/setup.ts](apps/admin/src/test/setup.ts) (9 lines) — Identical to developer ✅

#### [apps/admin/src/test/test-utils.tsx](apps/admin/src/test/test-utils.tsx) (50 lines)

| Check                            | Status | Details                                                                          |
| -------------------------------- | ------ | -------------------------------------------------------------------------------- |
| `createWrapper()` exported       | ✅     | Same pattern as developer                                                        |
| `renderWithProviders` exported   | ✅     | Named `renderWithProviders` (not `render` — different convention than developer) |
| `createTestQueryClient` exported | ✅     | Additional export for advanced test setups                                       |
| No `any` types                   | ✅     |                                                                                  |

**Finding T7 (INFO):** Admin uses `renderWithProviders` while developer uses `render` as the custom render export name. Inconsistent naming convention between apps.

---

### 4.2 Developer Test File: [useAuditLogs.test.ts](apps/developer/src/features/audit-logs/hooks/useAuditLogs.test.ts) (105 lines)

| Check                                | Status           | Details                                                        |
| ------------------------------------ | ---------------- | -------------------------------------------------------------- |
| Uses `createWrapper` from test-utils | ✅               | `import { createWrapper } from '@/test/test-utils.js'` (L11)   |
| Mocks `apiClient` properly           | ✅               | `vi.mock('@/lib/api-client.js')` with `mockGet` (L22-25)       |
| `describe`/`it` structure            | ✅               | 4 describe blocks, 5 `it` blocks                               |
| Tests loading state                  | ❌               | No explicit loading state assertion                            |
| Tests error state                    | ❌               | No error case tested                                           |
| Tests success state                  | ✅               | All 5 tests verify `isSuccess` + data                          |
| Skipped tests                        | ✅               | None (`it.skip`/`describe.skip`/`xit` = 0)                     |
| `any` types                          | ✅               | Zero                                                           |
| `vi.mock` correct                    | ✅               | Module-level mock with factory function                        |
| MSW vs direct mock                   | Direct `vi.mock` | Consistent with project convention (documented in file header) |
| `beforeEach` cleanup                 | ✅               | `vi.clearAllMocks()` (L28)                                     |

**Tests covered:**

1. `auditLogKeys` — key hierarchy (L36-44)
2. `useAuditLogs` — list fetch + select (L50-63)
3. `useAuditLogDetail` — single fetch (L69-79), null id guard (L81-86)
4. `useAuditLogStats` — stats fetch (L92-103)

**Finding T8 (MODERATE):** No loading or error state tests. Should test `isLoading` before resolving and `isError` when `mockGet.mockRejectedValue(...)`.

---

### 4.3 Developer Test File: [useSystemLogs.test.ts](apps/developer/src/features/system-logs/hooks/useSystemLogs.test.ts) (104 lines)

| Check                                | Status | Details                          |
| ------------------------------------ | ------ | -------------------------------- |
| Uses `createWrapper` from test-utils | ✅     | L11                              |
| Mocks `apiClient` properly           | ✅     | L17-20                           |
| `describe`/`it` structure            | ✅     | 4 describe blocks, 5 `it` blocks |
| Tests loading state                  | ❌     | No                               |
| Tests error state                    | ❌     | No                               |
| Tests success state                  | ✅     | All 5 tests                      |
| Skipped tests                        | ✅     | None                             |
| `any` types                          | ✅     | Zero                             |
| `vi.mock` correct                    | ✅     |                                  |
| `beforeEach` cleanup                 | ✅     |                                  |

**Tests covered:**

1. `systemLogKeys` — key hierarchy (L30-37)
2. `useSystemLogs` — list fetch (L43-57), level filter passthrough (L59-72)
3. `useSystemLogStats` — default 24h (L78-90), custom hours (L92-102)

**Finding T9 (MODERATE):** Same gap as T8 — no loading/error state coverage.

---

### 4.4 Developer Test File: [useUserSessions.test.ts](apps/developer/src/features/user-sessions/hooks/useUserSessions.test.ts) (127 lines)

| Check                                | Status | Details                                                                  |
| ------------------------------------ | ------ | ------------------------------------------------------------------------ |
| Uses `createWrapper` from test-utils | ✅     | L11                                                                      |
| Mocks `apiClient` properly           | ✅     | `mockGet` + `mockDelete` (L24-25)                                        |
| Mocks `@dento/ui` toast              | ✅     | `vi.mock('@dento/ui', async (importOriginal) => ...)` (L32-36)           |
| `describe`/`it` structure            | ✅     | 5 describe blocks, 6 `it` blocks                                         |
| Tests loading state                  | ❌     | No                                                                       |
| Tests error state                    | ❌     | No                                                                       |
| Tests success state                  | ✅     | All 6 tests                                                              |
| Skipped tests                        | ✅     | None                                                                     |
| `any` types                          | ✅     | Zero                                                                     |
| `vi.mock` correct                    | ✅     | Uses `importOriginal` pattern for partial mock                           |
| Mutation tested                      | ✅     | `useRevokeSession` — `act(() => result.current.mutate('s1'))` (L112-114) |
| `beforeEach` cleanup                 | ✅     |                                                                          |

**Tests covered:**

1. `sessionKeys` — key hierarchy (L50-57)
2. `useUserSessions` — list fetch (L63-76)
3. `useUserSessionDetail` — single fetch (L82-92), null guard (L94-99)
4. `useSessionStats` — stats fetch (L105-114)
5. `useRevokeSession` — DELETE mutation (L120-127)

**Finding T10 (MODERATE):** No loading/error state coverage. Also no test for toast success/error messages after revoke mutation despite mocking toast.

---

### 4.5 Developer Test File: [useDeployments.test.ts](apps/developer/src/features/deployments/hooks/useDeployments.test.ts) (131 lines)

| Check                                | Status | Details                                                             |
| ------------------------------------ | ------ | ------------------------------------------------------------------- |
| Uses `createWrapper` from test-utils | ✅     | L11                                                                 |
| Mocks `apiClient` properly           | ✅     | `mockGet` + `mockPost` (L24-25)                                     |
| Mocks `@dento/ui` toast              | ✅     | Same `importOriginal` pattern (L32-36)                              |
| `describe`/`it` structure            | ✅     | 5 describe blocks, 6 `it` blocks                                    |
| Tests loading state                  | ❌     | No                                                                  |
| Tests error state                    | ❌     | No                                                                  |
| Tests success state                  | ✅     | All 6 tests                                                         |
| Skipped tests                        | ✅     | None                                                                |
| `any` types                          | ✅     | Zero                                                                |
| Mutation tested                      | ✅     | `useRollback` — `act(() => result.current.mutate('d1'))` (L123-125) |
| `beforeEach` cleanup                 | ✅     |                                                                     |

**Tests covered:**

1. `deploymentKeys` — key hierarchy (L50-57)
2. `useDeployments` — list fetch (L63-76)
3. `useDeploymentDetail` — single fetch (L82-92), null guard (L94-99)
4. `useDeploymentStats` — stats fetch (L105-114)
5. `useRollback` — POST rollback mutation (L120-131)

**Finding T11 (MODERATE):** No loading/error coverage. No toast assertion.

---

### 4.6 Developer Test File: [useBilling.test.ts](apps/developer/src/features/billing/hooks/useBilling.test.ts) (151 lines)

| Check                                | Status | Details                                                  |
| ------------------------------------ | ------ | -------------------------------------------------------- |
| Uses `createWrapper` from test-utils | ✅     | L11                                                      |
| Mocks `apiClient` properly           | ✅     | `mockGet` + `mockPost` (L24-25)                          |
| Mocks `@dento/ui` toast              | ✅     | Same pattern (L32-36)                                    |
| `describe`/`it` structure            | ✅     | 6 describe blocks, 8 `it` blocks                         |
| Tests loading state                  | ❌     | No                                                       |
| Tests error state                    | ❌     | No                                                       |
| Tests success state                  | ✅     | All 8 tests                                              |
| Skipped tests                        | ✅     | None                                                     |
| `any` types                          | ✅     | Zero                                                     |
| Filter passthrough tested            | ✅     | `useInvoices` with `status: 'overdue'` filter (L103-115) |
| Mutation tested                      | ✅     | `useSendReminder` — POST remind (L143-151)               |
| `beforeEach` cleanup                 | ✅     |                                                          |

**Tests covered:**

1. `billingKeys` — key hierarchy (L50-57)
2. `useBillingStats` — stats fetch (L63-73)
3. `useInvoices` — list fetch (L79-93), status filter (L95-115)
4. `useInvoiceDetail` — single fetch (L121-131), null guard (L133-138)
5. `useSendReminder` — POST remind mutation (L144-151)

This is the most thorough of the 5 developer test files (8 tests with filter coverage).

**Finding T12 (MODERATE):** Same missing loading/error pattern.

---

### 4.7 Admin Test File: [useAdminSessions.test.ts](apps/admin/src/features/settings/hooks/useAdminSessions.test.ts) (107 lines)

| Check                                | Status | Details                                                                                    |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------ |
| Uses `createWrapper` from test-utils | ✅     | `import { createWrapper } from '@/test/test-utils.js'` (L11)                               |
| Mocks `apiClient` properly           | ✅     | `mockGet` + `mockDelete` (L19-20)                                                          |
| Mocks `@dento/ui` toast              | ✅     | Same pattern (L27-31)                                                                      |
| `describe`/`it` structure            | ✅     | 3 describe blocks, 4 `it` blocks                                                           |
| Tests loading state                  | ❌     | No                                                                                         |
| Tests error state                    | ❌     | No                                                                                         |
| Tests success state                  | ✅     | All 4 tests                                                                                |
| Tests default/empty filters          | ✅     | `useAdminSessions()` with no args (L66-75)                                                 |
| Skipped tests                        | ✅     | None                                                                                       |
| `any` types                          | ✅     | Zero                                                                                       |
| Mutations tested                     | ✅     | `useRevokeSession` (L83-93) + `useRevokeAllSessions` (L99-107)                             |
| `beforeEach` cleanup                 | ✅     |                                                                                            |
| API endpoint correct                 | ✅     | Uses `/api/auth/sessions` (not platform route — correct for admin self-session management) |

**Tests covered:**

1. `useAdminSessions` — list fetch (L47-63), empty filters (L65-75)
2. `useRevokeSession` — DELETE single (L81-93)
3. `useRevokeAllSessions` — DELETE all (L97-107)

**Finding T13 (MODERATE):** Same missing loading/error pattern.

---

### 4.8 MISSING Test Files

The following Phase 6 hooks in `apps/developer/src/features/monitoring/` have **NO test files**:

| Hook File                                                                                   | Tests          | Severity    |
| ------------------------------------------------------------------------------------------- | -------------- | ----------- |
| [useErrorLogs.ts](apps/developer/src/features/monitoring/hooks/useErrorLogs.ts)             | ❌ **MISSING** | ⚠️ HIGH     |
| [useHealthStatus.ts](apps/developer/src/features/monitoring/hooks/useHealthStatus.ts)       | ❌ **MISSING** | ⚠️ HIGH     |
| [useMonitoringStats.ts](apps/developer/src/features/monitoring/hooks/useMonitoringStats.ts) | ❌ **MISSING** | ⚠️ HIGH     |
| [useResolveError.ts](apps/developer/src/features/monitoring/hooks/useResolveError.ts)       | ❌ **MISSING** | ⚠️ MODERATE |

**Finding T14 (HIGH):** 4 monitoring hooks have zero test coverage. The `monitoring/` feature folder has 0 test files despite having 4 hooks and 5 components/pages.

---

## Unified Findings Summary — All Phase 6 Issues

### ❌ CRITICAL (3 issues)

| ID  | Area     | Finding                                                                                        | File(s) / Location                                    |
| --- | -------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| A1  | API      | 5× `as any` casts in audit-logger for `request.user`, `request.tenantSlug`, `request.tenantDb` | `audit-logger.ts` L232-235, L252                      |
| T5  | Types    | `HealthStatus`/`ComponentStatus` mismatch: types say `'ok'`, API route returns `'up'`          | `health-check.types.ts` L8-9 vs `health.route.ts` L22 |
| F1  | Frontend | No error state handling on 8 developer pages — blank screen on API failure                     | All Phase 6 developer pages                           |

### ⚠️ HIGH (6 issues)

| ID    | Area     | Finding                                                                      | File(s)                                                       |
| ----- | -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A3    | API      | No try/catch in `system-logs.route.ts` — all handlers                        | `system-logs.route.ts` L48-74                                 |
| A4    | API      | No try/catch in `deployments.route.ts` — all 4 handlers                      | `deployments.route.ts` L57-110                                |
| A5    | API      | No try/catch in `billing.route.ts` — all 4 handlers                          | `billing.route.ts` L52-106                                    |
| F3    | Frontend | 27 RTL violations (`mr-`, `pl-`, `left-`, `text-right`) across Phase 6 files | Multiple Phase 6 frontend files                               |
| T14   | Tests    | 4 monitoring hooks have **NO test files**                                    | `monitoring/hooks/` — 4 hooks                                 |
| T1-T4 | Types    | 5 type files use plain union types instead of `as const` arrays              | error-log, deployment, system-log, user-session, health-check |

### ⚠️ MAJOR (4 issues)

| ID  | Area     | Finding                                                                       | File(s)               |
| --- | -------- | ----------------------------------------------------------------------------- | --------------------- |
| A2  | API      | `catch (err: any)` in health route — should use `unknown`                     | `health.route.ts` L67 |
| A6  | API      | `ApiError.details` forwarded unsanitized to client                            | `server.ts` L258      |
| F2  | Frontend | Silent mutations in `useResolveError`/`useUnresolveError` — no toast feedback | `useResolveError.ts`  |
| F4  | Frontend | `useHealthStatus` uses raw `fetch()` instead of `apiClient`                   | `useHealthStatus.ts`  |

### ⚠️ MODERATE (5 issues)

| ID      | Area     | Finding                                                               | Scope                                             |
| ------- | -------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| F5      | Frontend | `PaginationMeta` duplicated locally in 3 hooks                        | `useAuditLogs`, `useSystemLogs`, `useErrorLogs`   |
| F6      | Frontend | ~50 lines of monitoring types defined locally, not in `@dento/shared` | `monitoring/types/`                               |
| T8-T13  | Tests    | All 6 test files lack loading & error state assertions                | All Phase 6 test files                            |
| T10-T12 | Tests    | Test files mock `toast` but never assert toast calls                  | useUserSessions, useDeployments, useBilling tests |
| F9      | Frontend | Failures stat card in AuditLogsPage is a no-op placeholder            | AuditLogsPage                                     |

### ℹ️ MINOR / INFO (10 issues)

| ID  | Area     | Finding                                                          | Details                                    |
| --- | -------- | ---------------------------------------------------------------- | ------------------------------------------ |
| A7  | API      | Raw `reply.send()` for OpenAPI spec                              | Acceptable exception — not a data endpoint |
| A8  | API      | `:id` param not Zod-validated in audit-logs route                | `audit-logs.route.ts` L72                  |
| A10 | API      | `hours` query param inline cast, no Zod in system-logs           | `system-logs.route.ts` L71                 |
| A11 | API      | `:id` params not Zod-validated in deployments                    | `deployments.route.ts` L91/L101            |
| A12 | API      | Double assertion `request as unknown as`                         | `deployments.route.ts` L102                |
| A13 | API      | `:id` params not Zod-validated in billing                        | `billing.route.ts` L90/L100                |
| A14 | API      | `console.error` in env.ts (justified — circular dep with logger) | `env.ts` L73                               |
| A15 | API      | `.strip()` instead of `.strict()` (acceptable for env parsing)   | `env.ts` L61                               |
| T7  | Tests    | Admin exports `renderWithProviders`, developer exports `render`  | Inconsistent naming convention             |
| F8  | Frontend | No admin audit-logs pages (may be by design)                     | Admin app                                  |

---

## Test Files — Complete Inventory

### Tests Found (6 total)

| #         | File                                                                                               | Tests  | Assertions | Mutations             |
| --------- | -------------------------------------------------------------------------------------------------- | ------ | ---------- | --------------------- |
| 1         | [useAuditLogs.test.ts](apps/developer/src/features/audit-logs/hooks/useAuditLogs.test.ts)          | 5      | 10         | 0                     |
| 2         | [useSystemLogs.test.ts](apps/developer/src/features/system-logs/hooks/useSystemLogs.test.ts)       | 5      | 9          | 0                     |
| 3         | [useUserSessions.test.ts](apps/developer/src/features/user-sessions/hooks/useUserSessions.test.ts) | 6      | 11         | 1 (revoke)            |
| 4         | [useDeployments.test.ts](apps/developer/src/features/deployments/hooks/useDeployments.test.ts)     | 6      | 11         | 1 (rollback)          |
| 5         | [useBilling.test.ts](apps/developer/src/features/billing/hooks/useBilling.test.ts)                 | 8      | 15         | 1 (remind)            |
| 6         | [useAdminSessions.test.ts](apps/admin/src/features/settings/hooks/useAdminSessions.test.ts)        | 4      | 8          | 2 (revoke, revokeAll) |
| **Total** |                                                                                                    | **34** | **64**     | **5**                 |

### Tests NOT Found (MISSING)

| Hook                    | Expected Test File                                                        | Exists |
| ----------------------- | ------------------------------------------------------------------------- | ------ |
| `useErrorLogs.ts`       | `apps/developer/src/features/monitoring/hooks/useErrorLogs.test.ts`       | ❌     |
| `useHealthStatus.ts`    | `apps/developer/src/features/monitoring/hooks/useHealthStatus.test.ts`    | ❌     |
| `useMonitoringStats.ts` | `apps/developer/src/features/monitoring/hooks/useMonitoringStats.test.ts` | ❌     |
| `useResolveError.ts`    | `apps/developer/src/features/monitoring/hooks/useResolveError.test.ts`    | ❌     |

---

## Consistent Patterns Across All 6 Test Files ✅

All found test files share these **good patterns**:

1. ✅ Import `createWrapper` from `@/test/test-utils.js` (never raw `@testing-library/react`)
2. ✅ `vi.mock('@/lib/api-client.js')` with factory returning typed mock functions
3. ✅ `beforeEach(() => vi.clearAllMocks())`
4. ✅ Proper `describe`/`it` structure
5. ✅ Zero `any` types
6. ✅ Zero skipped tests (`it.skip`/`describe.skip`/`xit`)
7. ✅ Zero `@ts-ignore` / `@ts-nocheck`
8. ✅ Direct `vi.mock` (not MSW) — consistent project convention
9. ✅ `await waitFor(() => expect(...))` for async assertions
10. ✅ `act(() => result.current.mutate(...))` for mutations

---

## Recommended Actions (Priority Order)

### Priority 1 — Critical (fix immediately)

1. **A1:** Create `src/types/fastify.d.ts` with augmented `FastifyRequest` interface to replace 5× `as any` casts in `audit-logger.ts`
2. **T5:** Align `health-check.types.ts` with `health.route.ts` — change `HealthStatus`/`ComponentStatus` from `'ok'` to `'up'`
3. **F1:** Add error state handling (`isError` + error UI) to all 8 Phase 6 developer pages

### Priority 2 — High (fix before release)

4. **A3/A4/A5:** Add try/catch to all handlers in `system-logs.route.ts`, `deployments.route.ts`, `billing.route.ts`
5. **F3:** Fix 27 RTL violations — replace physical CSS properties with logical equivalents
6. **T14:** Create test files for 4 monitoring hooks (`useErrorLogs`, `useHealthStatus`, `useMonitoringStats`, `useResolveError`)
7. **T1-T4:** Convert 5 union types to `as const` array pattern

### Priority 3 — Major (fix soon)

8. **A2:** Replace `catch (err: any)` with `catch (err: unknown)` + safe message extraction in `health.route.ts`
9. **A6:** Sanitize `ApiError.details` before forwarding to client in `server.ts`
10. **F2:** Add toast feedback to `useResolveError`/`useUnresolveError` mutations
11. **F4:** Replace raw `fetch()` with `apiClient.get()` in `useHealthStatus`

### Priority 4 — Moderate (next sprint)

12. **F5:** Extract `PaginationMeta` to `@dento/shared` and deduplicate
13. **F6:** Move monitoring types to `packages/shared/src/types/`
14. **T8-T13:** Add loading/error state assertions to all 6 test files
15. **T10-T12:** Add toast call assertions to test files that mock toast

### Priority 5 — Minor / Info (backlog)

16. **A8/A11/A13:** Add Zod validation for `:id` params in audit-logs, deployments, billing routes
17. **A10:** Add Zod schema for `hours` query param in system-logs route
18. **A12:** Refactor double assertion in `deployments.route.ts`
19. **T7:** Align custom render export naming between admin and developer apps

---

## Total Issue Count by Severity

| Severity    | Count  | % of Total |
| ----------- | ------ | ---------- |
| ❌ Critical | 3      | 10.7%      |
| ⚠️ High     | 6      | 21.4%      |
| ⚠️ Major    | 4      | 14.3%      |
| ⚠️ Moderate | 5      | 17.9%      |
| ℹ️ Minor    | 10     | 35.7%      |
| **Total**   | **28** | **100%**   |

---

_Report generated by automated Phase 6-only deep scan. All findings verified against actual source code. False findings from previous report (C3, H5) have been removed._
