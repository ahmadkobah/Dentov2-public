# Phase 6 — Gap Implementation Plan

> **Created:** June 2025
> **Source:** `PHASE_6_GAP_ANALYSIS.md` (19 gaps identified)
> **Method:** Deep codebase pattern extraction → compatible implementation specs
> **Codebase Verification Date:** Same session — all patterns verified against live code

---

## Table of Contents

1. [Gap Status Update (Post-Verification)](#1-gap-status-update-post-verification)
2. [Batch Overview](#2-batch-overview)
3. [Batch 7 — Sentry Frontend Init + Shared Types](#3-batch-7--sentry-frontend-init--shared-types)
4. [Batch 8 — Missing Backend API Routes](#4-batch-8--missing-backend-api-routes)
5. [Batch 9 — Audit Logs + System Logs Pages](#5-batch-9--audit-logs--system-logs-pages)
6. [Batch 10 — User Sessions + Deployments Pages](#6-batch-10--user-sessions--deployments-pages)
7. [Batch 11 — Billing Page + Admin Portal Items](#7-batch-11--billing-page--admin-portal-items)
8. [Batch 12 — Backup Restore Test + Frontend Tests](#8-batch-12--backup-restore-test--frontend-tests)
9. [Codebase Pattern Reference](#9-codebase-pattern-reference)
10. [File Inventory Summary](#10-file-inventory-summary)

---

## 1. Gap Status Update (Post-Verification)

After deep-scanning the live codebase, several gaps from the analysis are **already resolved**:

| Gap ID | Description                         | Original Status       | Updated Status  | Evidence                                                                                                                                                                                                               |
| ------ | ----------------------------------- | --------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1** | `platformGuard` middleware          | ❌ Missing            | ✅ **RESOLVED** | Exists at `platform/middleware/index.ts` — exports `platformGuard`, `requirePlatformOwner`, `hasPlatformPermission`, `PLATFORM_PERMISSIONS`. Used in payment routes with `platformGuard('platform_billing', 'create')` |
| **D3** | pino-axiom transport wiring         | ❌ Needs verification | ✅ **RESOLVED** | `logger.ts` has multi-transport with axiom when `AXIOM_TOKEN` env var is set                                                                                                                                           |
| **D4** | Sentry source map upload in CI      | ❌ Not done           | ✅ **RESOLVED** | Both `vite.config.ts` files already have `@sentry/vite-plugin` with conditional `isSentryUpload` upload + `sourcemaps.filesToDeleteAfterUpload`                                                                        |
| **D5** | Bundle size analysis tooling        | ❌ Missing            | ✅ **RESOLVED** | Both `vite.config.ts` files have `rollup-plugin-visualizer` with `ANALYZE=true` trigger                                                                                                                                |
| **A6** | `/api/platform/user-sessions` route | ❌ Partial            | ✅ **RESOLVED** | `platformSessionRoutes` registered at `/api/platform/user-sessions` in `server.ts`                                                                                                                                     |

### Remaining Gaps (14 items → 6 Batches):

| Priority    | Gap                                      | Category | Batch  |
| ----------- | ---------------------------------------- | -------- | ------ |
| 🟡 HIGH     | Frontend Sentry init (admin + developer) | B        | **7**  |
| 🟡 HIGH     | Missing shared types (7 files)           | C        | **7**  |
| 🔴 CRITICAL | Backend: `/api/platform/audit-logs`      | A2       | **8**  |
| 🔴 CRITICAL | Backend: `/api/platform/system-logs`     | A3       | **8**  |
| 🔴 CRITICAL | Backend: `/api/platform/deployments`     | A1       | **8**  |
| 🔴 CRITICAL | Backend: `/api/platform/billing` stats   | A4       | **8**  |
| ❌ NOT DONE | 4E: Audit Logs Page                      | Plan     | **9**  |
| ❌ NOT DONE | 4F: System Logs Page                     | Plan     | **9**  |
| ❌ NOT DONE | 4G: User Sessions Page                   | Plan     | **10** |
| ❌ NOT DONE | 4H: Deployments Page                     | Plan     | **10** |
| ❌ NOT DONE | 4I: Billing Page                         | Plan     | **11** |
| ❌ NOT DONE | 4J: Admin Sessions Tab                   | Plan     | **11** |
| ❌ NOT DONE | 4K: Admin Support Session Banner         | Plan     | **11** |
| 🟠 HIGH     | D2: Monthly backup restore test          | D2       | **12** |
| ❌ NOT DONE | 4L: Frontend Tests                       | Plan     | **12** |

---

## 2. Batch Overview

| Batch  | Title                                    | New Files | Modified Files | Dependencies |
| ------ | ---------------------------------------- | --------- | -------------- | ------------ |
| **7**  | Sentry Frontend + Shared Types           | 9         | 4              | None         |
| **8**  | Missing Backend Routes                   | 8         | 1              | None         |
| **9**  | Audit Logs + System Logs (Dev Portal)    | 8         | 1              | Batch 8      |
| **10** | User Sessions + Deployments (Dev Portal) | 8         | 1              | Batch 8      |
| **11** | Billing Page + Admin Portal              | 11        | 2              | Batch 8      |
| **12** | Backup Restore Test + Frontend Tests     | 2         | 0              | All batches  |
|        | **TOTAL**                                | **46**    | **9**          |              |

---

## 3. Batch 7 — Sentry Frontend Init + Shared Types

**Goal:** Client-side error tracking + type safety for remaining pages.
**Dependencies:** None — can start immediately.

### 3.1 New File: `apps/admin/src/lib/sentry.ts`

**Pattern source:** `apps/api/src/plugins/sentry.plugin.ts` (backend Sentry init)

```typescript
import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `dento-admin@${import.meta.env.VITE_APP_VERSION ?? '2.0.0'}`,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,

    // Scrub PII per SECURITY_AND_ENCRYPTION.md
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.authorization;
      }
      return event;
    },

    ignoreErrors: ['ApiError', 'ResizeObserver loop', 'Non-Error promise rejection captured'],
  });
}

export { Sentry };
```

### 3.2 New File: `apps/developer/src/lib/sentry.ts`

Same as above but with `dento-developer` release prefix:

```typescript
// Identical structure — only change:
release: `dento-developer@${import.meta.env.VITE_APP_VERSION ?? '2.0.0'}`,
```

### 3.3 Modified File: `apps/admin/src/main.tsx`

**Current state:**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './styles/globals.css';
```

**Add before `ReactDOM.createRoot`:**

```tsx
import { initSentry } from './lib/sentry.js';
initSentry();
```

### 3.4 Modified File: `apps/developer/src/main.tsx`

Same change as admin `main.tsx`.

### 3.5 Modified File: `apps/admin/src/App.tsx`

**Current state:**

```tsx
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@dento/ui';
import router from './router.js';
```

**Add:**

```tsx
import { Sentry } from './lib/sentry.js';

// Wrap RouterProvider:
<Sentry.ErrorBoundary fallback={<SentryFallback />}>
  <RouterProvider router={router} />
</Sentry.ErrorBoundary>;
```

**Fallback Component** (inline in App.tsx):

```tsx
function SentryFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-gray-500">The error has been reported. Please refresh the page.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-white"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
```

### 3.6 Modified File: `apps/developer/src/App.tsx`

Same ErrorBoundary wrapping as admin `App.tsx`.

### 3.7 New Shared Type Files (7 files)

All files go in `packages/shared/src/types/` and must be re-exported from `types/index.ts`.

**Pattern source:** Existing files like `domain.types.ts`, `backup.types.ts` — interfaces with `_id: string`, dates as `string`, nullable fields.

#### 3.7.1 `packages/shared/src/types/error-log.types.ts`

```typescript
export type ErrorLogLevel = 'error' | 'fatal' | 'warn';
export type ErrorLogSource = 'api' | 'admin' | 'developer' | 'worker';

export interface ErrorLog {
  _id: string;
  level: ErrorLogLevel;
  message: string;
  stack?: string;
  source: ErrorLogSource;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  tenantSlug?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
  fingerprint: string;
  occurrences: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string | null;
  firstOccurrence: string;
  lastOccurrence: string;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorLogFilters {
  source?: ErrorLogSource;
  level?: ErrorLogLevel;
  tenantSlug?: string;
  resolved?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ErrorStats {
  totalErrors: number;
  unresolvedErrors: number;
  errorsLast24h: number;
  errorsLast7d: number;
  errorsByLevel: { level: string; count: number }[];
  errorsBySource: { source: string; count: number }[];
  errorTimeline: { timestamp: string; count: number }[];
}
```

#### 3.7.2 `packages/shared/src/types/audit-log.types.ts`

```typescript
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'access'
  | 'config_change'
  | 'permission_change';

export type AuditSensitivity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLogEntry {
  _id: string;
  tenantSlug: string;
  actorId: string;
  actorEmail: string;
  actorName?: string;
  actorRole: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  description: string;
  sensitivityLevel: AuditSensitivity;
  status: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogFilters {
  tenantSlug?: string;
  actorId?: string;
  actorEmail?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  sensitivityLevel?: AuditSensitivity;
  status?: 'success' | 'failure';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogStats {
  today: number;
  thisWeek: number;
  byAction: Record<string, number>;
  bySensitivity: Record<string, number>;
}
```

#### 3.7.3 `packages/shared/src/types/deployment.types.ts`

```typescript
export type DeployStatus =
  | 'queued'
  | 'building'
  | 'deploying'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'rolled_back';

export type DeployApp = 'api' | 'admin' | 'developer' | 'worker';

export interface Deployment {
  _id: string;
  app: DeployApp;
  version: string;
  commitSha: string;
  commitMessage?: string;
  branch: string;
  status: DeployStatus;
  triggeredBy: string;
  provider: 'railway' | 'vercel' | 'docker' | 'manual';
  providerDeployId?: string;
  environment: 'staging' | 'production';
  duration?: number;
  buildLogs?: string;
  deployLogs?: string;
  rollbackFromId?: string;
  metadata?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentFilters {
  app?: DeployApp;
  status?: DeployStatus;
  environment?: 'staging' | 'production';
  branch?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DeploymentStats {
  totalDeployments: number;
  successRate: number;
  avgDuration: number;
  deploymentsToday: number;
  byApp: { app: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recentFailures: number;
}
```

#### 3.7.4 `packages/shared/src/types/billing.types.ts`

```typescript
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface SaaSInvoice {
  _id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string | null;
  paymentMethod?: string;
  providerInvoiceId?: string;
  items: SaaSInvoiceItem[];
  dunningAttempts: DunningEntry[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SaaSInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface DunningEntry {
  attempt: number;
  sentAt: string;
  channel: 'email' | 'sms';
  status: 'sent' | 'failed';
}

export interface BillingStats {
  mrr: number;
  arr: number;
  totalRevenue: number;
  outstandingAmount: number;
  overdueInvoices: number;
  activeSubscriptions: number;
  churnRate: number;
  revenueByPlan: { plan: string; revenue: number; count: number }[];
  revenueTimeline: { month: string; revenue: number }[];
  paymentMethodBreakdown: { method: string; count: number; total: number }[];
}

export interface BillingFilters {
  tenantId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}
```

#### 3.7.5 `packages/shared/src/types/system-log.types.ts`

```typescript
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface SystemLog {
  _id: string;
  level: LogLevel;
  message: string;
  service: string;
  hostname?: string;
  pid?: number;
  timestamp: string;
  requestId?: string;
  tenantSlug?: string;
  metadata?: Record<string, unknown>;
  stack?: string;
}

export interface SystemLogFilters {
  level?: LogLevel;
  service?: string;
  tenantSlug?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SystemLogStats {
  totalLogs: number;
  byLevel: { level: string; count: number }[];
  byService: { service: string; count: number }[];
  logTimeline: { timestamp: string; count: number }[];
  errorRate: number;
}
```

#### 3.7.6 `packages/shared/src/types/user-session.types.ts`

```typescript
export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface UserSession {
  _id: string;
  userId: string;
  email: string;
  userName: string;
  role: string;
  tenantSlug?: string;
  ipAddress: string;
  userAgent: string;
  device: DeviceInfo;
  location?: SessionLocation;
  loginAt: string;
  lastActivityAt: string;
  expiresAt: string;
  status: SessionStatus;
  revokedAt?: string | null;
  revokedBy?: string | null;
  createdAt: string;
}

export interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  isMobile: boolean;
}

export interface SessionLocation {
  country?: string;
  city?: string;
  region?: string;
}

export interface SessionFilters {
  userId?: string;
  email?: string;
  tenantSlug?: string;
  status?: SessionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SessionStats {
  activeSessions: number;
  uniqueUsers: number;
  sessionsToday: number;
  sessionsByRole: { role: string; count: number }[];
  sessionsByDevice: { device: string; count: number }[];
  avgSessionDuration: number;
}
```

#### 3.7.7 `packages/shared/src/types/health-check.types.ts`

```typescript
export type HealthStatus = 'ok' | 'degraded' | 'down';
export type ComponentStatus = 'ok' | 'degraded' | 'down';

export interface ComponentHealth {
  status: ComponentStatus;
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  version: string;
  environment: string;
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  components: Record<string, ComponentHealth>;
  timestamp: string;
}
```

#### 3.7.8 Modified: `packages/shared/src/types/index.ts`

Append these re-exports:

```typescript
// ── Error Log Types (Phase 6 Monitoring) ────────────────────
export * from './error-log.types.js';

// ── Audit Log Types (Phase 6 Security) ─────────────────────
export * from './audit-log.types.js';

// ── Deployment Types (Phase 6 Infrastructure) ──────────────
export * from './deployment.types.js';

// ── Billing Types (Phase 6 SaaS) ───────────────────────────
export * from './billing.types.js';

// ── System Log Types (Phase 6 Observability) ───────────────
export * from './system-log.types.js';

// ── User Session Types (Phase 6 Security) ──────────────────
export * from './user-session.types.js';

// ── Health Check Types (Phase 6 Monitoring) ────────────────
export * from './health-check.types.js';
```

### Batch 7 File Summary

| #   | Action | File Path                                         |
| --- | ------ | ------------------------------------------------- |
| 1   | NEW    | `apps/admin/src/lib/sentry.ts`                    |
| 2   | NEW    | `apps/developer/src/lib/sentry.ts`                |
| 3   | MODIFY | `apps/admin/src/main.tsx`                         |
| 4   | MODIFY | `apps/developer/src/main.tsx`                     |
| 5   | MODIFY | `apps/admin/src/App.tsx`                          |
| 6   | MODIFY | `apps/developer/src/App.tsx`                      |
| 7   | NEW    | `packages/shared/src/types/error-log.types.ts`    |
| 8   | NEW    | `packages/shared/src/types/audit-log.types.ts`    |
| 9   | NEW    | `packages/shared/src/types/deployment.types.ts`   |
| 10  | NEW    | `packages/shared/src/types/billing.types.ts`      |
| 11  | NEW    | `packages/shared/src/types/system-log.types.ts`   |
| 12  | NEW    | `packages/shared/src/types/user-session.types.ts` |
| 13  | NEW    | `packages/shared/src/types/health-check.types.ts` |
| 14  | MODIFY | `packages/shared/src/types/index.ts`              |

**NPM dependency:** `@sentry/react` must be added to both `apps/admin/package.json` and `apps/developer/package.json`.

---

## 4. Batch 8 — Missing Backend API Routes

**Goal:** Create the 4 missing platform-level API routes required by frontend pages.
**Dependencies:** None (can run in parallel with Batch 7).

### 4.1 Route: `/api/platform/audit-logs` (A2)

**Purpose:** Platform-wide read-only audit log query (cross-tenant).
**RBAC:** `platformGuard('platform_audit', 'read')` — matches `sidebar-config.ts` permission.
**Pattern source:** Existing `error-logs.route.ts` (platform standalone function style).

#### New File: `apps/api/src/platform/routes/audit-logs/audit-logs.route.ts`

```typescript
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { connectDatabase } from '../../../config/database.js';
import { AuditLogService } from '../../../tenant/services/audit-log.service.js';
```

**Endpoints:**

| Method        | Path                              | Guard                 | Description                                                                                |
| ------------- | --------------------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `GET /`       | `/api/platform/audit-logs`        | `platform_audit.read` | List with filters: tenant, action, user, date range, search. Pagination via `page`/`limit` |
| `GET /:id`    | `/api/platform/audit-logs/:id`    | `platform_audit.read` | Single entry detail (with before/after diff)                                               |
| `GET /stats`  | `/api/platform/audit-logs/stats`  | `platform_audit.read` | Today count, week count, by-action breakdown, by-sensitivity breakdown                     |
| `GET /export` | `/api/platform/audit-logs/export` | `platform_audit.read` | CSV/JSON export (stream response)                                                          |

**Query Schema (Zod):**

```typescript
const auditLogQuerySchema = z
  .object({
    tenantSlug: z.string().optional(),
    actorId: z.string().optional(),
    actorEmail: z.string().optional(),
    action: z.string().optional(),
    resourceType: z.string().optional(),
    sensitivityLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['success', 'failure']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();
```

**Implementation note:** Re-use existing `AuditLogService` but instantiate with the platform DB connection (no tenant isolation — queries across all tenants). The existing service already supports `tenantSlug` filter and `search` in its `query()` method.

### 4.2 Route: `/api/platform/system-logs` (A3)

**Purpose:** Server log viewer — query `error_logs` collection + Axiom API.
**RBAC:** `platformGuard('platform_settings', 'read')` — matches sidebar permission.

#### New File: `apps/api/src/platform/routes/system-logs/system-logs.route.ts`

**Endpoints:**

| Method       | Path                              | Guard                    | Description                                                           |
| ------------ | --------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| `GET /`      | `/api/platform/system-logs`       | `platform_settings.read` | Query error_logs collection with level, service, date, search filters |
| `GET /stats` | `/api/platform/system-logs/stats` | `platform_settings.read` | Log volume stats per level (last 24h, 7d)                             |

**Query Schema (Zod):**

```typescript
const systemLogQuerySchema = z
  .object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
    source: z.enum(['api', 'admin', 'developer', 'worker']).optional(),
    tenantSlug: z.string().optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();
```

**Implementation:** Query the existing `ErrorLog` model (from `error-log.model.ts`) — it already stores level, source, message, stack, requestId, tenantSlug. The system logs page is effectively a different view of the error_logs collection focused on log levels/services rather than error management.

#### New File: `apps/api/src/platform/services/system-log.service.ts`

Standalone function pattern (like `error-log.service.ts`):

```typescript
import { ErrorLog } from '../../models/error-log.model.js';

export async function querySystemLogs(filters: { ... }) { ... }
export async function getSystemLogStats() { ... }
```

### 4.3 Route: `/api/platform/deployments` (A1)

**Purpose:** Track deployment history, status, rollback.
**RBAC:** `platformGuard('platform_settings', 'read')` for reads; `platform_settings.create` for rollback.

#### New File: `apps/api/src/platform/models/deployment.model.ts`

**Pattern source:** `error-log.model.ts` — Mongoose schema with interface + compound indexes + TTL.

```typescript
import mongoose, { type Document, Schema } from 'mongoose';

export interface IDeployment extends Document {
  app: 'api' | 'admin' | 'developer' | 'worker';
  version: string;
  commitSha: string;
  commitMessage?: string;
  branch: string;
  status: 'queued' | 'building' | 'deploying' | 'success' | 'failed' | 'cancelled' | 'rolled_back';
  triggeredBy: string;
  provider: 'railway' | 'vercel' | 'docker' | 'manual';
  providerDeployId?: string;
  environment: 'staging' | 'production';
  duration?: number;
  buildLogs?: string;
  deployLogs?: string;
  rollbackFromId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deploymentSchema = new Schema<IDeployment>({
  app:         { type: String, enum: ['api', 'admin', 'developer', 'worker'], required: true },
  version:     { type: String, required: true },
  commitSha:   { type: String, required: true },
  commitMessage: { type: String },
  branch:      { type: String, required: true, default: 'main' },
  status:      { type: String, enum: [...], required: true, default: 'queued' },
  triggeredBy: { type: String, required: true },
  provider:    { type: String, enum: ['railway', 'vercel', 'docker', 'manual'], required: true },
  providerDeployId: { type: String },
  environment: { type: String, enum: ['staging', 'production'], required: true },
  duration:    { type: Number },
  buildLogs:   { type: String },
  deployLogs:  { type: String },
  rollbackFromId: { type: Schema.Types.ObjectId, ref: 'Deployment' },
  metadata:    { type: Schema.Types.Mixed },
  startedAt:   { type: Date, required: true, default: Date.now },
  completedAt: { type: Date },
}, { timestamps: true, collection: 'deployments' });

deploymentSchema.index({ app: 1, createdAt: -1 });
deploymentSchema.index({ environment: 1, status: 1 });
deploymentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 }); // 180d TTL

export const Deployment = mongoose.model<IDeployment>('Deployment', deploymentSchema);
```

#### New File: `apps/api/src/platform/services/deployment.service.ts`

Standalone function pattern:

```typescript
import { Deployment } from '../models/deployment.model.js';

export async function listDeployments(filters) { ... }
export async function getDeploymentById(id: string) { ... }
export async function getDeploymentStats() { ... }
export async function triggerRollback(id: string, triggeredBy: string) { ... }
```

#### New File: `apps/api/src/platform/routes/deployments/deployments.route.ts`

**Endpoints:**

| Method               | Path                                     | Guard                      | Description                                            |
| -------------------- | ---------------------------------------- | -------------------------- | ------------------------------------------------------ |
| `GET /`              | `/api/platform/deployments`              | `platform_settings.read`   | List deployments with filters (app, status, env, date) |
| `GET /stats`         | `/api/platform/deployments/stats`        | `platform_settings.read`   | Success rate, avg duration, by-app breakdown           |
| `GET /:id`           | `/api/platform/deployments/:id`          | `platform_settings.read`   | Deployment detail with build/deploy logs               |
| `POST /:id/rollback` | `/api/platform/deployments/:id/rollback` | `platform_settings.create` | Trigger rollback to previous version                   |

### 4.4 Route: `/api/platform/billing` (A4)

**Purpose:** SaaS billing stats + dunning. Extends existing payment routes.
**RBAC:** `platformGuard('platform_billing', 'read')` — same module as payment routes.

#### New File: `apps/api/src/platform/routes/billing/billing.route.ts`

**Implementation note:** This queries the existing `SaaSPayment` model + adds tenant subscription data. The payment routes at `/api/payments` handle Paymob/Stripe transaction flow; this route provides the billing dashboard (MRR, invoices, dunning).

**Endpoints:**

| Method                      | Path                                        | Guard                     | Description                                |
| --------------------------- | ------------------------------------------- | ------------------------- | ------------------------------------------ |
| `GET /stats`                | `/api/platform/billing/stats`               | `platform_billing.read`   | MRR, ARR, churn, revenue by plan, timeline |
| `GET /invoices`             | `/api/platform/billing/invoices`            | `platform_billing.read`   | List SaaS invoices with filters            |
| `GET /invoices/:id`         | `/api/platform/billing/invoices/:id`        | `platform_billing.read`   | Invoice detail                             |
| `POST /invoices/:id/remind` | `/api/platform/billing/invoices/:id/remind` | `platform_billing.create` | Send payment reminder (dunning)            |

**Stats aggregation pattern** (from existing `paymob/stats` endpoint):

```typescript
const [stats] = await SaaSPayment.aggregate([
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
      // ... MRR calculation, churn, etc.
    },
  },
]);
```

#### New File: `apps/api/src/platform/services/billing.service.ts`

Standalone function pattern:

```typescript
import { SaaSPayment } from '../../models/payment.model.js';
import { Tenant } from '../../models/tenant.model.js';

export async function getBillingStats() { ... }
export async function listInvoices(filters) { ... }
export async function getInvoiceById(id: string) { ... }
export async function sendDunningReminder(invoiceId: string) { ... }
```

### 4.5 Modified: `apps/api/src/server.ts`

Add route registrations in the "Phase 6" section:

```typescript
// Phase 6 — Gap Closure: Additional Platform Routes
import { platformAuditLogRoutes } from './platform/routes/audit-logs/audit-logs.route.js';
import { systemLogRoutes } from './platform/routes/system-logs/system-logs.route.js';
import { deploymentRoutes } from './platform/routes/deployments/deployments.route.js';
import { billingRoutes } from './platform/routes/billing/billing.route.js';

// Register after existing Phase 6 routes:
await fastify.register(platformAuditLogRoutes, { prefix: '/api/platform/audit-logs' });
await fastify.register(systemLogRoutes, { prefix: '/api/platform/system-logs' });
await fastify.register(deploymentRoutes, { prefix: '/api/platform/deployments' });
await fastify.register(billingRoutes, { prefix: '/api/platform/billing' });
```

### Batch 8 File Summary

| #   | Action | File Path                                                       |
| --- | ------ | --------------------------------------------------------------- |
| 1   | NEW    | `apps/api/src/platform/routes/audit-logs/audit-logs.route.ts`   |
| 2   | NEW    | `apps/api/src/platform/routes/system-logs/system-logs.route.ts` |
| 3   | NEW    | `apps/api/src/platform/services/system-log.service.ts`          |
| 4   | NEW    | `apps/api/src/platform/models/deployment.model.ts`              |
| 5   | NEW    | `apps/api/src/platform/services/deployment.service.ts`          |
| 6   | NEW    | `apps/api/src/platform/routes/deployments/deployments.route.ts` |
| 7   | NEW    | `apps/api/src/platform/services/billing.service.ts`             |
| 8   | NEW    | `apps/api/src/platform/routes/billing/billing.route.ts`         |
| 9   | MODIFY | `apps/api/src/server.ts`                                        |

---

## 5. Batch 9 — Audit Logs + System Logs Pages

**Goal:** Replace PlaceholderPage for `/audit` and `/system-logs` in the developer portal.
**Dependencies:** Batch 8 (backend routes must exist).

### 5.1 Section 4E: Audit Logs Page (Developer Portal)

**Pattern source:** `MonitoringPage.tsx` (tabs), `SupportPage.tsx` (filters + cards), `RecentErrorsTable.tsx` (DataTable).

#### New Files:

| #   | File                                                                        | Purpose                                                                       |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | `apps/developer/src/features/audit-logs/pages/AuditLogsPage.tsx`            | Main page with stats cards + DataTable                                        |
| 2   | `apps/developer/src/features/audit-logs/hooks/useAuditLogs.ts`              | TanStack Query hooks: `useAuditLogs`, `useAuditLogDetail`, `useAuditLogStats` |
| 3   | `apps/developer/src/features/audit-logs/components/AuditLogDetailSheet.tsx` | Sheet/side panel with before/after diff                                       |

#### Page Structure:

```
AuditLogsPage
├── PageHeader: "Audit Logs" / "Platform-wide security and change audit trail"
├── StatsCards (4): Today / This Week / High Sensitivity / Failures
├── Filters: Search input + Status select + Sensitivity select + Date range
├── DataTable (columns): Timestamp | Actor | Action | Resource | Tenant | Sensitivity | Status
└── AuditLogDetailSheet: Full entry detail with before/after JSON diff
```

#### Hook Pattern:

```typescript
// apps/developer/src/features/audit-logs/hooks/useAuditLogs.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import type { AuditLogEntry, AuditLogFilters, AuditLogStats } from '@dento/shared';

interface AuditLogListResponse {
  success: boolean;
  data: AuditLogEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: AuditLogFilters) => [...auditLogKeys.lists(), filters] as const,
  details: () => [...auditLogKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditLogKeys.details(), id] as const,
  stats: () => [...auditLogKeys.all, 'stats'] as const,
};

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: () =>
      apiClient.get<AuditLogListResponse>('/api/platform/audit-logs', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

// useAuditLogDetail, useAuditLogStats follow same pattern
```

#### RBAC Permission for Sidebar:

Already set in `sidebar-config.ts`: `permission: 'platform_audit.read'` for the Audit item.

### 5.2 Section 4F: System Logs Page (Developer Portal)

#### New Files:

| #   | File                                                               | Purpose                                                    |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| 4   | `apps/developer/src/features/system-logs/pages/SystemLogsPage.tsx` | Main page with level filters + DataTable                   |
| 5   | `apps/developer/src/features/system-logs/hooks/useSystemLogs.ts`   | TanStack Query hooks: `useSystemLogs`, `useSystemLogStats` |

#### Page Structure:

```
SystemLogsPage
├── PageHeader: "System Logs" / "Server-side log viewer and diagnostics"
├── StatsCards (4): Total Logs (24h) / Errors / Warnings / Error Rate
├── Filters: Search + Level pills (trace/debug/info/warn/error/fatal) + Source select + Date range
├── Level breakdown chart or badges
└── DataTable (columns): Timestamp | Level | Service | Message | Tenant | RequestID
```

#### Hook Pattern:

```typescript
// Same query key factory + apiClient.get<T> pattern
export function useSystemLogs(filters: SystemLogFilters) {
  return useQuery({
    queryKey: systemLogKeys.list(filters),
    queryFn: () =>
      apiClient.get<SystemLogListResponse>('/api/platform/system-logs', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}
```

### 5.3 Modified: `apps/developer/src/router.tsx`

Replace PlaceholderPage routes:

```typescript
// Add imports:
import AuditLogsPage from './features/audit-logs/pages/AuditLogsPage.js';
import SystemLogsPage from './features/system-logs/pages/SystemLogsPage.js';

// Replace:
{ path: '/audit', element: <PlaceholderPage title="Audit Logs" /> },
{ path: '/system-logs', element: <PlaceholderPage title="System Logs" /> },

// With:
{ path: '/audit', element: <AuditLogsPage /> },
{ path: '/system-logs', element: <SystemLogsPage /> },
```

### Batch 9 File Summary

| #   | Action | File Path                                                                   |
| --- | ------ | --------------------------------------------------------------------------- |
| 1   | NEW    | `apps/developer/src/features/audit-logs/pages/AuditLogsPage.tsx`            |
| 2   | NEW    | `apps/developer/src/features/audit-logs/hooks/useAuditLogs.ts`              |
| 3   | NEW    | `apps/developer/src/features/audit-logs/components/AuditLogDetailSheet.tsx` |
| 4   | NEW    | `apps/developer/src/features/system-logs/pages/SystemLogsPage.tsx`          |
| 5   | NEW    | `apps/developer/src/features/system-logs/hooks/useSystemLogs.ts`            |
| 6   | MODIFY | `apps/developer/src/router.tsx`                                             |

---

## 6. Batch 10 — User Sessions + Deployments Pages

**Goal:** Replace PlaceholderPage for `/deployments` and add new `/user-sessions` route.
**Dependencies:** Batch 8 (deployments backend). User sessions backend already exists.

### 6.1 Section 4G: User Sessions Page (Developer Portal)

**Backend:** Already exists at `/api/platform/user-sessions` (`platformSessionRoutes`).

#### New Files:

| #   | File                                                                          | Purpose                                                                        |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | `apps/developer/src/features/user-sessions/pages/UserSessionsPage.tsx`        | Main page with active session stats + DataTable                                |
| 2   | `apps/developer/src/features/user-sessions/hooks/useUserSessions.ts`          | TanStack Query hooks: `useUserSessions`, `useSessionStats`, `useRevokeSession` |
| 3   | `apps/developer/src/features/user-sessions/components/SessionDetailSheet.tsx` | Session detail with device info + revoke action                                |

#### Page Structure:

```
UserSessionsPage
├── PageHeader: "User Sessions" / "Active sessions and security management"
├── StatsCards (4): Active Sessions / Unique Users / Sessions Today / Avg Duration
├── Filters: Search (email) + Status pills (active/expired/revoked) + Tenant select
├── DataTable (columns): User | Email | Role | Device | IP | Location | Login At | Status | Actions
│   └── Actions: View (Sheet) | Revoke (ConfirmDialog)
└── SessionDetailSheet: Full session detail + device + location + actions log
```

#### Hook Pattern:

```typescript
// Query: GET /api/platform/user-sessions
export function useUserSessions(filters: SessionFilters) {
  return useQuery({
    queryKey: sessionKeys.list(filters),
    queryFn: () =>
      apiClient.get<SessionListResponse>('/api/platform/user-sessions', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

// Mutation: DELETE /api/platform/user-sessions/:id (revoke)
export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/user-sessions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}
```

### 6.2 Section 4H: Deployments Page (Developer Portal)

#### New Files:

| #   | File                                                                           | Purpose                                                                     |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 4   | `apps/developer/src/features/deployments/pages/DeploymentsPage.tsx`            | Main page with deploy history + stats                                       |
| 5   | `apps/developer/src/features/deployments/hooks/useDeployments.ts`              | TanStack Query hooks: `useDeployments`, `useDeploymentStats`, `useRollback` |
| 6   | `apps/developer/src/features/deployments/components/DeploymentDetailSheet.tsx` | Detail sheet with logs + rollback action                                    |

#### Page Structure:

```
DeploymentsPage
├── PageHeader: "Deployments" / "Deployment history and version management"
├── StatsCards (4): Total Deploys / Success Rate / Avg Duration / Today
├── Filters: App pills (api/admin/developer/worker) + Status select + Environment select
├── DataTable (columns): App | Version | Branch | Commit | Status | Duration | Triggered By | Date
│   └── Actions: View (Sheet) | Rollback (ConfirmDialog — only for 'success' status)
└── DeploymentDetailSheet: Full detail with build/deploy logs (pre-formatted), rollback button
```

#### Hook Pattern:

```typescript
// Query: GET /api/platform/deployments
export function useDeployments(filters: DeploymentFilters) {
  return useQuery({
    queryKey: deploymentKeys.list(filters),
    queryFn: () =>
      apiClient.get<DeploymentListResponse>('/api/platform/deployments', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

// Mutation: POST /api/platform/deployments/:id/rollback
export function useRollback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/platform/deployments/${id}/rollback`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deploymentKeys.all });
      toast.success('Rollback initiated');
    },
  });
}
```

### 6.3 Modified: `apps/developer/src/router.tsx`

Replace/add routes:

```typescript
import UserSessionsPage from './features/user-sessions/pages/UserSessionsPage.js';
import DeploymentsPage from './features/deployments/pages/DeploymentsPage.js';

// Replace:
{ path: '/deployments', element: <PlaceholderPage title="Deployments" /> },

// With:
{ path: '/deployments', element: <DeploymentsPage /> },

// Add new route (after /users):
{ path: '/user-sessions', element: <UserSessionsPage /> },
```

**Note:** The sidebar config already has a "Sessions" item under the Support section. If a separate sidebar item is needed for `/user-sessions`, add it to `sidebar-config.ts`.

### Batch 10 File Summary

| #   | Action | File Path                                                                      |
| --- | ------ | ------------------------------------------------------------------------------ |
| 1   | NEW    | `apps/developer/src/features/user-sessions/pages/UserSessionsPage.tsx`         |
| 2   | NEW    | `apps/developer/src/features/user-sessions/hooks/useUserSessions.ts`           |
| 3   | NEW    | `apps/developer/src/features/user-sessions/components/SessionDetailSheet.tsx`  |
| 4   | NEW    | `apps/developer/src/features/deployments/pages/DeploymentsPage.tsx`            |
| 5   | NEW    | `apps/developer/src/features/deployments/hooks/useDeployments.ts`              |
| 6   | NEW    | `apps/developer/src/features/deployments/components/DeploymentDetailSheet.tsx` |
| 7   | MODIFY | `apps/developer/src/router.tsx`                                                |

---

## 7. Batch 11 — Billing Page + Admin Portal Items

**Goal:** Billing dashboard (dev portal), Sessions tab (admin), Support Session Banner (admin).
**Dependencies:** Batch 8 (billing backend).

### 7.1 Section 4I: Billing Page (Developer Portal)

#### New Files:

| #   | File                                                                    | Purpose                                                                   |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | `apps/developer/src/features/billing/pages/BillingPage.tsx`             | Tabs: Overview / Invoices                                                 |
| 2   | `apps/developer/src/features/billing/hooks/useBilling.ts`               | TanStack Query hooks: `useBillingStats`, `useInvoices`, `useSendReminder` |
| 3   | `apps/developer/src/features/billing/components/RevenueChart.tsx`       | Revenue timeline chart                                                    |
| 4   | `apps/developer/src/features/billing/components/InvoiceDetailSheet.tsx` | Invoice detail + dunning actions                                          |

#### Page Structure:

```
BillingPage
├── PageHeader: "Billing" / "SaaS revenue tracking and invoice management"
├── Tabs
│   ├── Overview Tab
│   │   ├── StatsCards (4): MRR / ARR / Outstanding / Overdue Invoices
│   │   ├── RevenueChart (revenue timeline)
│   │   └── Revenue by Plan breakdown (cards)
│   └── Invoices Tab
│       ├── Filters: Search + Status select + Date range
│       ├── DataTable (columns): Invoice# | Tenant | Plan | Amount | Status | Due Date | Actions
│       │   └── Actions: View (Sheet) | Send Reminder (mutation)
│       └── InvoiceDetailSheet: Full invoice detail + line items + dunning history
```

#### Hook Pattern:

```typescript
// Query: GET /api/platform/billing/stats
export function useBillingStats() {
  return useQuery({
    queryKey: billingKeys.stats(),
    queryFn: () => apiClient.get<BillingStatsResponse>('/api/platform/billing/stats'),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

// Query: GET /api/platform/billing/invoices
export function useInvoices(filters: BillingFilters) {
  return useQuery({
    queryKey: billingKeys.invoiceList(filters),
    queryFn: () =>
      apiClient.get<InvoiceListResponse>('/api/platform/billing/invoices', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

// Mutation: POST /api/platform/billing/invoices/:id/remind
export function useSendReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/platform/billing/invoices/${id}/remind`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast.success('Payment reminder sent');
    },
  });
}
```

### 7.2 Section 4J: Admin Portal — Sessions Tab

**Purpose:** Add a functional "Sessions" tab to the admin Settings page.
**Pattern source:** `SettingsPage.tsx` — custom tab system with `useState<SettingsTab>` + `ComingSoonTab` placeholder.

#### New Files:

| #   | File                                                          | Purpose                                  |
| --- | ------------------------------------------------------------- | ---------------------------------------- |
| 5   | `apps/admin/src/features/settings/components/SessionsTab.tsx` | Active sessions table + revoke           |
| 6   | `apps/admin/src/features/settings/hooks/useAdminSessions.ts`  | TanStack Query hooks for tenant sessions |

#### SessionsTab Structure:

```
SessionsTab
├── Header: "Active Sessions" / "Manage logged-in sessions for this clinic"
├── Card: Current session indicator (green badge)
├── DataTable (columns): User | Device | IP | Login Time | Last Active | Status | Actions
│   └── Actions: Revoke (ConfirmDialog)
└── "Revoke All Other Sessions" button at bottom
```

#### Hook Pattern:

```typescript
// apps/admin/src/features/settings/hooks/useAdminSessions.ts
// Admin portal uses X-Tenant-Slug header (injected by apiClient)

interface SessionListResponse {
  success: boolean;
  data: UserSession[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function useAdminSessions(filters: SessionFilters = {}) {
  return useQuery({
    queryKey: ['admin-sessions', filters],
    queryFn: () =>
      apiClient.get<SessionListResponse>('/api/auth/sessions', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => apiClient.delete(`/api/auth/sessions/${sessionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sessions'] });
      toast.success('Session revoked');
    },
  });
}
```

#### Modified: `apps/admin/src/features/settings/pages/SettingsPage.tsx`

Replace the `ComingSoonTab` for Sessions:

```typescript
// Add import:
import { SessionsTab } from '../components/SessionsTab.js';

// Change TABS config:
{ key: 'sessions', label: 'Sessions', icon: Monitor, ready: true },  // was: ready: false

// Replace in render:
{activeTab === 'sessions' && <SessionsTab />}  // was: <ComingSoonTab title="Sessions" />
```

### 7.3 Section 4K: Admin Portal — Support Session Banner

**Purpose:** Show a yellow banner at top of DashboardLayout when an active support session (impersonation) exists.
**Pattern source:** `DashboardLayout.tsx` — banner mounts between `<AppHeader/>` and `<main>`.

#### New Files:

| #   | File                                                 | Purpose                          |
| --- | ---------------------------------------------------- | -------------------------------- |
| 7   | `apps/admin/src/components/SupportSessionBanner.tsx` | Animated yellow/red banner       |
| 8   | `apps/admin/src/hooks/useSupportSession.ts`          | Query for active support session |

#### Banner Design:

```tsx
// apps/admin/src/components/SupportSessionBanner.tsx
// Renders above <main> inside DashboardLayout when active session exists

export function SupportSessionBanner() {
  const { data: session } = useActiveSupportSession();

  if (!session) return null;

  return (
    <div className="flex items-center justify-between bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm dark:bg-yellow-900/20 dark:border-yellow-800">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-yellow-600" />
        <span className="font-medium text-yellow-800 dark:text-yellow-200">
          Support Session Active
        </span>
        <span className="text-yellow-600 dark:text-yellow-300">
          — {session.performedBy.name} is assisting your clinic
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-yellow-600">
        <Clock className="h-3 w-3" />
        Expires: {new Date(session.expiresAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
```

#### Hook:

```typescript
// apps/admin/src/hooks/useSupportSession.ts
export function useActiveSupportSession() {
  return useQuery({
    queryKey: ['active-support-session'],
    queryFn: () =>
      apiClient.get<{ success: boolean; data: SupportSession | null }>(
        '/api/admin/support-sessions/active',
      ),
    select: (res) => res.data,
    refetchInterval: 30_000, // Check every 30s
  });
}
```

#### Modified: `apps/admin/src/layouts/DashboardLayout.tsx`

Mount the banner:

```typescript
// Add import:
import { SupportSessionBanner } from '../components/SupportSessionBanner.js';

// In DashboardLayoutContent, between AppHeader and main:
<AppHeader />
<SupportSessionBanner />
<main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
```

### 7.4 Modified: `apps/developer/src/router.tsx`

Replace billing PlaceholderPage:

```typescript
import BillingPage from './features/billing/pages/BillingPage.js';

// Replace:
{ path: '/billing', element: <PlaceholderPage title="Billing" /> },
// With:
{ path: '/billing', element: <BillingPage /> },
```

### Batch 11 File Summary

| #   | Action | File Path                                                               |
| --- | ------ | ----------------------------------------------------------------------- |
| 1   | NEW    | `apps/developer/src/features/billing/pages/BillingPage.tsx`             |
| 2   | NEW    | `apps/developer/src/features/billing/hooks/useBilling.ts`               |
| 3   | NEW    | `apps/developer/src/features/billing/components/RevenueChart.tsx`       |
| 4   | NEW    | `apps/developer/src/features/billing/components/InvoiceDetailSheet.tsx` |
| 5   | NEW    | `apps/admin/src/features/settings/components/SessionsTab.tsx`           |
| 6   | NEW    | `apps/admin/src/features/settings/hooks/useAdminSessions.ts`            |
| 7   | NEW    | `apps/admin/src/components/SupportSessionBanner.tsx`                    |
| 8   | NEW    | `apps/admin/src/hooks/useSupportSession.ts`                             |
| 9   | MODIFY | `apps/admin/src/features/settings/pages/SettingsPage.tsx`               |
| 10  | MODIFY | `apps/admin/src/layouts/DashboardLayout.tsx`                            |
| 11  | MODIFY | `apps/developer/src/router.tsx`                                         |

---

## 8. Batch 12 — Backup Restore Test + Frontend Tests

**Goal:** HIPAA compliance (D2) + test coverage for all new UI.
**Dependencies:** All previous batches.

### 8.1 D2: Monthly Automated Backup Restore Test

**Source:** `SECURITY_AND_ENCRYPTION.md` §14.3 — "Monthly automated restore test".
**Pattern source:** `workers/backup.worker.ts` (BullMQ worker + AES-256-GCM crypto + S3 client).

#### New File: `apps/api/src/jobs/backup-restore-test.cron.ts`

```typescript
import { Queue, Worker, type Job } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
// Re-use backup crypto + S3 utilities
import { downloadFromS3 } from '../utils/s3-client.js';
import { decryptBackup } from '../utils/backup-crypto.js';

const QUEUE_NAME = 'backup-restore-test';

/**
 * Monthly backup restore test — HIPAA §14.3 compliance
 *
 * Flow:
 * 1. Find latest backup in S3 (dento-backups bucket)
 * 2. Download + decrypt (AES-256-GCM)
 * 3. mongorestore to temp database
 * 4. Run validation queries (collection count, sample reads)
 * 5. Drop temp database
 * 6. Log result to error_logs collection + Axiom
 */

export async function scheduleBackupRestoreTest() {
  const connection = getRedis();
  const queue = new Queue(QUEUE_NAME, { connection });

  // Run on 1st of each month at 03:00 UTC
  await queue.upsertJobScheduler(
    'monthly-restore-test',
    { pattern: '0 3 1 * *' },
    { name: 'restore-test' },
  );

  logger.info('📅 Monthly backup restore test scheduled');
}

export function startBackupRestoreWorker() {
  const connection = getRedis();

  new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      logger.info('🔄 Starting monthly backup restore test...');
      const startTime = Date.now();

      try {
        // 1. Find latest backup from S3
        // 2. Download + decrypt
        // 3. mongorestore to temp DB
        // 4. Validate (collection counts, sample reads)
        // 5. Drop temp DB
        // 6. Log success

        const duration = Date.now() - startTime;
        logger.info({ duration }, '✅ Backup restore test PASSED');
      } catch (err) {
        const duration = Date.now() - startTime;
        logger.error({ err, duration }, '❌ Backup restore test FAILED');
        throw err;
      }
    },
    { connection, concurrency: 1 },
  );
}
```

**Modified: `apps/api/src/server.ts`** — Add to workers section:

```typescript
import {
  scheduleBackupRestoreTest,
  startBackupRestoreWorker,
} from './jobs/backup-restore-test.cron.js';

// In bootstrap():
startBackupRestoreWorker();
await scheduleBackupRestoreTest();
```

### 8.2 Section 4L: Frontend Tests

**Test locations:** Colocated with features (Vitest + React Testing Library).

| #   | Test File                                                                 | Tests                                         |
| --- | ------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | `apps/developer/src/features/audit-logs/hooks/useAuditLogs.test.ts`       | Query key factory, filter mapping, pagination |
| 2   | `apps/developer/src/features/system-logs/hooks/useSystemLogs.test.ts`     | Query key factory, level filters              |
| 3   | `apps/developer/src/features/user-sessions/hooks/useUserSessions.test.ts` | Session CRUD, revoke mutation                 |
| 4   | `apps/developer/src/features/deployments/hooks/useDeployments.test.ts`    | Deployment list, rollback mutation            |
| 5   | `apps/developer/src/features/billing/hooks/useBilling.test.ts`            | Stats, invoice list, dunning mutation         |
| 6   | `apps/admin/src/features/settings/hooks/useAdminSessions.test.ts`         | Admin session list, revoke                    |

**Test pattern** (from codebase convention):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// ... test setup wrapper, mock apiClient
```

### Batch 12 File Summary

| #   | Action | File Path                                         |
| --- | ------ | ------------------------------------------------- |
| 1   | NEW    | `apps/api/src/jobs/backup-restore-test.cron.ts`   |
| 2   | MODIFY | `apps/api/src/server.ts` (add worker + scheduler) |
| 3-8 | NEW    | 6 test files (see table above)                    |

---

## 9. Codebase Pattern Reference

These patterns were extracted from the live codebase and MUST be followed exactly.

### 9.1 Backend Route Pattern

```typescript
// File: apps/api/src/platform/routes/<resource>/<resource>.route.ts

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';

// Zod schemas at top — ALWAYS use .strict()
const querySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    // ... filters
  })
  .strict();

// Export async function (NOT class-based for platform routes)
export async function resourceRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('<module>', '<action>')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = querySchema.parse(request.query);
      // ... business logic
      return apiResponse(reply, 200, data, undefined, { page, limit, total, totalPages });
    },
  );
}
```

### 9.2 Backend Model Pattern

```typescript
// File: apps/api/src/platform/models/<resource>.model.ts

import mongoose, { type Document, Schema } from 'mongoose';

export interface IResource extends Document {
  // All fields typed
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    // Fields...
  },
  { timestamps: true, collection: 'resource_name' },
);

// Compound indexes
resourceSchema.index({ field1: 1, createdAt: -1 });
// Optional TTL index
resourceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Resource = mongoose.model<IResource>('Resource', resourceSchema);
```

### 9.3 Backend Service Pattern (Platform)

```typescript
// Standalone exported functions (NOT class-based)
import { Resource } from '../models/resource.model.js';

export async function listResources(filters: {...}) {
  const skip = (filters.page - 1) * filters.limit;
  const filter: Record<string, unknown> = {};
  // ... build filter
  const [data, total] = await Promise.all([
    Resource.find(filter).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
    Resource.countDocuments(filter),
  ]);
  return { data, total, page: filters.page, limit: filters.limit };
}
```

### 9.4 Frontend Page Pattern

```tsx
// File: apps/developer/src/features/<feature>/pages/<Feature>Page.tsx

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, PageHeader, StatCard } from '@dento/ui';
import { Icon1, Icon2 } from 'lucide-react';
import { useHook } from '../hooks/useHook.js';

export default function FeaturePage() {
  const [tab, setTab] = useState('overview');
  // ... hooks, state

  return (
    <div className="space-y-6">
      <PageHeader title="Feature" description="Description line" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="..." value={0} icon={<Icon1 className="h-5 w-5" />} variant="default" />
      </div>
      {/* DataTable or Tabs content */}
    </div>
  );
}
```

### 9.5 Frontend Hook Pattern

```typescript
// File: apps/developer/src/features/<feature>/hooks/use<Feature>.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import type { ResourceType, ResourceFilters } from '@dento/shared';

// Response envelope matches backend apiResponse()
interface ListResponse {
  success: boolean;
  data: ResourceType[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// Query key factory
export const resourceKeys = {
  all: ['resources'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (filters: ResourceFilters) => [...resourceKeys.lists(), filters] as const,
  details: () => [...resourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourceKeys.details(), id] as const,
  stats: () => [...resourceKeys.all, 'stats'] as const,
};

export function useResources(filters: ResourceFilters) {
  return useQuery({
    queryKey: resourceKeys.list(filters),
    queryFn: () =>
      apiClient.get<ListResponse>('/api/platform/resources', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}
```

### 9.6 Frontend DataTable Pattern

```tsx
import { DataTable, type ColumnDef, type SortDirection } from '@dento/ui';

const columns: ColumnDef<ResourceType>[] = [
  { id: 'field', header: 'Label', accessorKey: 'field', sortable: true },
  { id: 'custom', header: 'Custom', cell: (_val, row) => <Badge>{row.status}</Badge> },
];

<DataTable
  columns={columns}
  data={data?.items ?? []}
  isLoading={isLoading}
  pageSize={20}
  currentPage={page}
  totalItems={data?.meta?.total}
  onPageChange={setPage}
  sortColumn={sortBy}
  sortDirection={sortDir}
  onSort={handleSort}
  rowKey={(row) => row._id}
  onRowClick={handleRowClick}
  emptyMessage="No items found."
/>;
```

### 9.7 Frontend Sheet/Detail Pattern

```tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Separator,
} from '@dento/ui';

<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>{description}</SheetDescription>
    </SheetHeader>
    <div className="mt-6 space-y-6">{/* Content sections separated by <Separator /> */}</div>
  </SheetContent>
</Sheet>;
```

### 9.8 Critical Rules (from prior sessions)

| Rule                             | Convention                                                           |
| -------------------------------- | -------------------------------------------------------------------- |
| **`toast`**                      | Import from `@dento/ui`, NOT `sonner`                                |
| **`apiClient.get<T>()`**         | `T` = full envelope `{ success: boolean, data: T, meta?: M }`        |
| **`ConfirmDialog`**              | NO `children` prop — use AlertDialog primitives for form dialogs     |
| **AlertDialog**                  | All primitives from `@dento/ui`                                      |
| **`mutateAsync`**                | Returns full envelope (e.g., `result.data.expiresAt`)                |
| **Icons**                        | Always `lucide-react`, never `@heroicons` or others                  |
| **Styling**                      | TailwindCSS 4 via `@tailwindcss/vite`, classes only — no CSS modules |
| **File extensions**              | `.js` in import paths (`import { x } from './file.js'`)              |
| **Admin vs Developer apiClient** | Admin sends `X-Tenant-Slug`; Developer does NOT                      |

---

## 10. File Inventory Summary

### New Files (46 total)

| Batch | Category              | Count | Files                                                                                                       |
| ----- | --------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| 7     | Sentry init           | 2     | `admin/lib/sentry.ts`, `developer/lib/sentry.ts`                                                            |
| 7     | Shared types          | 7     | `error-log`, `audit-log`, `deployment`, `billing`, `system-log`, `user-session`, `health-check` `.types.ts` |
| 8     | Backend routes        | 4     | `audit-logs.route.ts`, `system-logs.route.ts`, `deployments.route.ts`, `billing.route.ts`                   |
| 8     | Backend services      | 3     | `system-log.service.ts`, `deployment.service.ts`, `billing.service.ts`                                      |
| 8     | Backend model         | 1     | `deployment.model.ts`                                                                                       |
| 9     | Dev portal — Audit    | 3     | `AuditLogsPage.tsx`, `useAuditLogs.ts`, `AuditLogDetailSheet.tsx`                                           |
| 9     | Dev portal — SysLog   | 2     | `SystemLogsPage.tsx`, `useSystemLogs.ts`                                                                    |
| 10    | Dev portal — Sessions | 3     | `UserSessionsPage.tsx`, `useUserSessions.ts`, `SessionDetailSheet.tsx`                                      |
| 10    | Dev portal — Deploys  | 3     | `DeploymentsPage.tsx`, `useDeployments.ts`, `DeploymentDetailSheet.tsx`                                     |
| 11    | Dev portal — Billing  | 4     | `BillingPage.tsx`, `useBilling.ts`, `RevenueChart.tsx`, `InvoiceDetailSheet.tsx`                            |
| 11    | Admin — Sessions      | 2     | `SessionsTab.tsx`, `useAdminSessions.ts`                                                                    |
| 11    | Admin — Banner        | 2     | `SupportSessionBanner.tsx`, `useSupportSession.ts`                                                          |
| 12    | Backend — Restore     | 1     | `backup-restore-test.cron.ts`                                                                               |
| 12    | Tests                 | 6     | 6 hook test files                                                                                           |

### Modified Files (9 total)

| Batch | File                                                      | Change                                            |
| ----- | --------------------------------------------------------- | ------------------------------------------------- |
| 7     | `apps/admin/src/main.tsx`                                 | Import + call `initSentry()`                      |
| 7     | `apps/developer/src/main.tsx`                             | Import + call `initSentry()`                      |
| 7     | `apps/admin/src/App.tsx`                                  | Wrap in `Sentry.ErrorBoundary`                    |
| 7     | `apps/developer/src/App.tsx`                              | Wrap in `Sentry.ErrorBoundary`                    |
| 7     | `packages/shared/src/types/index.ts`                      | Add 7 type re-exports                             |
| 8     | `apps/api/src/server.ts`                                  | Register 4 new route groups                       |
| 9-10  | `apps/developer/src/router.tsx`                           | Replace 4 PlaceholderPages + add `/user-sessions` |
| 11    | `apps/admin/src/features/settings/pages/SettingsPage.tsx` | Replace Sessions ComingSoonTab                    |
| 11    | `apps/admin/src/layouts/DashboardLayout.tsx`              | Mount SupportSessionBanner                        |

### Deferred to Phase 7 (NOT in this plan)

| Item                             | Reason                           |
| -------------------------------- | -------------------------------- |
| Feature Flags (`/flags`)         | No spec in any planning doc      |
| Custom Fields (`/fields`)        | No spec in any planning doc      |
| Platform Settings (`/settings`)  | No spec in any planning doc      |
| Storage (`/storage`)             | No spec in any planning doc      |
| Session anomaly detection (D6)   | Marked "Phase 6+" in BUILD_RULES |
| `platform_support` role          | Marked "Phase 6+" in MASTER_PLAN |
| Platform metrics history cron    | Marked "Phase 6+ optional"       |
| ClamAV virus scanning            | Marked "optional, Phase 6+"      |
| Disaster Recovery Plan (RTO/RPO) | Documentation task, not code     |

---

## Appendix A: Dependency Graph

```
Batch 7 ──────────────────────────────┐
  (Sentry + Types — no deps)         │
                                      │
Batch 8 ──────────────────────────────┤
  (Backend routes — no deps)          │
                                      ├── Batch 12 (Tests — needs all)
Batch 9 ─── depends on Batch 8 ──────┤
  (Audit + System logs pages)         │
                                      │
Batch 10 ── depends on Batch 8 ──────┤
  (Sessions + Deploys pages)          │
                                      │
Batch 11 ── depends on Batch 8 ──────┘
  (Billing + Admin portal)
```

**Parallel execution possible:** Batches 7 and 8 can run simultaneously. Batches 9, 10, 11 can also run in parallel after Batch 8 completes.

## Appendix B: Environment Variables Required

All already defined in `apps/api/src/config/env.ts`:

| Variable            | Purpose                   | Status                            |
| ------------------- | ------------------------- | --------------------------------- |
| `SENTRY_DSN`        | Backend + frontend Sentry | ✅ Exists in env.ts               |
| `VITE_SENTRY_DSN`   | Frontend Sentry (new)     | ❌ Add to `.env` files            |
| `VITE_APP_VERSION`  | Sentry release tag (new)  | ❌ Add to `.env` or inject via CI |
| `AXIOM_TOKEN`       | pino-axiom transport      | ✅ Exists in env.ts               |
| `AXIOM_DATASET`     | pino-axiom dataset        | ✅ Exists in env.ts               |
| `SENTRY_AUTH_TOKEN` | Source map upload (CI)    | ✅ Referenced in vite.config.ts   |
| `SENTRY_ORG`        | Sentry org slug (CI)      | ✅ Referenced in vite.config.ts   |
| `SENTRY_PROJECT`    | Sentry project slug (CI)  | ✅ Referenced in vite.config.ts   |

## Appendix C: NPM Dependencies to Add

| Package         | Where                         | Purpose             |
| --------------- | ----------------------------- | ------------------- |
| `@sentry/react` | `apps/admin/package.json`     | Frontend Sentry SDK |
| `@sentry/react` | `apps/developer/package.json` | Frontend Sentry SDK |

> **Note:** `@sentry/node` is already in `apps/api/package.json`. `@sentry/vite-plugin` is already in both frontend apps.
