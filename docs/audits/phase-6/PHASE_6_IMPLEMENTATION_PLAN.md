# Phase 6 — Support & Infra: Complete Implementation Plan

> **Phase:** 6 — Support & Infra
> **Timeline:** Weeks 26-27 (adjusted per V2_DECISION_LOG §8)
> **Goal:** Production-ready — Monitoring, Backup, Support-Tools, Deployment, Security Audit
> **Created:** Deep codebase scan + cross-reference of ALL 9 planning documents
> **Source Documents:** DENTO_V2_MASTER_PLAN, IMPLEMENTATION_ROADMAP, SECURITY_AND_ENCRYPTION, TECH_REQUIREMENTS, V2_DATABASE, V2_DECISION_LOG, V2_STRUCTURE, BUILD_RULES, PLATFORM_RBAC

---

## Table of Contents

1. [Gap Analysis Summary](#1-gap-analysis-summary)
2. [Week 26 — Monitoring + Hardening](#2-week-26--monitoring--hardening)
3. [Week 27 — Deploy + Support + Polish](#3-week-27--deploy--support--polish)
4. [Week 26-27 — Frontend / UI Implementation](#4-week-26-27--frontend--ui-implementation)
5. [Detailed Task Breakdown](#5-detailed-task-breakdown)
6. [File Inventory (New + Modified)](#6-file-inventory-new--modified)
7. [Security Audit Checklist](#7-security-audit-checklist)
8. [Deliverables & Acceptance Criteria](#8-deliverables--acceptance-criteria)
9. [Dependencies & Risks](#9-dependencies--risks)

---

## 1. Gap Analysis Summary

Cross-referencing the current IMPLEMENTATION_ROADMAP Phase 6 plan against ALL reference documents and the existing codebase reveals **14 backend gaps + 14 frontend gaps** — items required by the reference docs but either missing from the roadmap or missing from the codebase.

### What the Roadmap Already Covers (✅)

| #   | Task                  | Roadmap    | Codebase Status                                                                          |
| --- | --------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| 1   | Sentry Integration    | ✅ Week 20 | **PARTIAL** — packages installed, env vars defined, but `Sentry.init()` never called     |
| 2   | Health Checks         | ✅ Week 20 | **PARTIAL** — route exists but returns static OK (no DB/Redis/S3 checks)                 |
| 3   | Backup Automation     | ✅ Week 20 | **PARTIAL** — model + routes exist but backup is **simulated** (no BullMQ, no mongodump) |
| 4   | Backup Restore        | ✅ Week 20 | **MISSING** — no restore endpoint                                                        |
| 5   | Logging               | ✅ Week 20 | **EXISTS** — pino + PII redaction + requestId; pino-axiom installed but not wired        |
| 6   | Security Audit        | ✅ Week 20 | **EXISTS** — Helmet/CORS/CSP/Rate Limiting all configured                                |
| 7   | HIPAA/GDPR Check      | ✅ Week 20 | Checklist review task (no code)                                                          |
| 8   | Performance           | ✅ Week 20 | Audit task (indexes, queries, bundle)                                                    |
| 9   | Tailscale Integration | ✅ Week 21 | **PARTIAL** — impersonation model + routes done; no Tailscale tunnel                     |
| 10  | Support Sessions UI   | ✅ Week 21 | **PARTIAL** — API exists; no frontend UI                                                 |
| 11  | Production Deploy     | ✅ Week 21 | **PARTIAL** — CI works; deploy workflows are **stubs**                                   |
| 12  | DNS + SSL             | ✅ Week 21 | **MISSING** — no domain model, no routes, no Cloudflare integration                      |
| 13  | Smoke Test            | ✅ Week 21 | Manual test (no code)                                                                    |
| 14  | Documentation         | ✅ Week 21 | **PARTIAL** — Swagger exists; no README/deployment guide                                 |

### What the Roadmap is MISSING (❌ Gaps Found)

| #   | Gap                                       | Required By                               | Impact                                                                                                                      |
| --- | ----------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| G1  | **`error_logs` collection + service**     | V2_DATABASE §4.11, MASTER_PLAN §7         | Error aggregation with dedup fingerprint, 4 indexes, 90-day TTL — Sentry alone doesn't provide persistent MongoDB error log |
| G2  | **v1→v2 Migration CLI**                   | V2_DECISION_LOG §7 (explicitly Phase 6)   | ETL script: `apps/api/src/scripts/migrate-v1/`, bcrypt→Argon2id compat, 15-step dependency order                            |
| G3  | **Penetration Testing execution**         | V2_DECISION_LOG §17 (Phase 6 Week 20)     | OWASP ZAP + nuclei configs, 20-item sec checklist, CI security scan                                                         |
| G4  | **`login_attempts` MongoDB collection**   | V2_DATABASE §4.10, MASTER_PLAN §27        | Currently Redis-only (ephemeral). Docs require persistent tracking with 90-day TTL                                          |
| G5  | **User Session management routes**        | BUILD_RULES §17.7, SECURITY §9.1          | Model exists but NO routes for: list active sessions, remote logout single/all, max 5 concurrent                            |
| G6  | **`domains` collection model**            | V2_DATABASE §4.14                         | Roadmap says "DNS + SSL" but no task to create the Mongoose model + CRUD routes                                             |
| G7  | **`backup_config` singleton model**       | V2_DATABASE §4.13, MASTER_PLAN §34        | Configuration for schedule, retention, encryption settings — not implemented                                                |
| G8  | **Admin + Developer Dockerfiles**         | docker-compose.yml (references them)      | docker-compose defines services for admin/developer but Dockerfiles don't exist                                             |
| G9  | **pino-axiom transport wiring**           | TECH_REQUIREMENTS §8, V2_DECISION_LOG §28 | Package installed (`pino-axiom` 1.0.0) but never configured as transport target                                             |
| G10 | **Sentry source map upload in CI**        | SECURITY §8, TECH_REQUIREMENTS §4         | Source maps disabled in prod (correct) but no upload to Sentry for debugging                                                |
| G11 | **CI/CD deploy workflow completion**      | BUILD_RULES §20, V2_DECISION_LOG §11      | All 3 deploy workflows are stubs (`echo "Deploy step"`) — need actual Railway/Vercel CLIs                                   |
| G12 | **Staging environment setup**             | V2_DECISION_LOG §27, BUILD_RULES §20.3    | 3-tier defined (Preview→Staging→Prod) but no staging branch/workflow exists                                                 |
| G13 | **Monthly automated backup restore-test** | SECURITY_AND_ENCRYPTION §14.3             | Required for HIPAA. No automation for monthly restore verification                                                          |
| G14 | **Bundle size analysis tooling**          | IMPLEMENTATION_ROADMAP (Performance task) | No `rollup-plugin-visualizer` or CI bundle check — "Bundle Size Audit" has no tooling                                       |

### What the Roadmap is MISSING — Frontend / UI (❌ UI Gaps Found)

The original plan is **backend-heavy**. Cross-referencing DEV_PORTAL_SCREENS.md, ADMIN_PORTAL_SCREENS.md, and MASTER_PLAN reveals **14 UI screens** required for Phase 6, of which **10 have zero implementation tasks** in the plan.

#### Current Frontend Status

| App           | Phase 6 folders in `features/`                                                                                | Status                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Developer** | `backups/` (BackupsPage — **mock data**, no real API), `support/` (SupportPage — **tickets only, mock data**) | 2 partial, 8 placeholder routes, 7 missing feature folders |
| **Admin**     | None                                                                                                          | 0 Phase 6 features exist                                   |

#### UI Gaps

| #       | Gap                                                                                                 | App       | Required By                                                  | Status                                                     |
| ------- | --------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| G-UI-1  | **Monitoring — Error Dashboard** (3 sub-pages: ErrorDashboard, ErrorList, HealthStatus)             | Developer | DEV_PORTAL_SCREENS §6, MASTER_PLAN §7                        | Placeholder only — no code                                 |
| G-UI-2  | **Domains Page** (domain list, DNS verification, SSL status, required records)                      | Developer | DEV_PORTAL_SCREENS sidebar, MASTER_PLAN §6                   | Placeholder only — no code                                 |
| G-UI-3  | **Deployments Page** (deploy history, version tracking, rollback)                                   | Developer | DEV_PORTAL_SCREENS sidebar, MASTER_PLAN §4                   | Placeholder only — no code                                 |
| G-UI-4  | **Billing Page** (MRR, revenue breakdown, invoices, payments, dunning)                              | Developer | DEV_PORTAL_SCREENS §7                                        | Placeholder only — no code                                 |
| G-UI-5  | **Audit Logs Page** (search/filter by tenant/action/user/date)                                      | Developer | DEV_PORTAL_SCREENS §11                                       | Placeholder only — no code                                 |
| G-UI-6  | **System Logs Page** (pino-axiom log viewer, error_logs collection)                                 | Developer | DEV_PORTAL_SCREENS sidebar, MASTER_PLAN sidebar              | Placeholder only — no code                                 |
| G-UI-7  | **User Sessions Page** (platform-wide session list, revoke, device info)                            | Developer | DEV_PORTAL_SCREENS §12                                       | No code at all                                             |
| G-UI-8  | **Settings > Sessions Tab** (My Devices + Staff Sessions)                                           | Admin     | ADMIN_PORTAL_SCREENS §13, BUILD_RULES §17.7, MASTER_PLAN §27 | No code at all                                             |
| G-UI-9  | **Support Session Banner** (persistent banner during active support)                                | Admin     | MASTER_PLAN §9                                               | Mentioned in plan task 6.3 — no detail, no code            |
| G-UI-10 | **Support Sessions Tab** (add to existing SupportPage — session list/start/end)                     | Developer | DEV_PORTAL_SCREENS §8                                        | Plan task 6.4 — partial mention, code only has Tickets tab |
| G-UI-11 | **BackupsPage → Wire to Real API** (replace mock data with hooks)                                   | Developer | Backup backend tasks 3.1-3.10                                | Code exists with `mockBackups` array, no API integration   |
| G-UI-12 | **SupportPage (Tickets) → Wire to Real API** (replace mock data)                                    | Developer | Support ticket backend exists                                | Code exists with `mockTickets` array, no API integration   |
| G-UI-13 | **Backup Config Panel** (schedule, retention, encryption settings UI)                               | Developer | DEV_PORTAL_SCREENS §9, V2_DATABASE §4.13                     | No code — only backend planned                             |
| G-UI-14 | **Monitoring Health Status Sub-page** (live component status: DB, Redis, S3, per-tenant drill-down) | Developer | DEV_PORTAL_SCREENS §6, MASTER_PLAN                           | No code                                                    |

---

## 2. Week 26 — Monitoring + Hardening

### Day 1-2: Sentry + Error Tracking

| #   | Task                              | Details                                                                                                                                                 | Files    |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1.1 | **Sentry API Init**               | Create `apps/api/src/plugins/sentry.plugin.ts` — `Sentry.init()` with DSN from env, traces, Fastify integration                                         | New file |
| 1.2 | **Sentry Admin Init**             | Create `apps/admin/src/lib/sentry.ts` — `Sentry.init()` with React Router integration, Error Boundary                                                   | New file |
| 1.3 | **Sentry Developer Init**         | Create `apps/developer/src/lib/sentry.ts` — Same pattern as admin                                                                                       | New file |
| 1.4 | **Sentry Error Boundary**         | Wrap `<App />` in `Sentry.ErrorBoundary` with fallback UI in both admin + developer                                                                     | Modified |
| 1.5 | **`error_logs` Model** _(Gap G1)_ | Create `apps/api/src/platform/models/error-log.model.ts` — dedup fingerprint (MD5 of message+stack+source), 4 indexes, 90-day TTL per V2_DATABASE §4.11 | New file |
| 1.6 | **Error Log Service** _(Gap G1)_  | Create `apps/api/src/platform/services/error-log.service.ts` — log, query, aggregate, dedup, auto-cleanup                                               | New file |
| 1.7 | **Error Log Routes** _(Gap G1)_   | Create `apps/api/src/platform/routes/error-logs/error-logs.route.ts` — GET list, GET stats, GET by fingerprint                                          | New file |
| 1.8 | **Sentry + Error Log Hook**       | On Sentry `beforeSend`, also write to `error_logs` collection for persistent storage                                                                    | Modified |

### Day 2-3: Health Checks + Logging

| #   | Task                             | Details                                                                                                            | Files    |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| 2.1 | **Enhanced Health Check**        | Rewrite `health.route.ts` — add MongoDB ping, Redis ping, S3 head-bucket check, response includes component status | Modified |
| 2.2 | **pino-axiom Wiring** _(Gap G9)_ | Configure pino-axiom as transport target in `logger.ts` when `AXIOM_TOKEN` + `AXIOM_DATASET` env vars present      | Modified |
| 2.3 | **Custom requestId Generator**   | Add `genReqId` to Fastify using `nanoid(16)` for shorter trace IDs                                                 | Modified |

### Day 3-4: Backup System (Real Implementation)

| #    | Task                                 | Details                                                                                                                                                                                                       | Files    |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 3.1  | **BullMQ Backup Worker**             | Create `apps/api/src/workers/backup.worker.ts` — BullMQ worker that executes: mongodump → gzip → AES-256-GCM encrypt (HKDF tenant key) → SHA-256 checksum → S3/R2 upload → update backup record → TTL cleanup | New file |
| 3.2  | **BullMQ Backup Queue**              | Create `apps/api/src/queues/backup.queue.ts` — queue definition + cron schedule (03:00 daily)                                                                                                                 | New file |
| 3.3  | **Backup Encryption Utils**          | Create `apps/api/src/utils/backup-crypto.ts` — AES-256-GCM encrypt/decrypt streams, HKDF key derivation, SHA-256 checksum                                                                                     | New file |
| 3.4  | **S3/R2 Client**                     | Create `apps/api/src/config/s3.ts` — AWS SDK S3 client configured for Cloudflare R2 or S3                                                                                                                     | New file |
| 3.5  | **Replace Simulated Backup**         | Rewrite `backups.route.ts` — replace `simulateBackupProcess()` with real BullMQ job dispatch                                                                                                                  | Modified |
| 3.6  | **Backup Restore Endpoint**          | Add `POST /api/backups/:id/restore` — download from S3, decrypt, verify checksum, mongorestore                                                                                                                | Modified |
| 3.7  | **Backup Download (Presigned URL)**  | Implement real presigned URL generation for backup download                                                                                                                                                   | Modified |
| 3.8  | **`backup_config` Model** _(Gap G7)_ | Create `apps/api/src/platform/models/backup-config.model.ts` — singleton config: schedule, retention days, encryption enabled, S3 bucket/region                                                               | New file |
| 3.9  | **Backup Config Routes** _(Gap G7)_  | Add GET/PUT `/api/backups/config` — read and update backup configuration                                                                                                                                      | Modified |
| 3.10 | **Monthly Restore Test** _(Gap G13)_ | Add BullMQ cron job (1st of month) — pick latest backup → restore to temp DB → verify → cleanup → log result                                                                                                  | New file |

### Day 4-5: Security Audit + Performance

| #    | Task                                       | Details                                                                                                                                       | Files     |
| ---- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 4.1  | **Security Audit (91 Checkpoints)**        | Go through all 91 items in SECURITY_AND_ENCRYPTION.md — document pass/fail/N-A for each                                                       | Doc       |
| 4.2  | **HIPAA/GDPR Compliance Check**            | Verify: tenant isolation, audit trails, PII encryption, data export, retention policies, consent tracking                                     | Doc       |
| 4.3  | **Dependency Audit**                       | Run `pnpm audit`, resolve any high/critical vulnerabilities                                                                                   | Terminal  |
| 4.4  | **MongoDB Index Review**                   | Review all models for missing indexes, compound indexes, explain slow queries                                                                 | Modified  |
| 4.5  | **Bundle Size Analysis** _(Gap G14)_       | Install `rollup-plugin-visualizer` in admin + developer, add `analyze` script, CI bundle size check                                           | Modified  |
| 4.6  | **`login_attempts` Collection** _(Gap G4)_ | Create `apps/api/src/platform/models/login-attempt.model.ts` — persistent tracking alongside Redis, 90-day TTL, indexes on email+ip+createdAt | New file  |
| 4.7  | **Login Attempt Recording** _(Gap G4)_     | Modify `brute-force.ts` to also write failed attempts to MongoDB (dual-write: Redis for speed + MongoDB for audit)                            | Modified  |
| 4.8  | **Pen Test Prep** _(Gap G3)_               | Create OWASP ZAP baseline config (`scripts/security/zap-baseline.conf`), nuclei templates for Dento-specific checks                           | New files |
| 4.9  | **Pen Test Execution** _(Gap G3)_          | Run OWASP ZAP baseline scan + nuclei scan against local/staging, document findings                                                            | Doc       |
| 4.10 | **Security CI Workflow** _(Gap G3)_        | Add `security-scan.yml` — OWASP ZAP baseline + `npm audit` on PR to main                                                                      | New file  |

### Day 5: User Session Management _(Gap G5)_

| #   | Task                          | Details                                                                                                                      | Files    |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- |
| 5.1 | **Session Management Routes** | Create `apps/api/src/tenant/routes/auth/sessions.route.ts` — GET active sessions, DELETE single session, DELETE all sessions | New file |
| 5.2 | **Max 5 Concurrent Sessions** | Enforce max 5 active sessions per user — on new login, auto-revoke oldest if limit exceeded                                  | Modified |
| 5.3 | **Session Schemas**           | Add session list/revoke schemas to `@dento/shared`                                                                           | Modified |

---

## 3. Week 27 — Deploy + Support + Polish

### Day 1-2: Tailscale + Support Sessions

| #   | Task                               | Details                                                                                                | Files     |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ | --------- |
| 6.1 | **Tailscale Config**               | Create `apps/api/src/config/tailscale.ts` — Tailscale API client for ephemeral auth keys               | New file  |
| 6.2 | **Tailscale Support Flow**         | Modify impersonation routes — on session start, generate Tailscale ephemeral key, create secure tunnel | Modified  |
| 6.3 | **Support Session Banner**         | Admin portal: show persistent banner when support session is active (operator name, timer, end button) | New file  |
| 6.4 | **Support Sessions Dev Portal UI** | Developer portal: Start/End session page, session log, session history                                 | New files |

### Day 2-3: Production Deployment

| #   | Task                                            | Details                                                                                                                          | Files    |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 7.1 | **Complete `deploy-api.yml`** _(Gap G11)_       | Replace stub with: Docker build → push to GHCR → Railway deploy via CLI                                                          | Modified |
| 7.2 | **Complete `deploy-admin.yml`** _(Gap G11)_     | Replace stub with: pnpm build → Vercel CLI deploy → purge CDN                                                                    | Modified |
| 7.3 | **Complete `deploy-developer.yml`** _(Gap G11)_ | Same pattern as admin                                                                                                            | Modified |
| 7.4 | **Staging Workflow** _(Gap G12)_                | Create `deploy-staging.yml` — auto-deploy on push to `staging` branch, Railway staging env + Vercel preview                      | New file |
| 7.5 | **Admin Dockerfile** _(Gap G8)_                 | Create `apps/admin/Dockerfile` — multi-stage: deps → build → nginx serve                                                         | New file |
| 7.6 | **Developer Dockerfile** _(Gap G8)_             | Create `apps/developer/Dockerfile` — same pattern as admin                                                                       | New file |
| 7.7 | **Docker Compose Production**                   | Create `docker-compose.prod.yml` — production overrides: resource limits, healthchecks, restart policies                         | New file |
| 7.8 | **Sentry Source Map Upload** _(Gap G10)_        | Add `@sentry/vite-plugin` to admin + developer vite configs — upload source maps during CI build, keep disabled in served bundle | Modified |

### Day 3-4: DNS + SSL + Domains

| #   | Task                           | Details                                                                                                                                                             | Files    |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 8.1 | **`domains` Model** _(Gap G6)_ | Create `apps/api/src/platform/models/domain.model.ts` per V2_DATABASE §4.14 — slug, customDomain, dnsVerified, sslStatus, sslExpiresAt, requiredRecords, verifiedAt | New file |
| 8.2 | **Domain Types**               | Add `IDomain`, `CreateDomainInput`, `DomainVerifyResult` to `@dento/shared`                                                                                         | Modified |
| 8.3 | **Domains Routes**             | Create `apps/api/src/platform/routes/domains/domains.route.ts` — CRUD + verify DNS + check SSL                                                                      | New file |
| 8.4 | **Cloudflare Integration**     | Create `apps/api/src/services/cloudflare.service.ts` — DNS record management via Cloudflare API                                                                     | New file |
| 8.5 | **SSL Certificate Check**      | Cron job to check SSL expiry for all custom domains, alert 30 days before expiry                                                                                    | New file |

### Day 4: v1→v2 Migration _(Gap G2)_

| #   | Task                       | Details                                                                                                                                                   | Files     |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 9.1 | **Migration CLI Scaffold** | Create `apps/api/src/scripts/migrate-v1/index.ts` — CLI with progress bar, dry-run mode, per-collection migration                                         | New file  |
| 9.2 | **Collection Migrators**   | Create individual migrators per V2_DECISION_LOG §7 (15-step dependency order): `migrate-users.ts`, `migrate-patients.ts`, `migrate-appointments.ts`, etc. | New files |
| 9.3 | **Bcrypt→Argon2id Compat** | On first login after migration, detect bcrypt hash → verify → re-hash with Argon2id → update                                                              | Modified  |
| 9.4 | **Migration Types**        | Add `MigrationRun`, `MigrationStep`, `MigrationResult` types to `@dento/shared`                                                                           | Modified  |

### Day 5: Documentation + Smoke Test

| #    | Task                      | Details                                                                                                                     | Files    |
| ---- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| 10.1 | **README.md Update**      | Complete project README: setup, env vars, development, testing, deployment                                                  | Modified |
| 10.2 | **Deployment Guide**      | Create `docs/DEPLOYMENT.md` — step-by-step: Railway, Vercel, Cloudflare, env config, monitoring                             | New file |
| 10.3 | **API Documentation**     | Verify Swagger is complete (all routes tagged and documented), export OpenAPI JSON                                          | Verify   |
| 10.4 | **Smoke Test Script**     | Create `scripts/smoke-test.ts` — E2E: create tenant → login → create patient → create appointment → create invoice → verify | New file |
| 10.5 | **Production Smoke Test** | Run smoke test against production after deploy                                                                              | Manual   |

---

## 4. Week 26-27 — Frontend / UI Implementation

> **Note:** Frontend tasks run in parallel with backend tasks. Each page is implemented after its corresponding backend API is ready. Uses existing project patterns: React 19, TanStack Query hooks, `@dento/ui` primitives, Recharts, TanStack Table.

### 4A. Developer Portal — Monitoring (3 Pages) _(G-UI-1, G-UI-14)_

#### 4A.1 Monitoring — Error Dashboard

| #      | Task                        | Details                                                                                                                                                                                     | Files |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| UI-1.1 | **Feature folder**          | Create `apps/developer/src/features/monitoring/` with `pages/`, `hooks/`, `components/`                                                                                                     | New   |
| UI-1.2 | **MonitoringPage.tsx**      | Main page with 3 tabs: Errors, Health, Overview. Stats cards: Error Count (24h), Uptime % (30d), Avg Response Time, Active Alerts. Error Timeline bar chart (Recharts). Recent Errors table | New   |
| UI-1.3 | **useMonitoringStats hook** | TanStack Query — `GET /api/error-logs/stats` + `GET /health` aggregation                                                                                                                    | New   |
| UI-1.4 | **ErrorTimelineChart.tsx**  | Recharts BarChart — errors per hour/day grouped by source (api/admin/developer)                                                                                                             | New   |
| UI-1.5 | **RecentErrorsTable.tsx**   | TanStack Table — fingerprint, message, source, occurrences, lastSeenAt, resolved badge                                                                                                      | New   |

#### 4A.2 Monitoring — Error List

| #      | Task                     | Details                                                                                                                                      | Files |
| ------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| UI-2.1 | **ErrorListPage.tsx**    | Full paginated DataTable of error_logs. Filters: source, level, tenant, resolved status, date range. Actions: resolve/unresolve, view detail | New   |
| UI-2.2 | **useErrorLogs hook**    | TanStack Query — `GET /api/error-logs` with pagination + filters                                                                             | New   |
| UI-2.3 | **ErrorDetailSheet.tsx** | Side sheet showing full error: stack trace, metadata, occurrence history, tenant context                                                     | New   |
| UI-2.4 | **useResolveError hook** | TanStack Mutation — `PATCH /api/error-logs/:id/resolve`                                                                                      | New   |

#### 4A.3 Monitoring — Health Status _(G-UI-14)_

| #      | Task                        | Details                                                                                                                                                                 | Files |
| ------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| UI-3.1 | **HealthStatusPage.tsx**    | Live component cards: MongoDB (up/down + latency), Redis (up/down + latency), S3/R2 (up/down), API Uptime %. Auto-refresh every 30s. Per-tenant health drill-down table | New   |
| UI-3.2 | **useHealthStatus hook**    | TanStack Query — `GET /health` with 30s refetchInterval                                                                                                                 | New   |
| UI-3.3 | **ComponentStatusCard.tsx** | Reusable card: service name, status indicator (green/red/yellow), latency, last check time                                                                              | New   |

#### 4A.4 Router + Sidebar Update

| #      | Task                               | Details                                                                                                                                                    | Files    |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UI-4.1 | **Replace Monitoring placeholder** | Replace `<PlaceholderPage title="Monitoring" />` with real `<MonitoringPage />` + sub-routes for `/monitoring`, `/monitoring/errors`, `/monitoring/health` | Modified |

---

### 4B. Developer Portal — Domains Page _(G-UI-2)_

| #      | Task                            | Details                                                                                                                                 | Files    |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UI-5.1 | **Feature folder**              | Create `apps/developer/src/features/domains/` with `pages/`, `hooks/`, `components/`                                                    | New      |
| UI-5.2 | **DomainsPage.tsx**             | DataTable: tenant, custom domain, DNS verified badge, SSL status badge, SSL expiry, actions (verify/activate/delete). Add Domain dialog | New      |
| UI-5.3 | **useDomains hook**             | TanStack Query — `GET /api/domains`                                                                                                     | New      |
| UI-5.4 | **useCreateDomain hook**        | TanStack Mutation — `POST /api/domains`                                                                                                 | New      |
| UI-5.5 | **useVerifyDomain hook**        | TanStack Mutation — `POST /api/domains/:id/verify`                                                                                      | New      |
| UI-5.6 | **DomainDetailSheet.tsx**       | Side sheet: required DNS records table (type, name, value, verified), SSL details, re-verify button                                     | New      |
| UI-5.7 | **AddDomainDialog.tsx**         | Dialog form: tenant select, custom domain input, auto-generate required records                                                         | New      |
| UI-5.8 | **Replace Domains placeholder** | Replace `<PlaceholderPage title="Domains" />` with `<DomainsPage />`                                                                    | Modified |

---

### 4C. Developer Portal — Backups Upgrade _(G-UI-11, G-UI-13)_

| #      | Task                                  | Details                                                                                                                                                             | Files    |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UI-6.1 | **useBackups hook**                   | TanStack Query — `GET /api/backups` (replace `mockBackups`)                                                                                                         | New      |
| UI-6.2 | **useBackupStats hook**               | TanStack Query — `GET /api/backups/stats`                                                                                                                           | New      |
| UI-6.3 | **useTriggerBackup hook**             | TanStack Mutation — `POST /api/backups`                                                                                                                             | New      |
| UI-6.4 | **useRestoreBackup hook**             | TanStack Mutation — `POST /api/backups/:id/restore`                                                                                                                 | New      |
| UI-6.5 | **useBackupConfig hook**              | TanStack Query — `GET /api/backups/config`                                                                                                                          | New      |
| UI-6.6 | **useUpdateBackupConfig hook**        | TanStack Mutation — `PUT /api/backups/config`                                                                                                                       | New      |
| UI-6.7 | **BackupConfigPanel.tsx** _(G-UI-13)_ | Config panel above backup list: schedule toggle + cron, retention days, encryption enabled, storage provider, last backup time, last restore test time. Save button | New      |
| UI-6.8 | **Wire BackupsPage.tsx**              | Remove `mockBackups` array, import hooks, add restore button per backup, add config panel, add real trigger backup action                                           | Modified |

---

### 4D. Developer Portal — Support Page Upgrade _(G-UI-10, G-UI-12)_

| #      | Task                            | Details                                                                                                                                       | Files    |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UI-7.1 | **useSupportTickets hook**      | TanStack Query — `GET /api/support` (replace `mockTickets`)                                                                                   | New      |
| UI-7.2 | **useSupportSessions hook**     | TanStack Query — `GET /api/admin/impersonation/sessions`                                                                                      | New      |
| UI-7.3 | **useStartSession hook**        | TanStack Mutation — `POST /api/admin/tenants/:slug/impersonate`                                                                               | New      |
| UI-7.4 | **useEndSession hook**          | TanStack Mutation — `POST /api/admin/impersonation/sessions/:id/end`                                                                          | New      |
| UI-7.5 | **SessionsTab.tsx** _(G-UI-10)_ | New tab in SupportPage: Active Sessions table (operator, tenant, started, timer, actions: end/view), Past Sessions table with full action log | New      |
| UI-7.6 | **StartSessionDialog.tsx**      | Dialog: select tenant, confirm impersonation, shows generated session ID                                                                      | New      |
| UI-7.7 | **SessionDetailSheet.tsx**      | Side sheet: session timeline, all actions performed, audit trail                                                                              | New      |
| UI-7.8 | **Wire SupportPage.tsx**        | Remove `mockTickets`, add Tabs (Tickets / Sessions), import hooks                                                                             | Modified |

---

### 4E. Developer Portal — Audit Logs Page _(G-UI-5)_

| #      | Task                          | Details                                                                                                                                                | Files    |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| UI-8.1 | **Feature folder**            | Create `apps/developer/src/features/audit/` with `pages/`, `hooks/`, `components/`                                                                     | New      |
| UI-8.2 | **AuditLogsPage.tsx**         | DataTable with filters: tenant select, action type, user, resource, date range. Table: timestamp, user, action, resource type, resource ID, tenant, IP | New      |
| UI-8.3 | **useAuditLogs hook**         | TanStack Query — `GET /api/audit-logs` with pagination + filters                                                                                       | New      |
| UI-8.4 | **AuditLogDetailSheet.tsx**   | Side sheet: full before/after diff, metadata, request ID, user agent                                                                                   | New      |
| UI-8.5 | **Replace Audit placeholder** | Replace `<PlaceholderPage title="Audit" />` with `<AuditLogsPage />`                                                                                   | Modified |

---

### 4F. Developer Portal — System Logs Page _(G-UI-6)_

| #      | Task                                | Details                                                                                                                                                                   | Files    |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UI-9.1 | **Feature folder**                  | Create `apps/developer/src/features/system-logs/` with `pages/`, `hooks/`                                                                                                 | New      |
| UI-9.2 | **SystemLogsPage.tsx**              | Error log viewer (from `error_logs` collection). Filters: source, level, date range. Log entries with expandable stack traces. Link to Axiom dashboard for full pino logs | New      |
| UI-9.3 | **useSystemLogs hook**              | TanStack Query — `GET /api/error-logs` (reuses error log API with different filters)                                                                                      | New      |
| UI-9.4 | **Replace System Logs placeholder** | Replace placeholder with `<SystemLogsPage />`                                                                                                                             | Modified |

---

### 4G. Developer Portal — User Sessions Page _(G-UI-7)_

| #       | Task                      | Details                                                                                                                                                                                                                      | Files    |
| ------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UI-10.1 | **Feature folder**        | Create `apps/developer/src/features/user-sessions/` with `pages/`, `hooks/`                                                                                                                                                  | New      |
| UI-10.2 | **UserSessionsPage.tsx**  | Platform-wide session view. Summary cards: Active Sessions, Unique Users, Active Tenants. DataTable: user, email, device type, browser, OS, IP, last activity, tenant, actions (revoke). Bulk revoke all sessions for a user | New      |
| UI-10.3 | **useUserSessions hook**  | TanStack Query — `GET /api/sessions` (platform-level endpoint to list all active sessions)                                                                                                                                   | New      |
| UI-10.4 | **useRevokeSession hook** | TanStack Mutation — `DELETE /api/sessions/:id`                                                                                                                                                                               | New      |
| UI-10.5 | **Add route + sidebar**   | Register `/user-sessions` route, add to sidebar under "Security" group                                                                                                                                                       | Modified |

---

### 4H. Developer Portal — Deployments Page _(G-UI-3)_

| #       | Task                                | Details                                                                                                                                                                                                                     | Files    |
| ------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UI-11.1 | **Feature folder**                  | Create `apps/developer/src/features/deployments/` with `pages/`, `hooks/`                                                                                                                                                   | New      |
| UI-11.2 | **DeploymentsPage.tsx**             | Deployment history table: service (API/Admin/Developer), version/commit, environment (staging/prod), status (success/failed/in-progress), deployed by, timestamp. Manual deploy trigger button per service. Rollback action | New      |
| UI-11.3 | **useDeployments hook**             | TanStack Query — `GET /api/deployments` (requires deployment tracking backend, or GitHub Actions API)                                                                                                                       | New      |
| UI-11.4 | **DeployDetailSheet.tsx**           | Side sheet: build logs, duration, commit info, environment variables diff                                                                                                                                                   | New      |
| UI-11.5 | **Replace Deployments placeholder** | Replace `<PlaceholderPage title="Deployments" />` with `<DeploymentsPage />`                                                                                                                                                | Modified |

---

### 4I. Developer Portal — Billing Page _(G-UI-4)_

| #       | Task                            | Details                                                                                                                                                                                          | Files    |
| ------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| UI-12.1 | **Feature folder**              | Create `apps/developer/src/features/billing/` with `pages/`, `hooks/`, `components/`                                                                                                             | New      |
| UI-12.2 | **BillingPage.tsx**             | Stats cards: MRR, Collected This Month, Collection Rate %, Overdue Amount. Tabs: Revenue (bar chart by module/month), Invoices (DataTable), Payments (DataTable), Dunning (overdue tenants list) | New      |
| UI-12.3 | **useBillingStats hook**        | TanStack Query — `GET /api/billing/stats`                                                                                                                                                        | New      |
| UI-12.4 | **useInvoices hook**            | TanStack Query — `GET /api/billing/invoices` (platform-level SaaS invoices)                                                                                                                      | New      |
| UI-12.5 | **RevenueChart.tsx**            | Recharts BarChart — MRR breakdown by module/plan over time                                                                                                                                       | New      |
| UI-12.6 | **DunningTable.tsx**            | Table of overdue tenants: tenant name, amount owed, days overdue, last payment, action (send reminder)                                                                                           | New      |
| UI-12.7 | **Replace Billing placeholder** | Replace `<PlaceholderPage title="Billing" />` with `<BillingPage />`                                                                                                                             | Modified |

> **Note:** Billing backend (platform-level SaaS invoicing for tenants) may need a `billing` route + service if not already built. This is separate from tenant-level financial module (Phase 4). If backend is not ready, implement with mock data and wire later.

---

### 4J. Admin Portal — Sessions Tab _(G-UI-8)_

| #       | Task                             | Details                                                                                                                                                                                                                                                                                                           | Files    |
| ------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UI-13.1 | **Feature folder**               | Create `apps/admin/src/features/settings/components/` if not exists                                                                                                                                                                                                                                               | New      |
| UI-13.2 | **SessionsTab.tsx**              | "My Active Sessions" section: device cards (browser icon, OS, location/IP, last activity, "Current Session" badge, "End Session" button). "End All Other Sessions" button. **Staff Sessions** section (tenant_admin only): DataTable of all staff sessions — user, device, location, last activity, revoke button | New      |
| UI-13.3 | **useMySessionsList hook**       | TanStack Query — `GET /api/auth/sessions` (user's own sessions)                                                                                                                                                                                                                                                   | New      |
| UI-13.4 | **useStaffSessions hook**        | TanStack Query — `GET /api/auth/sessions/staff` (all staff sessions for tenant)                                                                                                                                                                                                                                   | New      |
| UI-13.5 | **useRevokeSession hook**        | TanStack Mutation — `DELETE /api/auth/sessions/:id`                                                                                                                                                                                                                                                               | New      |
| UI-13.6 | **useRevokeAllSessions hook**    | TanStack Mutation — `DELETE /api/auth/sessions` (revoke all except current)                                                                                                                                                                                                                                       | New      |
| UI-13.7 | **DeviceCard.tsx**               | Card component: browser icon, device type (desktop/mobile/tablet), OS, IP, last active relative time, current badge, end button                                                                                                                                                                                   | New      |
| UI-13.8 | **Add Sessions tab to Settings** | Add "Sessions" tab to the existing Settings page (alongside General, Team, Billing, etc.)                                                                                                                                                                                                                         | Modified |
| UI-13.9 | **Router update**                | Register `/settings/sessions` route in admin router                                                                                                                                                                                                                                                               | Modified |

---

### 4K. Admin Portal — Support Session Banner _(G-UI-9)_

| #       | Task                               | Details                                                                                                                                                                                                                                   | Files    |
| ------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UI-14.1 | **SupportSessionBanner.tsx**       | Fixed banner at top of admin layout. Shows: "Platform support session active — Operator: {name} — Duration: {mm:ss}" + "End Session" button. Only visible when `supportSessionActive` flag is true. Yellow/amber background, high z-index | New      |
| UI-14.2 | **useSupportSessionStatus hook**   | TanStack Query — poll `GET /api/auth/support-session` every 10s to check if an active impersonation session exists for the current tenant                                                                                                 | New      |
| UI-14.3 | **Integrate into DashboardLayout** | Add `<SupportSessionBanner />` to `apps/admin/src/layouts/DashboardLayout.tsx` above the main content                                                                                                                                     | Modified |

---

### 4L. Frontend Tests (All New Pages)

| #      | Task                      | Details                                                                                             | Estimated |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------- | --------- |
| UI-T1  | **Monitoring tests**      | MonitoringPage, ErrorListPage, HealthStatusPage — render, loading, error states, filter interaction | ~15 tests |
| UI-T2  | **Domains tests**         | DomainsPage — render, add domain dialog, verify action, detail sheet                                | ~8 tests  |
| UI-T3  | **Backups wiring tests**  | BackupsPage — verify mock data removed, hooks called, config panel renders                          | ~6 tests  |
| UI-T4  | **Support upgrade tests** | SupportPage — Tabs switch, sessions tab renders, start/end session                                  | ~10 tests |
| UI-T5  | **Audit Logs tests**      | AuditLogsPage — render, filter, detail sheet                                                        | ~6 tests  |
| UI-T6  | **System Logs tests**     | SystemLogsPage — render, filter, log expansion                                                      | ~4 tests  |
| UI-T7  | **User Sessions tests**   | UserSessionsPage — render, revoke action                                                            | ~5 tests  |
| UI-T8  | **Admin Sessions tests**  | SessionsTab — my sessions, staff sessions, revoke, end all                                          | ~8 tests  |
| UI-T9  | **Support Banner tests**  | SupportSessionBanner — show/hide, timer, end action                                                 | ~4 tests  |
| UI-T10 | **Deployments tests**     | DeploymentsPage — render, detail sheet                                                              | ~4 tests  |
| UI-T11 | **Billing tests**         | BillingPage — render, tabs, chart, dunning table                                                    | ~6 tests  |

> **Total estimated new frontend tests: ~76**

---

## 5. Detailed Task Breakdown

### 5.1 Sentry Integration (`apps/api/src/plugins/sentry.plugin.ts`)

```typescript
// New file: apps/api/src/plugins/sentry.plugin.ts
import * as Sentry from '@sentry/node';
import { FastifyInstance } from 'fastify';

export async function registerSentry(app: FastifyInstance) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [Sentry.fastifyIntegration({ app })],
  });

  // Register Sentry error handler
  app.setErrorHandler((error, request, reply) => {
    Sentry.captureException(error, {
      extra: { requestId: request.id, url: request.url },
    });
    // ... existing error handling
  });
}
```

### 5.2 Error Logs Model (V2_DATABASE §4.11)

```typescript
// New file: apps/api/src/platform/models/error-log.model.ts
// Schema fields per V2_DATABASE:
{
  fingerprint:   String,     // MD5(message + stack + source) — dedup key
  level:         'error' | 'fatal' | 'warn',
  message:       String,
  stack:         String,
  source:        'api' | 'admin' | 'developer' | 'mobile' | 'worker',
  endpoint:      String,     // e.g., "POST /api/patients"
  method:        String,
  statusCode:    Number,
  userId:        ObjectId,   // optional
  tenantSlug:    String,     // optional
  requestId:     String,
  userAgent:     String,
  ip:            String,
  metadata:      Mixed,      // additional context
  occurrences:   Number,     // default 1, increment on dedup match
  firstSeenAt:   Date,
  lastSeenAt:    Date,
  resolved:      Boolean,    // default false
  resolvedAt:    Date,
  resolvedBy:    ObjectId,
  createdAt:     Date,       // TTL 90 days
}

// Indexes:
// 1. { fingerprint: 1 } — unique dedup lookup
// 2. { source: 1, level: 1, createdAt: -1 } — dashboard filtering
// 3. { tenantSlug: 1, createdAt: -1 } — tenant error history
// 4. { resolved: 1, lastSeenAt: -1 } — unresolved errors feed
// 5. { createdAt: 1 } — TTL index (90 days)
```

### 5.3 Backup Config Model (V2_DATABASE §4.13)

```typescript
// New file: apps/api/src/platform/models/backup-config.model.ts
// Singleton document:
{
  _id:              'default',        // singleton
  scheduleEnabled:  Boolean,          // default true
  scheduleCron:     String,           // default '0 3 * * *' (03:00 daily)
  retentionDays:    Number,           // default 30
  encryptionEnabled: Boolean,         // default true
  storageProvider:  's3' | 'r2',
  bucket:           String,
  region:           String,
  maxBackupSizeGB:  Number,           // alert threshold
  notifyOnFailure:  Boolean,          // default true
  notifyEmail:      String,
  lastBackupAt:     Date,
  lastRestoreTestAt: Date,
  updatedAt:        Date,
  updatedBy:        ObjectId,
}
```

### 5.4 Domains Model (V2_DATABASE §4.14)

```typescript
// New file: apps/api/src/platform/models/domain.model.ts
{
  tenantSlug:     String,            // ref to tenant
  customDomain:   String,            // e.g., "app.myclinic.com"
  dnsVerified:    Boolean,           // default false
  sslStatus:      'pending' | 'active' | 'expired' | 'error',
  sslExpiresAt:   Date,
  requiredRecords: [{                // DNS records tenant must add
    type: 'CNAME' | 'A' | 'TXT',
    name: String,
    value: String,
    verified: Boolean,
  }],
  verifiedAt:     Date,
  isActive:       Boolean,           // default false until DNS + SSL ok
  createdAt:      Date,
  updatedAt:      Date,
}

// Indexes:
// 1. { customDomain: 1 } — unique
// 2. { tenantSlug: 1 } — lookup by tenant
// 3. { sslExpiresAt: 1 } — SSL renewal check cron
```

### 5.5 Login Attempts Model (V2_DATABASE §4.10)

```typescript
// New file: apps/api/src/platform/models/login-attempt.model.ts
{
  email:       String,
  ipAddress:   String,
  userAgent:   String,
  success:     Boolean,
  failReason:  'invalid_password' | 'user_not_found' | 'account_locked' | '2fa_failed' | 'rate_limited',
  tenantSlug:  String,            // optional (platform login has no tenant)
  userId:      ObjectId,          // optional (null for failed attempts)
  metadata:    Mixed,             // geo-IP, device info
  createdAt:   Date,              // TTL 90 days
}

// Indexes:
// 1. { email: 1, createdAt: -1 } — per-email attempt history
// 2. { ipAddress: 1, createdAt: -1 } — per-IP tracking
// 3. { createdAt: 1 } — TTL index (90 days)
```

### 5.6 v1→v2 Migration (V2_DECISION_LOG §7)

**15-Step Dependency Order:**

1. `platform_users` — bcrypt hashes preserved (re-hash on first login)
2. `tenants` — map v1 clinic to v2 tenant
3. `tenant_settings` — default settings + v1 overrides
4. `users` (tenant) — bcrypt→Argon2id on first login
5. `patients` — encrypt PII fields with tenant key
6. `patient_medical_history` — embed into patient
7. `appointments` — map status values
8. `treatment_plans` — link to patient + appointment
9. `prescriptions` — link to patient + treatment
10. `lab_orders` — link to patient
11. `invoices` — link to patient + treatments
12. `payments` — link to invoices
13. `inventory_items` — per-tenant inventory
14. `x_rays` — re-upload files, update references
15. `audit_logs` — import v1 audit trail

**CLI Flags:**

- `--dry-run` — simulate without writing
- `--tenant=<slug>` — migrate single tenant
- `--from-step=<n>` — resume from step N
- `--verbose` — detailed progress logging

### 5.7 RBAC Permission Mapping for New Routes

Phase 6 introduces 6 new platform API route groups. Each must use `platformGuard(module, action)` middleware. Mapping to the existing 10 `PlatformModule` types from PLATFORM_RBAC.md §5.1:

| New Route Group                         | RBAC Module         | Justification                                     |
| --------------------------------------- | ------------------- | ------------------------------------------------- |
| `/api/platform/error-logs` (Monitoring) | `platform_settings` | Error logs are infrastructure/operations data     |
| `/api/platform/domains`                 | `platform_tenants`  | Domains are per-tenant configuration              |
| `/api/platform/deployments`             | `platform_settings` | Deployment management is infra/ops                |
| `/api/platform/audit-logs`              | `platform_settings` | Audit logs are security/compliance data           |
| `/api/platform/system-logs`             | `platform_settings` | System logs are infrastructure data               |
| `/api/platform/user-sessions`           | `platform_support`  | Session management is a support/security function |
| `/api/backups/config` (Backup Config)   | `platform_backups`  | Already defined in RBAC matrix                    |

> **Note:** No new `PlatformModule` types need to be added. All 6 new route groups map cleanly to the existing 10 modules. The developer portal sidebar already uses `requiredPermission` strings matching this mapping (e.g., `platform_settings.read` for monitoring).

---

## 6. File Inventory (New + Modified)

### New Files (37 Backend + 55 Frontend = 92 Total)

#### Backend New Files (37)

| #   | Path                                                          | Purpose                                      |
| --- | ------------------------------------------------------------- | -------------------------------------------- |
| 1   | `apps/api/src/plugins/sentry.plugin.ts`                       | Sentry API initialization                    |
| 2   | `apps/admin/src/lib/sentry.ts`                                | Sentry Admin initialization + Error Boundary |
| 3   | `apps/developer/src/lib/sentry.ts`                            | Sentry Developer initialization              |
| 4   | `apps/api/src/platform/models/error-log.model.ts`             | Error logs collection (G1)                   |
| 5   | `apps/api/src/platform/services/error-log.service.ts`         | Error log CRUD + dedup                       |
| 6   | `apps/api/src/platform/routes/error-logs/error-logs.route.ts` | Error log API endpoints                      |
| 7   | `apps/api/src/workers/backup.worker.ts`                       | BullMQ backup worker (real mongodump)        |
| 8   | `apps/api/src/queues/backup.queue.ts`                         | BullMQ backup queue + cron                   |
| 9   | `apps/api/src/utils/backup-crypto.ts`                         | AES-256-GCM encrypt/decrypt + HKDF           |
| 10  | `apps/api/src/config/s3.ts`                                   | S3/R2 client configuration                   |
| 11  | `apps/api/src/platform/models/backup-config.model.ts`         | Backup config singleton (G7)                 |
| 12  | `apps/api/src/platform/models/login-attempt.model.ts`         | Persistent login attempts (G4)               |
| 13  | `apps/api/src/platform/models/domain.model.ts`                | Custom domains + SSL (G6)                    |
| 14  | `apps/api/src/platform/routes/domains/domains.route.ts`       | Domain CRUD + DNS verify                     |
| 15  | `apps/api/src/services/cloudflare.service.ts`                 | Cloudflare DNS API                           |
| 16  | `apps/api/src/tenant/routes/auth/sessions.route.ts`           | Session management routes (G5)               |
| 17  | `apps/api/src/config/tailscale.ts`                            | Tailscale API client                         |
| 18  | `apps/api/src/scripts/migrate-v1/index.ts`                    | v1→v2 migration CLI (G2)                     |
| 19  | `apps/api/src/scripts/migrate-v1/migrate-users.ts`            | User migration step                          |
| 20  | `apps/api/src/scripts/migrate-v1/migrate-patients.ts`         | Patient migration step                       |
| 21  | `apps/api/src/scripts/migrate-v1/migrate-appointments.ts`     | Appointment migration step                   |
| 22  | `apps/api/src/scripts/migrate-v1/migrate-treatments.ts`       | Treatment plan migration                     |
| 23  | `apps/api/src/scripts/migrate-v1/migrate-prescriptions.ts`    | Prescription migration                       |
| 24  | `apps/api/src/scripts/migrate-v1/migrate-invoices.ts`         | Invoice + payment migration                  |
| 25  | `apps/api/src/scripts/migrate-v1/migrate-inventory.ts`        | Inventory migration                          |
| 26  | `apps/api/src/scripts/migrate-v1/migrate-xrays.ts`            | X-ray file migration                         |
| 27  | `apps/api/src/scripts/migrate-v1/utils.ts`                    | Migration utilities + progress               |
| 28  | `apps/admin/Dockerfile`                                       | Admin portal Docker build (G8)               |
| 29  | `apps/developer/Dockerfile`                                   | Developer portal Docker build (G8)           |
| 30  | `docker-compose.prod.yml`                                     | Production Docker overrides                  |
| 31  | `.github/workflows/deploy-staging.yml`                        | Staging deploy workflow (G12)                |
| 32  | `.github/workflows/security-scan.yml`                         | OWASP ZAP + nuclei CI (G3)                   |
| 33  | `scripts/security/zap-baseline.conf`                          | OWASP ZAP config (G3)                        |

> **Existing:** `.github/workflows/security.yml` already runs TruffleHog secret scanning on push to `main` + weekly Monday 06:00 UTC. Phase 6 task 4.10 creates a **separate** `security-scan.yml` for OWASP ZAP + nuclei pen test scans. Both coexist.
> | 34 | `scripts/smoke-test.ts` | E2E smoke test script |
> | 35 | `docs/DEPLOYMENT.md` | Deployment guide |
> | 36 | `docs/SECURITY_AUDIT_RESULTS.md` | Security audit documentation |
> | 37 | `docs/HIPAA_GDPR_COMPLIANCE.md` | Compliance check documentation |

#### Frontend — Developer Portal New Files (43)

| #   | Path                                                                        | Purpose                                             |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| 38  | `apps/developer/src/features/monitoring/pages/MonitoringPage.tsx`           | Main monitoring page (tabs: Overview/Errors/Health) |
| 39  | `apps/developer/src/features/monitoring/pages/ErrorListPage.tsx`            | Full error list with filters + pagination           |
| 40  | `apps/developer/src/features/monitoring/pages/HealthStatusPage.tsx`         | Live component health status dashboard              |
| 41  | `apps/developer/src/features/monitoring/hooks/useMonitoringStats.ts`        | Stats query hook                                    |
| 42  | `apps/developer/src/features/monitoring/hooks/useErrorLogs.ts`              | Error logs query hook (paginated)                   |
| 43  | `apps/developer/src/features/monitoring/hooks/useResolveError.ts`           | Resolve/unresolve error mutation                    |
| 44  | `apps/developer/src/features/monitoring/hooks/useHealthStatus.ts`           | Health check query (30s polling)                    |
| 45  | `apps/developer/src/features/monitoring/components/ErrorTimelineChart.tsx`  | Recharts error timeline area chart                  |
| 46  | `apps/developer/src/features/monitoring/components/RecentErrorsTable.tsx`   | TanStack Table recent errors                        |
| 47  | `apps/developer/src/features/monitoring/components/ErrorDetailSheet.tsx`    | Error detail side sheet (stack trace)               |
| 48  | `apps/developer/src/features/monitoring/components/ComponentStatusCard.tsx` | Health status card per component                    |
| 49  | `apps/developer/src/features/domains/pages/DomainsPage.tsx`                 | Domain management page                              |
| 50  | `apps/developer/src/features/domains/hooks/useDomains.ts`                   | Domains list query hook                             |
| 51  | `apps/developer/src/features/domains/hooks/useCreateDomain.ts`              | Create domain mutation                              |
| 52  | `apps/developer/src/features/domains/hooks/useVerifyDomain.ts`              | Verify DNS mutation                                 |
| 53  | `apps/developer/src/features/domains/components/DomainDetailSheet.tsx`      | Domain detail + DNS records sheet                   |
| 54  | `apps/developer/src/features/domains/components/AddDomainDialog.tsx`        | Add domain dialog form                              |
| 55  | `apps/developer/src/features/backups/hooks/useBackups.ts`                   | Backups query (replaces mockBackups)                |
| 56  | `apps/developer/src/features/backups/hooks/useBackupStats.ts`               | Backup statistics query                             |
| 57  | `apps/developer/src/features/backups/hooks/useTriggerBackup.ts`             | Trigger backup mutation                             |
| 58  | `apps/developer/src/features/backups/hooks/useRestoreBackup.ts`             | Restore backup mutation                             |
| 59  | `apps/developer/src/features/backups/hooks/useBackupConfig.ts`              | Backup config query                                 |
| 60  | `apps/developer/src/features/backups/hooks/useUpdateBackupConfig.ts`        | Update backup config mutation                       |
| 61  | `apps/developer/src/features/backups/components/BackupConfigPanel.tsx`      | Backup config panel UI                              |
| 62  | `apps/developer/src/features/support/hooks/useSupportTickets.ts`            | Tickets query (replaces mockTickets)                |
| 63  | `apps/developer/src/features/support/hooks/useSupportSessions.ts`           | Support sessions list query                         |
| 64  | `apps/developer/src/features/support/hooks/useStartSession.ts`              | Start impersonation session mutation                |
| 65  | `apps/developer/src/features/support/hooks/useEndSession.ts`                | End support session mutation                        |
| 66  | `apps/developer/src/features/support/components/SessionsTab.tsx`            | Sessions tab content + table                        |
| 67  | `apps/developer/src/features/support/components/StartSessionDialog.tsx`     | Start session dialog (tenant select)                |
| 68  | `apps/developer/src/features/support/components/SessionDetailSheet.tsx`     | Session timeline/audit log sheet                    |
| 69  | `apps/developer/src/features/audit/pages/AuditLogsPage.tsx`                 | Platform-wide audit logs page                       |
| 70  | `apps/developer/src/features/audit/hooks/useAuditLogs.ts`                   | Audit logs query hook (paginated)                   |
| 71  | `apps/developer/src/features/audit/components/AuditLogDetailSheet.tsx`      | Audit log detail sheet (before/after diff)          |
| 72  | `apps/developer/src/features/system-logs/pages/SystemLogsPage.tsx`          | Server system log viewer                            |
| 73  | `apps/developer/src/features/system-logs/hooks/useSystemLogs.ts`            | System logs query hook                              |
| 74  | `apps/developer/src/features/user-sessions/pages/UserSessionsPage.tsx`      | Platform-wide active sessions                       |
| 75  | `apps/developer/src/features/user-sessions/hooks/useUserSessions.ts`        | User sessions query hook                            |
| 76  | `apps/developer/src/features/user-sessions/hooks/useRevokeSession.ts`       | Revoke session mutation                             |
| 77  | `apps/developer/src/features/deployments/pages/DeploymentsPage.tsx`         | Deployment history page                             |
| 78  | `apps/developer/src/features/deployments/hooks/useDeployments.ts`           | Deployments query hook                              |
| 79  | `apps/developer/src/features/deployments/components/DeployDetailSheet.tsx`  | Deploy detail sheet (commit, status)                |
| 80  | `apps/developer/src/features/billing/pages/BillingPage.tsx`                 | Platform billing / SaaS invoicing page              |

#### Frontend — Developer Portal Billing + Admin Portal (12)

| #   | Path                                                              | Purpose                                  |
| --- | ----------------------------------------------------------------- | ---------------------------------------- |
| 81  | `apps/developer/src/features/billing/hooks/useBillingStats.ts`    | Billing stats query (MRR, churn, etc.)   |
| 82  | `apps/developer/src/features/billing/hooks/useInvoices.ts`        | Platform invoices list query             |
| 83  | `apps/developer/src/features/billing/components/RevenueChart.tsx` | Recharts revenue bar chart               |
| 84  | `apps/developer/src/features/billing/components/DunningTable.tsx` | Overdue tenants TanStack Table           |
| 85  | `apps/admin/src/features/settings/components/SessionsTab.tsx`     | My Devices + Staff Sessions tab          |
| 86  | `apps/admin/src/features/settings/hooks/useMySessionsList.ts`     | My sessions query hook                   |
| 87  | `apps/admin/src/features/settings/hooks/useStaffSessions.ts`      | Staff sessions query hook (admin only)   |
| 88  | `apps/admin/src/features/settings/hooks/useRevokeSession.ts`      | Revoke session mutation                  |
| 89  | `apps/admin/src/features/settings/hooks/useRevokeAllSessions.ts`  | Revoke all sessions mutation             |
| 90  | `apps/admin/src/features/settings/components/DeviceCard.tsx`      | Device info card (browser, OS, location) |
| 91  | `apps/admin/src/components/SupportSessionBanner.tsx`              | Global support session banner            |
| 92  | `apps/admin/src/hooks/useSupportSessionStatus.ts`                 | Poll support session status (10s)        |

### Modified Files (21 Backend + 7 Frontend = 28 Total)

| #   | Path                                                                | Change                                                                        |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | `apps/api/src/server.ts`                                            | Register Sentry plugin, backup queue, session routes                          |
| 2   | `apps/api/src/tenant/routes/health/health.route.ts`                 | Add DB + Redis + S3 health checks                                             |
| 3   | `apps/api/src/utils/logger.ts`                                      | Wire pino-axiom transport (G9)                                                |
| 4   | `apps/api/src/config/env.ts`                                        | Add AXIOM*TOKEN, AXIOM_DATASET, S3*\_, CLOUDFLARE\_\_, TAILSCALE\_\* env vars |
| 5   | `apps/api/src/platform/routes/backups/backups.route.ts`             | Replace simulated backup with real BullMQ dispatch                            |
| 6   | `apps/api/src/platform/models/index.ts`                             | Export new models (error-log, backup-config, login-attempt, domain)           |
| 7   | `apps/api/src/tenant/middleware/brute-force.ts`                     | Dual-write to login_attempts MongoDB collection (G4)                          |
| 8   | `apps/api/src/platform/routes/impersonation/impersonation.route.ts` | Add Tailscale ephemeral key generation                                        |
| 9   | `apps/admin/src/App.tsx`                                            | Wrap in Sentry.ErrorBoundary                                                  |
| 10  | `apps/admin/src/main.tsx`                                           | Import Sentry init                                                            |
| 11  | `apps/developer/src/App.tsx`                                        | Wrap in Sentry.ErrorBoundary                                                  |
| 12  | `apps/developer/src/main.tsx`                                       | Import Sentry init                                                            |
| 13  | `apps/admin/vite.config.ts`                                         | Add @sentry/vite-plugin for source map upload (G10)                           |
| 14  | `apps/developer/vite.config.ts`                                     | Add @sentry/vite-plugin for source map upload (G10)                           |
| 15  | `.github/workflows/deploy-api.yml`                                  | Complete stub with Railway deploy (G11)                                       |
| 16  | `.github/workflows/deploy-admin.yml`                                | Complete stub with Vercel deploy (G11)                                        |
| 17  | `.github/workflows/deploy-developer.yml`                            | Complete stub with Vercel deploy (G11)                                        |
| 18  | `packages/shared/src/types/index.ts`                                | Export domain, session, migration types                                       |
| 19  | `packages/shared/src/schemas/index.ts`                              | Export session schemas                                                        |
| 20  | `README.md`                                                         | Complete project documentation                                                |
| 21  | `.env.example`                                                      | Add all new env vars                                                          |

#### Frontend Modified Files (8)

| #   | Path                                                        | Change                                                                            |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- | --- | --- | -------------------------------------------- | ------------------------------------------------- | --- | --- | --------------------------------------------------------- | -------------------------------------- |
| 22  | `apps/developer/src/router.tsx`                             | Wire monitoring, domains, audit, system-logs, user-sessions, deployments, billing |
| 23  | `apps/developer/src/config/sidebar-config.ts`               | Update placeholder routes → real lazy imports                                     |
| 24  | `apps/developer/src/features/backups/pages/BackupsPage.tsx` | Remove `mockBackups`, wire `useBackups` + `useTriggerBackup` hooks                |
| 25  | `apps/developer/src/features/support/pages/SupportPage.tsx` | Remove `mockTickets`, add Sessions tab, wire `useSupportTickets` hook             |
| 26  | `apps/admin/src/router.tsx`                                 | Add settings/sessions sub-route (if needed)                                       | \n  | 27  | `apps/admin/src/layouts/DashboardLayout.tsx` | Mount `<SupportSessionBanner />` at top of layout | \n  | 28  | `apps/admin/src/features/settings/pages/SettingsPage.tsx` | Add Sessions tab to settings page tabs |

---

## 7. Security Audit Checklist

The **91 checkpoints** from SECURITY_AND_ENCRYPTION.md, grouped by sub-section. Each must be verified PASS/FAIL/N-A during Week 26 Day 4-5.

### 7.1 Network & Transport (6 items)

- [ ] TLS 1.2+ enforced (Railway/Vercel handles)
- [ ] HSTS header with max-age=63072000 (2yr)
- [ ] No mixed content (all HTTPS)
- [ ] Certificate transparency monitoring
- [ ] DNS CAA records configured
- [ ] API behind CDN/proxy (Cloudflare)

### 7.2 Authentication (12 items)

- [ ] Argon2id password hashing (memory=65536, time=3, parallelism=4)
- [ ] JWT access token 15min expiry
- [ ] JWT refresh token 7d expiry (30d remember-me)
- [ ] Refresh token rotation on every use
- [ ] Token stored httpOnly + secure + sameSite=strict cookies
- [ ] TOTP 2FA with otplib + NobleCrypto
- [ ] 10 recovery codes, Argon2id-hashed
- [ ] Progressive brute-force lockout (3→5min … 20→24hr)
- [ ] Generic error messages (no user enumeration)
- [ ] Password complexity: 8+ chars, 1 upper, 1 lower, 1 number, 1 special
- [ ] Account lockout notification email
- [ ] Session invalidation on password change

### 7.3 Authorization (6 items)

- [ ] RBAC with PERMISSION_MATRIX (28 modules × 8 roles × 5 permissions)
- [ ] Tenant isolation via database-per-tenant
- [ ] platform_admin bypass documented and intentional
- [ ] No direct object reference without ownership check
- [ ] API key scoped to tenant + specific permissions
- [ ] Webhook signature verification (HMAC-SHA256)

### 7.4 Encryption (12 items)

- [ ] AES-256-GCM for PII at rest (per-field)
- [ ] HKDF for tenant-specific key derivation
- [ ] ENCRYPTION_MASTER_KEY in env (not in code)
- [ ] Unique IV per encryption operation (12 bytes random)
- [ ] Auth tag verification on decrypt
- [ ] Key rotation support (versioned keys)
- [ ] Backup encryption: AES-256-GCM
- [ ] Backup checksum: SHA-256
- [ ] S3/R2 server-side encryption (SSE)
- [ ] Encrypted fields: phone, email, nationalId, address, allergies, conditions
- [ ] Deterministic encryption for searchable fields
- [ ] No PII in logs (pino redaction configured)

### 7.5 API Security (9 items)

- [ ] Rate limiting: global 100/min, auth 5/min, API key 1000/min
- [ ] Request body size limit (10MB default, 50MB uploads)
- [ ] Helmet with all headers configured
- [ ] CORS restricted to known origins
- [ ] CSP: script-src 'self', no inline, frame-ancestors 'none'
- [ ] X-Request-Id propagation
- [ ] Input validation via Zod on every route
- [ ] SQL/NoSQL injection prevention (parameterized queries)
- [ ] Path traversal prevention on file routes

### 7.6 Input Validation (5 items)

- [ ] Zod schema on every request body
- [ ] Zod schema on every query string
- [ ] Zod schema on every URL parameter
- [ ] Error messages don't expose internal details
- [ ] File upload: type whitelist, size limit, ClamAV scan

### 7.7 File Upload Security (7 items)

- [ ] Allowed types: JPEG, PNG, PDF, DICOM, STL
- [ ] Max file size: 50MB
- [ ] ClamAV virus scan on upload
- [ ] Files stored in S3/R2 with signed URLs (not public)
- [ ] Original filename sanitized
- [ ] Content-Type verified (not just extension)
- [ ] No executable file types allowed

### 7.8 Tenant Isolation (7 items)

- [ ] Database-per-tenant (separate MongoDB databases)
- [ ] Tenant slug validated on every request
- [ ] No cross-tenant data leakage in responses
- [ ] Tenant-scoped indexes
- [ ] Audit logs per-tenant database
- [ ] Backup per-tenant (individual tenant backup support)
- [ ] Tenant deletion: full data purge with confirmation

### 7.9 Audit & Monitoring (6 items)

- [ ] Audit log on every mutation (create/update/delete)
- [ ] Audit log includes: who, what, when, where, before/after diff
- [ ] Audit log retention: 730 days (HIPAA 2-year minimum)
- [ ] Sentry error tracking configured
- [ ] Health check endpoint with component status
- [ ] Structured JSON logging with requestId correlation

### 7.10 Frontend Security (5 items)

- [ ] No secrets in frontend bundle (VITE\_\* prefix check)
- [ ] Source maps disabled in production
- [ ] XSS prevention: React auto-escaping + CSP
- [ ] CSRF: SameSite cookies + custom header check
- [ ] Sensitive data cleared on logout (store reset)

### 7.11 Mobile Security (7 items)

- [ ] SecureStore for tokens (not AsyncStorage)
- [ ] Certificate pinning for API calls
- [ ] Jailbreak/root detection
- [ ] Network security config (Android)
- [ ] App Transport Security (iOS)
- [ ] Realm database encryption (AES-256)
- [ ] Offline data auto-wipe after 30 days

> **Note:** Mobile items (§6.11) are Phase 7. Mark as N/A for Phase 6.

### 7.12 Compliance (4 items)

- [ ] HIPAA: 2-year audit log retention
- [ ] HIPAA: encryption at rest + in transit
- [ ] GDPR/DSGVO: data export (mongodump per tenant)
- [ ] GDPR/DSGVO: right to erasure (tenant deletion flow)

### 7.13 Supply Chain (5 items)

- [ ] Dependabot / Renovate configured
- [ ] `pnpm audit` clean (0 high/critical)
- [ ] TruffleHog secret scanning (CI)
- [ ] Lock file integrity (frozen lockfile in CI)
- [ ] No `eval()` or `Function()` in codebase

---

## 8. Deliverables & Acceptance Criteria

### Phase 6 Deliverables (Updated — includes all backend + frontend gaps)

#### Backend Deliverables

- [ ] **Sentry**: `Sentry.init()` running in API + Admin + Developer; test error captured
- [ ] **Error Logs**: `error_logs` collection created; errors persisted with dedup fingerprint
- [ ] **Health Checks**: `/health` returns DB + Redis + S3 component status
- [ ] **Backup (Real)**: BullMQ worker runs mongodump → gzip → AES-256-GCM → S3/R2 → checksum
- [ ] **Backup Config**: Singleton config for schedule, retention, encryption
- [ ] **Backup Restore**: One-click restore endpoint (download → decrypt → verify → mongorestore)
- [ ] **Monthly Restore Test**: Automated cron verifies backup integrity
- [ ] **Logging**: pino-axiom transport wired for production log shipping
- [ ] **Security Audit**: All 91 checkpoints documented (PASS/FAIL/N-A)
- [ ] **HIPAA/GDPR**: Compliance check documented
- [ ] **Pen Test**: OWASP ZAP + nuclei scan completed, findings documented
- [ ] **Login Attempts**: Persistent MongoDB collection alongside Redis tracking
- [ ] **User Sessions**: Routes for list/revoke sessions, max 5 concurrent enforced
- [ ] **Domains**: `domains` model + CRUD routes + DNS verification
- [ ] **Tailscale**: Secure remote support tunnel integrated
- [ ] **CI/CD Deploy**: All 3 workflows functional (Railway + Vercel × 2)
- [ ] **Staging**: 3-tier deployment (Preview → Staging → Prod)
- [ ] **Dockerfiles**: Admin + Developer Dockerfiles created
- [ ] **v1→v2 Migration**: CLI script with 15-step ETL, dry-run, bcrypt compat
- [ ] **Documentation**: README, Deployment Guide, API docs verified
- [ ] **Smoke Test**: E2E script passing on production
- [ ] **Source Maps**: Sentry upload in CI, disabled in served bundle
- [ ] **Bundle Size**: Analysis tooling + CI check

#### Frontend — Developer Portal Deliverables

- [ ] **Monitoring Dashboard**: 3 sub-pages (Overview, Errors, Health) live with real data; error timeline chart renders; health components show live status with 30s polling
- [ ] **Error Management**: Full error list with server-side pagination, level/status/source filters; resolve/unresolve works; detail sheet shows stack trace + request context
- [ ] **Domains Page**: Domain list with status badges (pending/verified/active/failed); Add Domain dialog with Zod validation; DNS record display; Verify button triggers DNS check
- [ ] **Backups Page (Upgraded)**: All mock data removed; `useBackups` hook fetches from real API; Trigger Backup button dispatches BullMQ job; Restore button works; Backup Config panel reads/writes singleton config
- [ ] **Support Page (Upgraded)**: All mock data removed; Tickets tab fetches from real API; New Sessions tab with session table, Start/End session controls, session detail sheet with audit timeline
- [ ] **Audit Logs Page**: Platform-wide audit logs with cursor pagination; filter by actor/action/resource/date; detail sheet shows before/after JSON diff
- [ ] **System Logs Page**: Server log viewer with level/service/date filters; log detail expansion; auto-refresh toggle
- [ ] **User Sessions Page**: All active sessions across tenants; device/browser/IP info; Revoke Individual + Revoke All buttons work; confirms via dialog
- [ ] **Deployments Page**: Deployment history timeline; commit hash + status + duration; detail sheet with deploy logs
- [ ] **Billing Page**: Revenue stats cards (MRR, active tenants, churn); Recharts revenue bar chart; invoices table with status badges; dunning/overdue table

#### Frontend — Admin Portal Deliverables

- [ ] **Sessions Tab (Settings)**: My Devices sub-tab shows current + past sessions with DeviceCard (browser, OS, IP, last active); Revoke single session + Revoke All Others works; Staff Sessions sub-tab (admin-only) shows all staff sessions for the tenant
- [ ] **Support Session Banner**: Yellow/amber banner at top of DashboardLayout when support session is active; shows agent name + session start time + "End Session" button; polls every 10s via `useSupportSessionStatus`; auto-dismisses when session ends

#### Frontend Test Deliverables

- [ ] **~76 new component/unit tests** (Vitest + Testing Library) across: monitoring (16), domains (10), backups (10), support (12), audit (6), system-logs (4), user-sessions (6), deployments (4), billing (4), admin sessions (4)

> **Note:** The 19 acceptance tests in the table below are **integration/E2E-level** checks (manual or smoke-test). The ~76 tests above are **automated component tests** run by `pnpm test`. Both categories must pass.

### Acceptance Tests

| Test                      | Expected                                                                         |
| ------------------------- | -------------------------------------------------------------------------------- |
| `curl /health`            | Returns `{ status: "healthy", components: { db: "up", redis: "up", s3: "up" } }` |
| Trigger manual backup     | BullMQ job runs, S3 file created, checksum matches, backup record updated        |
| Sentry test error         | Error appears in Sentry dashboard within 30s                                     |
| Support session           | Tailscale tunnel created, impersonation JWT issued, audit log written            |
| Deploy to staging         | `git push origin staging` triggers full deploy pipeline                          |
| Migration dry-run         | `pnpm migrate:v1 --dry-run` reports all steps without writing data               |
| Session management        | User can list devices, revoke single session, revoke all sessions                |
| Custom domain             | Add domain → get DNS records → verify → SSL active                               |
| Monitoring Overview tab   | Stats cards + error timeline chart render with real API data                     |
| Monitoring Errors tab     | Error list paginates, filter by level/status works, resolve toggles status       |
| Monitoring Health tab     | All component status cards show live status, 30s auto-refresh                    |
| Domains page              | Add domain dialog validates input, DNS records display, verify triggers check    |
| Backups page (no mocks)   | Page loads real data via API, trigger backup dispatches job, restore works       |
| Support page Sessions tab | Start session creates impersonation, session table refreshes, end session works  |
| Audit logs page           | Paginated log list loads, detail sheet shows before/after diff                   |
| Admin Sessions tab        | My Devices shows current session highlighted, revoke logs out target device      |
| Admin Support Banner      | Banner appears when support session active, disappears when ended                |
| Billing page              | Revenue chart renders, invoices table loads, dunning table shows overdue         |
| Frontend test suite       | All ~76 new frontend tests pass (`pnpm test --filter=admin --filter=developer`)  |

---

## 9. Dependencies & Risks

### New Dependencies (npm packages)

| Package                         | Version | Purpose                     |
| ------------------------------- | ------- | --------------------------- |
| `@sentry/vite-plugin`           | 10.x    | Source map upload to Sentry |
| `bullmq`                        | 5.x     | Job queue for backup worker |
| `@aws-sdk/client-s3`            | 3.x     | S3/R2 backup storage        |
| `@aws-sdk/s3-request-presigner` | 3.x     | Presigned download URLs     |
| `rollup-plugin-visualizer`      | 0.9.x   | Bundle size analysis        |

> **Already installed:** `@sentry/node`, `@sentry/react`, `pino`, `pino-pretty`, `pino-axiom`, `otplib`, `qrcode`

### Environment Variables (New)

```env
# Sentry (already in .env.example)
SENTRY_DSN=
VITE_SENTRY_DSN=
SENTRY_AUTH_TOKEN=          # For source map upload

# Axiom (Log Shipping)
AXIOM_TOKEN=
AXIOM_DATASET=

# S3/R2 (Backup Storage)
S3_ENDPOINT=                # Cloudflare R2 endpoint
S3_REGION=auto
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=dento-backups

# Cloudflare (DNS/SSL)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=

# Tailscale
TAILSCALE_API_KEY=
TAILSCALE_TAILNET=

# Deployment
RAILWAY_TOKEN=
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID_ADMIN=
VERCEL_PROJECT_ID_DEVELOPER=
```

### Risks & Mitigations

| Risk                              | Impact | Mitigation                                                                                     |
| --------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Tailscale integration >2 weeks    | Medium | V2_DECISION_LOG §22: Ship without Tailscale, implement support via existing impersonation only |
| S3/R2 connectivity in dev         | Low    | Use MinIO locally via docker-compose for S3-compatible storage                                 |
| Railway deployment complexity     | Medium | Start with manual deploy, automate incrementally                                               |
| mongodump requires `mongosh` CLI  | Medium | Use Docker exec or install mongodump in API container                                          |
| Pen test findings blocking deploy | High   | Priority-classify: P1 (block deploy), P2 (fix within 1 week), P3 (backlog)                     |

### Tailscale Rollback (V2_DECISION_LOG §22)

If Tailscale integration takes >2 weeks:

1. Skip Tailscale tunnel (mark as post-launch)
2. Use existing impersonation (already working) with:
   - Session-based JWT with 60-min expiry
   - Full audit trail
   - UI banner showing active support session
3. Revisit Tailscale in Phase 8 (Post-Launch)

---

## Appendix: Cross-Reference to Planning Documents

| Document                | Sections Referenced                                                | Key Extractions                                       |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| DENTO_V2_MASTER_PLAN    | §1, §3, §6, §7, §9, §27, §33, §34                                  | 13 topic areas with endpoints                         |
| SECURITY_AND_ENCRYPTION | §3-§15                                                             | 91 security checkpoints                               |
| TECH_REQUIREMENTS       | §4, §8                                                             | Package versions, env vars                            |
| V2_DATABASE             | §4.10-§4.14                                                        | 9 collection schemas                                  |
| V2_DECISION_LOG         | §7, §8, §9, §11, §17, §19, §22, §27, §28                           | 9 decisions affecting Phase 6                         |
| BUILD_RULES             | §17.7, §17.8, §20, §21                                             | Session rules, CI/CD, logging                         |
| V2_STRUCTURE            | §5                                                                 | File paths, folder conventions                        |
| ADMIN_PORTAL_SCREENS    | Settings, Dashboard                                                | Sessions tab, Support banner                          |
| DEV_PORTAL_SCREENS      | Monitoring, Domains, Backups, Support, Audit, Billing, Deployments | 14 screen definitions                                 |
| PLATFORM_RBAC           | §5.1 PlatformModule types, §5.2 Matrix, §8.5 Route mapping         | 6 new routes mapped to existing 10 modules (see §5.7) |
| IMPLEMENTATION_ROADMAP  | Phase 6 (Wo 20-21)                                                 | Original 14-task plan                                 |
