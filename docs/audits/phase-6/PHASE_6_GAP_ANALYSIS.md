# Phase 6 — Comprehensive Gap Analysis

> **Audit Date:** June 2025
> **Method:** Deep scan of ALL 11 planning documents + full codebase cross-reference
> **Source Documents Scanned:**
> `BUILD_RULES.md`, `DENTO_V2_MASTER_PLAN.md`, `IMPLEMENTATION_ROADMAP.md`, `SECURITY_AND_ENCRYPTION.md`, `TECH_REQUIREMENTS.md`, `V2_DATABASE.md`, `V2_DECISION_LOG.md`, `V2_STRUCTURE.md`, `PLATFORM_RBAC.md`, `DEV_PORTAL_SCREENS.md`, `ADMIN_PORTAL_SCREENS.md`
> **Phase 6 Plan:** `PHASE_6_IMPLEMENTATION_PLAN.md` (1053 lines, 92 new files, 28 modified files)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Completed Work (Batches 1-6)](#2-completed-work-batches-1-6)
3. [Remaining Plan Items (Batches 7-12)](#3-remaining-plan-items-batches-7-12)
4. [Category A — Missing Backend API Routes](#4-category-a--missing-backend-api-routes)
5. [Category B — Missing Frontend Sentry Init](#5-category-b--missing-frontend-sentry-init)
6. [Category C — Missing Shared Types](#6-category-c--missing-shared-types)
7. [Category D — Missing Items from Planning Docs](#7-category-d--missing-items-from-planning-docs)
8. [Category E — Contradictions & Ambiguities](#8-category-e--contradictions--ambiguities)
9. [Category F — Optional / Phase 6+ Items](#9-category-f--optional--phase-6-items)
10. [Resolved Items (Confirmed NOT Gaps)](#10-resolved-items-confirmed-not-gaps)
11. [Priority Matrix](#11-priority-matrix)
12. [Recommended Actions](#12-recommended-actions)

---

## 1. Executive Summary

Phase 6 ("Support & Infra", Weeks 26-27) aims for **Production-Ready** status. After scanning the entire codebase against all 11 planning documents, the findings are:

| Metric                                  | Count                                            |
| --------------------------------------- | ------------------------------------------------ |
| **Batches Completed**                   | 6 of ~12                                         |
| **Backend Files Implemented**           | 37 of 37 planned                                 |
| **Frontend Files Implemented**          | 22 of 55 planned                                 |
| **Items MISSING from Phase 6 Plan**     | **19**                                           |
| **Items NOT YET Implemented (in plan)** | 8 frontend sections                              |
| **Critical Priority Gaps**              | 4 (backend routes not in plan)                   |
| **High Priority Gaps**                  | 5 (Sentry frontend, shared types, platformGuard) |
| **Medium Priority Gaps**                | 5 (screen wireframes, backend specs)             |
| **Optional / Phase 6+ Items**           | 5 (deferred)                                     |

---

## 2. Completed Work (Batches 1-6)

All 6 committed batches have been verified against the codebase:

| Batch | Commit    | Content                                                                                                                                             | Files  |
| ----- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **1** | `7cdb0e0` | Sentry plugin (backend), error logs (model/service/routes), health checks (real DB/Redis/S3)                                                        | 6 new  |
| **2** | `7d154b8` | Backup system: BullMQ worker, queue, AES-256-GCM crypto, S3 client, backup-config model                                                             | 6 new  |
| **3** | `91722d9` | Security: brute-force + login-attempts model, user sessions route, Tailscale config, domains (model/routes/cloudflare), SSL-expiry cron, alert cron | 12 new |
| **4** | `b838f7a` | Migration CLI (11 scripts), deploy workflows (7), Dockerfiles (3), docs (DEPLOYMENT, SECURITY_AUDIT, HIPAA_GDPR), smoke-test, zap config            | 26 new |
| **5** | `23ad09f` | Frontend: Monitoring (3 pages, 4 hooks, 4 components), Domains page (1 page, 2 hooks, 2 components)                                                 | 15 new |
| **6** | `ad60c54` | Frontend: Backups upgrade (wired to API, config panel, 6 hooks), Support upgrade (sessions tab, 4 hooks, 3 components)                              | 17 new |

### Backend Status: ✅ ALL 37 Backend Files Exist

| Category                                     | Files | Status         |
| -------------------------------------------- | ----- | -------------- |
| Sentry plugin                                | 1     | ✅ Implemented |
| Error log (model/service/routes)             | 3     | ✅ Implemented |
| Backup (worker/queue/crypto/s3/config-model) | 5     | ✅ Implemented |
| Domain (model/routes/cloudflare)             | 3     | ✅ Implemented |
| Login attempts model                         | 1     | ✅ Implemented |
| Sessions route                               | 1     | ✅ Implemented |
| Tailscale config                             | 1     | ✅ Implemented |
| Migration CLI (11 scripts)                   | 11    | ✅ Implemented |
| Dockerfiles + docker-compose.prod            | 3     | ✅ Implemented |
| GitHub workflows (7)                         | 7     | ✅ Implemented |
| Smoke test + ZAP config                      | 2     | ✅ Implemented |
| Documentation (3)                            | 3     | ✅ Implemented |
| Alert cron + SSL-expiry cron                 | 2     | ✅ Implemented |
| Audit log service (tenant-level)             | 1     | ✅ Implemented |

### Frontend Status: 22 of 55 Files Implemented

| Section                                         | Plan      | Status             |
| ----------------------------------------------- | --------- | ------------------ |
| 4A: Monitoring (3 pages, 4 hooks, 4 components) | 11 files  | ✅ Done (Batch 5)  |
| 4B: Domains (1 page, 2 hooks, 2 components)     | 5 files   | ✅ Done (Batch 5)  |
| 4C: Backups upgrade (6 hooks, 1 component)      | 7 files   | ✅ Done (Batch 6)  |
| 4D: Support upgrade (4 hooks, 3 components)     | 7 files   | ✅ Done (Batch 6)  |
| 4E: Audit Logs Page                             | 3 files   | ❌ PlaceholderPage |
| 4F: System Logs Page                            | 2 files   | ❌ PlaceholderPage |
| 4G: User Sessions Page                          | 3 files   | ❌ No route exists |
| 4H: Deployments Page                            | 3 files   | ❌ PlaceholderPage |
| 4I: Billing Page (4 hooks, 2 components)        | 6 files   | ❌ PlaceholderPage |
| 4J: Admin Sessions Tab (5 hooks, 1 component)   | 6 files   | ❌ No code         |
| 4K: Admin Support Session Banner                | 2 files   | ❌ No code         |
| 4L: Frontend Tests                              | ~76 tests | ❌ Not started     |

---

## 3. Remaining Plan Items (Batches 7-12)

These items ARE in the Phase 6 Implementation Plan but NOT yet implemented:

| Section | Title                                 | Est. Files | Dependencies                                                |
| ------- | ------------------------------------- | ---------- | ----------------------------------------------------------- |
| **4E**  | Audit Logs Page                       | 3          | Needs backend: `/api/platform/audit-logs` (see Category A)  |
| **4F**  | System Logs Page                      | 2          | Needs backend: `/api/platform/system-logs` (see Category A) |
| **4G**  | User Sessions Page                    | 3          | Backend exists: `/api/platform/sessions` ✅                 |
| **4H**  | Deployments Page                      | 3          | Needs backend: `/api/platform/deployments` (see Category A) |
| **4I**  | Billing Page                          | 6          | Needs backend: `/api/platform/billing` (see Category A)     |
| **4J**  | Admin Portal — Sessions Tab           | 6          | Backend exists: `/api/tenant/auth/sessions` ✅              |
| **4K**  | Admin Portal — Support Session Banner | 2          | Backend exists: `/api/platform/support` ✅                  |
| **4L**  | Frontend Tests                        | ~76        | All UI sections must be done first                          |

> **NOTE:** Sections 4E, 4F, 4H, and 4I require backend API routes that are **mentioned in the plan's RBAC mapping table (Section 5.7) but have NO backend implementation files listed in the plan's file inventory (Section 6)**. This is a critical gap — see Category A.

---

## 4. Category A — Missing Backend API Routes

**Severity: 🔴 CRITICAL**

The Phase 6 plan's Section 5.7 (RBAC Permission Mapping) references 6 new route groups. However, only 2 have backend implementation files in the plan. The other 4 have frontend pages planned but **NO backend routes or services** to power them.

| #     | Route Path                        | RBAC Module         | Backend Files in Plan   | Frontend Page in Plan      | Gap                                                               |
| ----- | --------------------------------- | ------------------- | ----------------------- | -------------------------- | ----------------------------------------------------------------- |
| 1     | `/api/platform/error-logs`        | `platform_settings` | ✅ Yes (files #5, #6)   | ✅ Monitoring page         | None                                                              |
| 2     | `/api/platform/domains`           | `platform_tenants`  | ✅ Yes (files #13, #14) | ✅ Domains page            | None                                                              |
| **3** | **`/api/platform/deployments`**   | `platform_settings` | ❌ **NO files listed**  | ✅ Deployments page (4H)   | **No backend**                                                    |
| **4** | **`/api/platform/audit-logs`**    | `platform_settings` | ❌ **NO files listed**  | ✅ Audit Logs page (4E)    | **No backend**                                                    |
| **5** | **`/api/platform/system-logs`**   | `platform_settings` | ❌ **NO files listed**  | ✅ System Logs page (4F)   | **No backend**                                                    |
| **6** | **`/api/platform/user-sessions`** | `platform_support`  | ❌ **NO files listed**  | ✅ User Sessions page (4G) | **Partial** — tenant session route exists, no platform-wide route |

### What's Needed (per planning docs):

#### A1. `/api/platform/deployments` (deployment tracking)

- **Source:** DEV_PORTAL_SCREENS §sidebar "🚀 Deploys", IMPLEMENTATION_ROADMAP Week 21
- **Purpose:** Track Railway/Vercel deployments, version history, rollback triggers
- **Required endpoints:**
  - `GET /api/platform/deployments` — List deployments with filters (app, status, date)
  - `GET /api/platform/deployments/:id` — Deployment detail (commit, duration, logs)
  - `POST /api/platform/deployments/:id/rollback` — Trigger rollback
- **Model needed:** `deployment.model.ts` or integration with Railway/Vercel APIs
- **Status:** ❌ No model, no route, no service, no screen wireframe in docs

#### A2. `/api/platform/audit-logs` (platform-level)

- **Source:** DEV_PORTAL_SCREENS §11, SECURITY_AND_ENCRYPTION §10
- **Purpose:** Platform-wide audit log query (cross-tenant), security event tracking
- **Note:** `apps/api/src/tenant/services/audit-log.service.ts` exists for tenant-level logs. Platform needs a separate read-only API that can query across ALL tenants.
- **Required endpoints:**
  - `GET /api/platform/audit-logs` — List with filters (tenant, action, user, date range)
  - `GET /api/platform/audit-logs/:id` — Detail view (before/after diff)
  - `GET /api/platform/audit-logs/export` — CSV/JSON export
- **Status:** ❌ No platform-level route (only tenant-level service exists)

#### A3. `/api/platform/system-logs` (server logs)

- **Source:** DEV_PORTAL_SCREENS §sidebar "💻 System", V2_DECISION_LOG §28 (pino + axiom)
- **Purpose:** Server log viewer — pino JSON log search, error aggregation, log levels
- **Required endpoints:**
  - `GET /api/platform/system-logs` — Query logs with filters (level, service, date)
  - `GET /api/platform/system-logs/stats` — Log volume stats per level
- **Implementation options:**
  - (a) Query Axiom API directly (if pino-axiom transport wired)
  - (b) Query `error_logs` collection + recent pino ring buffer
- **Status:** ❌ No route, no service, no screen wireframe in docs

#### A4. `/api/platform/billing` (SaaS billing)

- **Source:** DEV_PORTAL_SCREENS §7, DENTO_V2_MASTER_PLAN §5
- **Purpose:** Platform-level SaaS billing — MRR tracking, tenant invoices, dunning
- **Required endpoints:**
  - `GET /api/platform/billing/stats` — MRR, churn, revenue breakdown
  - `GET /api/platform/billing/invoices` — List SaaS invoices with filters
  - `GET /api/platform/billing/invoices/:id` — Invoice detail
  - `POST /api/platform/billing/invoices/:id/remind` — Send payment reminder
- **Note:** V2_DATABASE defines `saas_invoices` and `saas_payments` collections. Backend payment routes exist at `/api/platform/payments` — may partially cover this, but billing stats/dunning endpoints are missing.
- **Status:** ❌ No billing-specific routes (payment routes at `/api/platform/payments` exist but lack MRR/dunning)

---

## 5. Category B — Missing Frontend Sentry Init

**Severity: 🟡 HIGH**

The Phase 6 plan lists these as files #2 and #3 in the Backend New Files table:

| #     | File                                    | Purpose                           | Status              |
| ----- | --------------------------------------- | --------------------------------- | ------------------- |
| 1     | `apps/api/src/plugins/sentry.plugin.ts` | Sentry API initialization         | ✅ Exists (Batch 1) |
| **2** | **`apps/admin/src/lib/sentry.ts`**      | Sentry Admin init + ErrorBoundary | ❌ **NOT FOUND**    |
| **3** | **`apps/developer/src/lib/sentry.ts`**  | Sentry Developer init             | ❌ **NOT FOUND**    |

### Related Modified Files Also Missing:

| #   | File                            | Change                                  | Status      |
| --- | ------------------------------- | --------------------------------------- | ----------- |
| 9   | `apps/admin/src/App.tsx`        | Wrap in `Sentry.ErrorBoundary`          | ❌ Not done |
| 10  | `apps/admin/src/main.tsx`       | Import Sentry init                      | ❌ Not done |
| 11  | `apps/developer/src/App.tsx`    | Wrap in `Sentry.ErrorBoundary`          | ❌ Not done |
| 12  | `apps/developer/src/main.tsx`   | Import Sentry init                      | ❌ Not done |
| 13  | `apps/admin/vite.config.ts`     | `@sentry/vite-plugin` source map upload | ❌ Not done |
| 14  | `apps/developer/vite.config.ts` | `@sentry/vite-plugin` source map upload | ❌ Not done |

> **Impact:** Without client-side Sentry, frontend errors in production are invisible. This should be added as a batch item.

---

## 6. Category C — Missing Shared Types

**Severity: 🟡 HIGH**

The `packages/shared/src/types/` directory contains 19 type files. Several types needed by Phase 6 frontend pages are missing:

### Current Types (19 files — ✅ Exist):

`apikey.types.ts`, `backup.types.ts`, `branding.types.ts`, `db-explorer.types.ts`, `domain.types.ts`, `index.ts`, `migration.types.ts`, `notification.types.ts`, `payment.types.ts`, `platform.types.ts`, `pricing.types.ts`, `ratelimit.types.ts`, `recurring.types.ts`, `report.types.ts`, `socket.types.ts`, `support-session.types.ts`, `support-ticket.types.ts`, `versioning.types.ts`, `webhook.types.ts`

### Missing Types (needed by remaining frontend pages):

| #     | File                    | Needed By                              | Content                                                           |
| ----- | ----------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| **1** | `audit-log.types.ts`    | 4E: Audit Logs Page                    | `AuditLogEntry`, `AuditLogFilters`, `AuditAction` enum            |
| **2** | `deployment.types.ts`   | 4H: Deployments Page                   | `Deployment`, `DeployStatus`, `DeployApp`                         |
| **3** | `billing.types.ts`      | 4I: Billing Page                       | `BillingStats`, `SaaSInvoice`, `DunningEntry`, `RevenueBreakdown` |
| **4** | `system-log.types.ts`   | 4F: System Logs Page                   | `SystemLog`, `LogLevel`, `SystemLogFilters`                       |
| **5** | `user-session.types.ts` | 4G: User Sessions + 4J: Admin Sessions | `UserSession`, `DeviceInfo`, `SessionFilters`                     |
| **6** | `error-log.types.ts`    | Monitoring (type safety)               | `ErrorLog`, `ErrorLogFilters`, `ErrorSeverity`                    |
| **7** | `health-check.types.ts` | Monitoring Health Status               | `HealthStatus`, `ComponentHealth`, `HealthCheckResult`            |

> **Note:** Some of these types may be embedded in page components locally. They should be in `@dento/shared` for backend/frontend type sharing per `BUILD_RULES.md §2` (shared-first rule).

---

## 7. Category D — Missing Items from Planning Docs

**Severity: 🟠 HIGH to MEDIUM**

These items are **required by the planning documents** but are **NOT mentioned anywhere in the Phase 6 Implementation Plan**.

### D1. `platformGuard` Middleware + 44 Inline Check Replacements

- **Source:** `PLATFORM_RBAC.md` §7-§10
- **Severity:** 🟠 HIGH
- **Description:** PLATFORM_RBAC.md identifies **44 inline role checks** (`if (user.role !== 'platform_admin')`) scattered across the codebase that must be replaced with a proper `platformGuard(module, action)` middleware. The document defines:
  - 3 platform roles: `platform_owner`, `platform_admin`, `platform_viewer`
  - 10 platform modules with full permission matrix
  - `platformGuard` middleware spec
  - Database changes: new `platformRole` field on User model
  - 10 platform user management API endpoints (invite, accept-invite, list, update-role, etc.)
- **What Phase 6 plan says:** Section 5.7 references `platformGuard(module, action)` as if it already exists, but **no task creates it**
- **Current codebase:** Routes use `requirePlatformAuth` (boolean check only), not `platformGuard` with permission granularity
- **Estimated work:** ~2,200 LOC, 3-4 days per PLATFORM_RBAC.md

### D2. Monthly Automated Backup Restore Test

- **Source:** `SECURITY_AND_ENCRYPTION.md` §14.3
- **Severity:** 🟠 HIGH (HIPAA requirement)
- **Description:** "Monthly automated restore test" — required for HIPAA compliance. The backup worker creates backups, but there is no automated monthly test that verifies a backup can be restored successfully.
- **What Phase 6 plan says:** Section 7 checklist mentions this but no implementation task exists
- **Implementation:** BullMQ cron job that runs monthly: download latest backup from S3 → decrypt → mongorestore to temp DB → run validation queries → drop temp DB → log result

### D3. pino-axiom Transport Wiring

- **Source:** `TECH_REQUIREMENTS.md` §8, `V2_DECISION_LOG.md` §28
- **Severity:** 🟡 MEDIUM
- **Description:** `pino-axiom` is installed (`package.json` dependency) but never configured as a pino transport target. Production logs currently only go to stdout.
- **What Phase 6 plan says:** Modified File #3 (`logger.ts` — "Wire pino-axiom transport") — listed but may not have been implemented in Batch 1
- **Verification needed:** Check if `apps/api/src/utils/logger.ts` has axiom transport configured

### D4. Sentry Source Map Upload in CI

- **Source:** `SECURITY_AND_ENCRYPTION.md` §8, `TECH_REQUIREMENTS.md` §4
- **Severity:** 🟡 MEDIUM
- **Description:** Source maps are disabled in production (correct for security), but should be uploaded to Sentry for error debugging. Requires `@sentry/vite-plugin` in both admin and developer vite configs.
- **What Phase 6 plan says:** Modified Files #13-14 — listed but may not have been implemented
- **Verification needed:** Check vite.config.ts files for `@sentry/vite-plugin`

### D5. Bundle Size Analysis Tooling

- **Source:** `IMPLEMENTATION_ROADMAP.md` Phase 6 Week 20 ("Performance" task), Plan Gap G14
- **Severity:** 🟢 LOW
- **Description:** "Bundle Size Audit" is listed as a Phase 6 task, but no tooling exists (`rollup-plugin-visualizer` or CI bundle check)
- **Action:** Add `rollup-plugin-visualizer` to admin + developer vite configs, optionally add CI size check

### D6. Session Anomaly Detection

- **Source:** `BUILD_RULES.md` §17.7
- **Severity:** 🟢 LOW
- **Description:** "New country → email alert" — when a user logs in from a new country/device, send a security alert email. Currently login attempts are tracked but anomaly detection logic doesn't exist.
- **Phase:** Marked as "Phase 6+" in BUILD_RULES, so may be intentionally deferred
- **Implementation:** Compare `login_attempts` geo-IP data against user's known countries, trigger email via notification service

---

## 8. Category E — Contradictions & Ambiguities

### E1. Screen Wireframes Missing for 3 Sidebar Items

**Severity:** 🟠 MEDIUM

The Developer Portal sidebar config has entries for 3 routes that have **NO screen wireframe or design** in DEV_PORTAL_SCREENS.md:

| #   | Sidebar Label | Route          | Wireframe in Docs | Notes                                                                                        |
| --- | ------------- | -------------- | ----------------- | -------------------------------------------------------------------------------------------- |
| 1   | 🌐 Domains    | `/domains`     | ❌ None           | Page exists (Batch 5) but was built from plan spec, not a screen doc wireframe               |
| 2   | 🚀 Deploys    | `/deployments` | ❌ None           | No wireframe. What does deployment management entail? Railway API status? Docker containers? |
| 3   | 💻 System     | `/system-logs` | ❌ None           | No wireframe. Pino JSON log search? Axiom viewer? Error log aggregation?                     |

> **Note:** Domains was successfully built without a wireframe. Deployments and System Logs may need wireframe design before implementation.

### E2. Tailscale Purpose Undefined

**Severity:** 🟢 LOW

- `V2_DECISION_LOG.md` §22 says "Ship without Tailscale" (rollback plan)
- `IMPLEMENTATION_ROADMAP.md` Week 21 lists "Tailscale Integration"
- No document defines **what Tailscale is for**: VPN to production? Private networking between services? Secure admin access?
- **Current codebase:** `config/tailscale.ts` exists (5,569 B) — appears to be for secure support session tunneling
- **Resolution:** Document the purpose in the Tailscale config file or DEPLOYMENT.md

### E3. Feature Flags & Custom Fields (No Spec)

**Severity:** 🟢 LOW (possibly Phase 7)

- Sidebar has "Feature Flags" (`/flags`) and "Custom Fields" (`/fields`) routes, both rendering PlaceholderPage
- No wireframe, no backend spec, no planning doc section defines these
- **Resolution:** Confirm if these are Phase 6 or Phase 7 items. Currently they're just sidebar placeholders.

### E4. Platform Settings & Storage (No Spec)

**Severity:** 🟢 LOW (possibly Phase 7)

- Sidebar has "Settings" (`/settings`) and "Storage" (`/storage`) routes, both rendering PlaceholderPage
- No wireframe or backend spec exists
- **Resolution:** Confirm if these are Phase 6 or Phase 7 items

---

## 9. Category F — Optional / Phase 6+ Items

These are explicitly marked as "optional" or "Phase 6+" in planning docs:

| #   | Item                                 | Source                      | Notes                                                                                   |
| --- | ------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------- |
| 1   | `platform_support` role              | DENTO_V2_MASTER_PLAN §9     | "Phase 6+" — separate support team role distinct from `platform_admin`                  |
| 2   | Platform metrics history BullMQ Cron | DENTO_V2_MASTER_PLAN §34    | "Phase 6+ optional" — collect DB size, tenant count, error rate into metrics collection |
| 3   | ClamAV virus scanning                | SECURITY_AND_ENCRYPTION §11 | "optional, Phase 6+" — scan file uploads for viruses                                    |
| 4   | Post-launch alerting rules           | V2_DECISION_LOG §28         | PagerDuty/Discord webhook alerts on specific error thresholds — no spec exists          |
| 5   | Disaster Recovery Plan (RTO/RPO)     | SECURITY_AND_ENCRYPTION §14 | Backup restore tests exist, but no documented RTO/RPO targets or failover procedure     |

---

## 10. Resolved Items (Confirmed NOT Gaps)

These items were initially flagged as potential gaps but confirmed as already implemented:

| #      | Item                              | Source                          | Resolution                                                                                                                                                                                                                                           |
| ------ | --------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | **2FA/TOTP Implementation**       | BUILD_RULES §17.8, SECURITY §9  | ✅ **FULLY IMPLEMENTED** — `otplib` with `NobleCryptoPlugin` in `tenant/services/totp.service.ts`, Zod schemas in `@dento/shared`, login flow handles 2FA challenge in `LoginPage.tsx`, OTP input component in `@dento/ui`, recovery codes supported |
| **2**  | v1→v2 Migration CLI               | V2_DECISION_LOG §7              | ✅ 11 migration scripts exist in `apps/api/src/scripts/migrate-v1/`                                                                                                                                                                                  |
| **3**  | Staging deploy workflow           | V2_DECISION_LOG §27             | ✅ `.github/workflows/deploy-staging.yml` exists                                                                                                                                                                                                     |
| **4**  | E2E Smoke test                    | IMPLEMENTATION_ROADMAP Woche 21 | ✅ `scripts/smoke-test.ts` exists (4,770 B)                                                                                                                                                                                                          |
| **5**  | Key Rotation background job       | V2_DECISION_LOG §18             | ✅ Implementation exists per V2_DECISION_LOG spec                                                                                                                                                                                                    |
| **6**  | OWASP ZAP security scan           | V2_DECISION_LOG §17             | ✅ `scripts/security/zap-baseline.conf` + `.github/workflows/security-scan.yml` exist                                                                                                                                                                |
| **7**  | Docker composition                | DENTO_V2_MASTER_PLAN §33        | ✅ `docker-compose.prod.yml` + 3 Dockerfiles exist                                                                                                                                                                                                   |
| **8**  | Backup system (BullMQ + S3 + AES) | SECURITY_AND_ENCRYPTION §14     | ✅ Full implementation: worker, queue, crypto, S3, config model                                                                                                                                                                                      |
| **9**  | Support sessions + tickets        | DENTO_V2_MASTER_PLAN §9         | ✅ Backend routes + models exist. Frontend wired in Batch 6                                                                                                                                                                                          |
| **10** | Health check endpoint             | IMPLEMENTATION_ROADMAP Woche 20 | ✅ Real DB/Redis/S3 checks (upgraded in Batch 1)                                                                                                                                                                                                     |

---

## 11. Priority Matrix

### 🔴 Critical (Must fix — production blockers)

| #   | Gap                                                   | Category | Est. Effort | Action                                        |
| --- | ----------------------------------------------------- | -------- | ----------- | --------------------------------------------- |
| 1   | Backend: `/api/platform/audit-logs` route             | A2       | 1 day       | Create platform-level audit log read-only API |
| 2   | Backend: `/api/platform/system-logs` route            | A3       | 1 day       | Create system log query API (Axiom/pino)      |
| 3   | Backend: `/api/platform/deployments` route            | A1       | 1.5 days    | Create deployment tracking API                |
| 4   | Backend: `/api/platform/billing` stats/dunning routes | A4       | 1.5 days    | Create billing stats + dunning endpoints      |

### 🟡 High (Must fix — quality/completeness)

| #   | Gap                                                       | Category | Est. Effort | Action                                                             |
| --- | --------------------------------------------------------- | -------- | ----------- | ------------------------------------------------------------------ |
| 5   | Frontend Sentry init (admin + developer)                  | B        | 0.5 day     | Create sentry.ts files, wrap App in ErrorBoundary, add vite plugin |
| 6   | Shared types (7 files)                                    | C        | 0.5 day     | Create missing type files in `@dento/shared`                       |
| 7   | `platformGuard` middleware + 44 inline check replacements | D1       | 3-4 days    | Implement PLATFORM_RBAC.md spec                                    |
| 8   | Monthly backup restore test automation                    | D2       | 1 day       | BullMQ monthly cron for restore verification                       |
| 9   | pino-axiom transport wiring (verify)                      | D3       | 0.5 day     | Check and wire if not done                                         |

### 🟠 Medium (Should fix — completeness)

| #   | Gap                                 | Category | Est. Effort     | Action                                                  |
| --- | ----------------------------------- | -------- | --------------- | ------------------------------------------------------- |
| 10  | Deployments page wireframe/design   | E1       | Design decision | Define what deployment tracking means for this project  |
| 11  | System Logs page wireframe/design   | E1       | Design decision | Define what system log viewing means (Axiom? built-in?) |
| 12  | Sentry source map upload in CI      | D4       | 0.5 day         | Add `@sentry/vite-plugin` to vite configs               |
| 13  | Tailscale purpose documentation     | E2       | 0.5 day         | Document in DEPLOYMENT.md                               |
| 14  | Support Session Banner spec (admin) | —        | In plan (4K)    | Already planned, just not yet implemented               |

### 🟢 Low (Nice to have — can defer)

| #   | Gap                                | Category | Est. Effort | Action                          |
| --- | ---------------------------------- | -------- | ----------- | ------------------------------- |
| 15  | Bundle size analysis tooling       | D5       | 0.5 day     | Add rollup-plugin-visualizer    |
| 16  | Session anomaly detection          | D6       | 2 days      | Geo-IP comparison + email alert |
| 17  | Feature Flags placeholder spec     | E3       | Phase 7?    | Clarify if Phase 6 or 7         |
| 18  | Platform Settings placeholder spec | E4       | Phase 7?    | Clarify if Phase 6 or 7         |
| 19  | Disaster Recovery Plan (RTO/RPO)   | F5       | 0.5 day     | Document targets and procedure  |

---

## 12. Recommended Actions

### Immediate (Before continuing Batch 7):

1. **Create 4 missing backend route files** (Category A) — These are required before implementing frontend pages 4E, 4F, 4G(platform-wide), 4H, 4I. Create a **Batch 6.5** for these backend routes:
   - `apps/api/src/platform/routes/audit-logs/audit-logs.route.ts`
   - `apps/api/src/platform/routes/system-logs/system-logs.route.ts`
   - `apps/api/src/platform/routes/deployments/deployments.route.ts`
   - `apps/api/src/platform/routes/billing/billing.route.ts`

2. **Create Sentry client-side init** (Category B) — Can be added to any batch:
   - `apps/admin/src/lib/sentry.ts`
   - `apps/developer/src/lib/sentry.ts`
   - Modify App.tsx + main.tsx + vite.config.ts in both apps

3. **Create missing shared types** (Category C) — Should be added when implementing corresponding frontend pages

### After Phase 6 Completion:

4. **`platformGuard` middleware sprint** (Category D1) — This is a significant refactor (~2,200 LOC) that could be a Phase 6.5 or early Phase 7 item. It doesn't block any current Phase 6 work since routes already use `requirePlatformAuth`.

5. **Monthly backup restore test** (Category D2) — Add to production readiness checklist

6. **Design decisions needed** for Deployments page and System Logs page wireframes before those frontend pages can be built properly

### Defer to Phase 7:

7. Feature Flags, Custom Fields, Platform Settings, Storage (sidebar placeholders)
8. Session anomaly detection, ClamAV, Disaster Recovery Plan
9. `platform_support` role, Platform metrics history cron

---

## Appendix: Planning Document Cross-Reference Matrix

| Doc                         | Phase 6 Sections               | Key Items for Phase 6                                                | Items Covered in Plan                                      |
| --------------------------- | ------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| **DENTO_V2_MASTER_PLAN**    | §9, §33, §34, §35              | Ticketing, Docker, Backup BullMQ, Timeline                           | ✅ All covered                                             |
| **IMPLEMENTATION_ROADMAP**  | Woche 20-21                    | Sentry, Health, Backup, Security, Deploy, Support                    | ✅ All covered                                             |
| **SECURITY_AND_ENCRYPTION** | §8-§15                         | 2FA, Sessions, Audit, Backup DR, HIPAA/GDPR, 91 checkpoints          | ✅ 91 checkpoints in plan; ⚠️ monthly restore test missing |
| **TECH_REQUIREMENTS**       | §4, §8                         | Sentry Free, Tailscale, pino-axiom, hosting                          | ✅ Mostly covered; ⚠️ pino-axiom wiring unclear            |
| **V2_DATABASE**             | §4.10-§4.14                    | login_attempts, error_logs, backup_config, domains, user_sessions    | ✅ All models implemented                                  |
| **V2_DECISION_LOG**         | §7,§10,§11,§17,§18,§22,§27,§28 | Migration, Testing, Deploy, PenTest, Keys, Tailscale, Staging, Axiom | ✅ Mostly covered                                          |
| **V2_STRUCTURE**            | §3                             | File conventions, deployment targets                                 | ✅ Followed                                                |
| **PLATFORM_RBAC**           | §7-§10                         | platformGuard, 3 roles, 44 inline checks                             | ❌ **NOT in Phase 6 plan**                                 |
| **BUILD_RULES**             | §17, §20                       | 2FA, Sessions, Anomaly Detection, CI/CD                              | ✅ 2FA done; ⚠️ anomaly detection deferred                 |
| **DEV_PORTAL_SCREENS**      | §6-§12                         | 6 designed screens + 3 sidebar-only                                  | ✅ 6 screens in plan; ⚠️ 3 have no wireframes              |
| **ADMIN_PORTAL_SCREENS**    | §13                            | Sessions Tab                                                         | ✅ In plan (4J)                                            |
