# Phase 6 — Pre-Launch Hardening: Frontend Files Audit

**Date:** 2026-03-03  
**Branch:** `main`  
**Audit Scope:** All Phase 6 frontend files (Sentry, Vite configs, developer portal feature modules)  
**Auditor:** GitHub Copilot (Claude Opus 4.6)

---

## Executive Summary

| Category                | Files        | Status                | Score            |
| ----------------------- | ------------ | --------------------- | ---------------- |
| Sentry (Admin)          | 3 files      | ✅ PASS               | **10/10**        |
| Sentry (Developer)      | 3 files      | ✅ PASS               | **10/10**        |
| Vite Config (Admin)     | 1 file       | ✅ PASS               | **10/10**        |
| Vite Config (Developer) | 1 file       | ✅ PASS               | **10/10**        |
| Audit Logs Module       | 4 files      | ⚠️ PASS with issues   | **8/10**         |
| System Logs Module      | 3 files      | ⚠️ PASS with issues   | **8/10**         |
| Deployments Module      | 4 files      | ⚠️ PASS with issues   | **8/10**         |
| Billing Module          | 5 files      | ⚠️ PASS with issues   | **7/10**         |
| User Sessions Module    | 4 files      | ⚠️ PASS with issues   | **8/10**         |
| Monitoring Module       | 11 files     | ⚠️ PASS with issues   | **7/10**         |
| Admin audit-logs pages  | 0 files      | ❌ NOT IMPLEMENTED    | **0/10**         |
| **Overall**             | **39 files** | **⚠️ PASS with gaps** | **86/110 (78%)** |

**Major findings:**

- RTL violations across ALL feature modules (20 total)
- `PaginationMeta` duplicated locally in 2 hooks (no shared type exists in `@dento/shared`)
- `useHealthStatus` uses raw `fetch()` instead of `apiClient`
- Monitoring hooks `useResolveError` / `useUnresolveError` missing toast notifications on success/error
- Local types in `useErrorLogs` instead of `@dento/shared` exports
- No Phase 6 admin audit-logs pages exist
- `text-right` / `text-left` RTL violations in InvoiceDetailSheet table

---

## 1. Sentry — Admin App

### 1.1 `apps/admin/src/lib/sentry.ts` — ✅ PASS

| Check                   | Verdict | Notes                                                        |
| ----------------------- | ------- | ------------------------------------------------------------ |
| PII scrubbing           | ✅      | Deletes `cookie` and `authorization` headers in `beforeSend` |
| Environment detection   | ✅      | Uses `import.meta.env.MODE`                                  |
| Release tagging         | ✅      | `dento-admin@${VITE_APP_VERSION}`                            |
| Production sample rates | ✅      | `tracesSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0`     |
| Graceful no-DSN         | ✅      | Early return if no `VITE_SENTRY_DSN`                         |
| Ignored errors          | ✅      | `ResizeObserver`, `AbortError`, `ChunkLoadError` etc.        |

**Issues:** None.

**Recommendation:** Consider also scrubbing `x-forwarded-for` and `set-cookie` headers for HIPAA compliance.

### 1.2 `apps/admin/src/main.tsx` — ✅ PASS

| Check                                     | Verdict | Notes                                                  |
| ----------------------------------------- | ------- | ------------------------------------------------------ |
| `initSentry()` called before `createRoot` | ✅      | Line 7 calls `initSentry()`, line 9 calls `createRoot` |
| StrictMode wrapping                       | ✅      |                                                        |

### 1.3 `apps/admin/src/App.tsx` — ✅ PASS

| Check                           | Verdict | Notes                                     |
| ------------------------------- | ------- | ----------------------------------------- |
| `Sentry.ErrorBoundary` wrapping | ✅      | Wraps `RouterProvider` at line 21         |
| Fallback component              | ✅      | `SentryFallback` with reload button       |
| QueryClientProvider             | ✅      | Proper defaults (5min staleTime, 1 retry) |
| Toaster from `@dento/ui`        | ✅      | `import { Toaster } from '@dento/ui'`     |

**Minor:** `position="top-right"` at line 24 is a physical RTL direction — has `TODO` comment acknowledging Sonner limitation.

---

## 2. Sentry — Developer App

### 2.1 `apps/developer/src/lib/sentry.ts` — ✅ PASS

Identical structure to admin. Release tag: `dento-developer@${VITE_APP_VERSION}`. All checks pass.

### 2.2 `apps/developer/src/main.tsx` — ✅ PASS

Same pattern as admin. `initSentry()` → `createRoot`.

### 2.3 `apps/developer/src/App.tsx` — ✅ PASS

Same pattern as admin. `Sentry.ErrorBoundary` wraps router. Same `top-right` Toaster limitation.

---

## 3. Vite Config — Admin

### `apps/admin/vite.config.ts` — ✅ PASS

| Check                     | Verdict | Notes                                                                    |
| ------------------------- | ------- | ------------------------------------------------------------------------ |
| Source maps in production | ✅      | `sourcemap: isSentryUpload ? 'hidden' : false` — never shipped to client |
| Sentry plugin             | ✅      | Conditional on `SENTRY_AUTH_TOKEN`, deletes `.map` files after upload    |
| Bundle analyzer           | ✅      | Conditional on `ANALYZE=true`                                            |
| Path alias                | ✅      | `@` → `./src`                                                            |

---

## 4. Vite Config — Developer

### `apps/developer/vite.config.ts` — ✅ PASS

Same structure as admin. Port 3002 instead of 3000. Project defaults to `dento-developer`. All checks pass.

---

## 5. Audit Logs Module (`apps/developer/src/features/audit-logs/`)

**Files:** 4 (1 hook, 1 page, 1 component, 1 test)

### 5.1 `hooks/useAuditLogs.ts` — ✅ PASS

| Check                          | Verdict | Notes                                                    |
| ------------------------------ | ------- | -------------------------------------------------------- |
| Uses `apiClient`               | ✅      | `import { apiClient } from '../../../lib/api-client.js'` |
| Uses TanStack Query            | ✅      | `useQuery` with proper query keys                        |
| Types from `@dento/shared`     | ✅      | `AuditLogEntry`, `AuditLogFilters`, `AuditLogStats`      |
| Response envelope typed        | ✅      | Full `{ success, data, meta }` envelope types            |
| `any` types                    | ✅ None |                                                          |
| `@ts-ignore`                   | ✅ None |                                                          |
| PaginationMeta defined locally | ✅ NO   | Inline `meta` shape in response interface                |

### 5.2 `pages/AuditLogsPage.tsx` — ⚠️ PASS with issues

| Check                  | Verdict | Notes                                                                                        |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------- |
| Loading states         | ✅      | `isLoading` passed to `DataTable`                                                            |
| Error states           | ❌      | No error handling — `isError` / `error` not destructured or displayed                        |
| Empty states           | ✅      | `emptyMessage="No audit logs found."`                                                        |
| Toast from `@dento/ui` | N/A     | No toast used on this page                                                                   |
| RTL violations         | ❌      | See below                                                                                    |
| `any` types            | ✅ None |                                                                                              |
| Hardcoded strings      | ⚠️      | "Audit Logs", "Platform-wide security and change audit trail" (non-i18n, acceptable for MVP) |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 1 | [AuditLogsPage.tsx](apps/developer/src/features/audit-logs/pages/AuditLogsPage.tsx#L186) | 186 | `left-3` | → `start-3` |
| 2 | [AuditLogsPage.tsx](apps/developer/src/features/audit-logs/pages/AuditLogsPage.tsx#L194) | 194 | `pl-9` | → `ps-9` |

**Stat card "Failures" computation (lines 160-165):** The expression is a no-op placeholder that just returns a meaningless value — needs real failure count from stats.

### 5.3 `components/AuditLogDetailSheet.tsx` — ⚠️ PASS with issues

| Check                  | Verdict | Notes                                                             |
| ---------------------- | ------- | ----------------------------------------------------------------- |
| Loading states         | ⚠️      | No explicit loading spinner while `useAuditLogDetail` is fetching |
| Error states           | ❌      | No error state shown if detail fetch fails                        |
| Toast from `@dento/ui` | ✅      | `import { toast } from '@dento/ui'`                               |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 3 | [AuditLogDetailSheet.tsx](apps/developer/src/features/audit-logs/components/AuditLogDetailSheet.tsx#L147) | 147 | `mr-1` | → `me-1` |
| 4 | [AuditLogDetailSheet.tsx](apps/developer/src/features/audit-logs/components/AuditLogDetailSheet.tsx#L171) | 171 | `mr-1` | → `me-1` |
| 5 | [AuditLogDetailSheet.tsx](apps/developer/src/features/audit-logs/components/AuditLogDetailSheet.tsx#L194) | 194 | `mr-1` | → `me-1` |

### 5.4 `hooks/useAuditLogs.test.ts` — ✅ PASS

Good structure, mocks `apiClient`, tests all 3 hooks and key factory. No issues.

---

## 6. System Logs Module (`apps/developer/src/features/system-logs/`)

**Files:** 3 (1 hook, 1 page, 1 test)

### 6.1 `hooks/useSystemLogs.ts` — ✅ PASS

| Check                      | Verdict | Notes                                                         |
| -------------------------- | ------- | ------------------------------------------------------------- |
| Uses `apiClient`           | ✅      |                                                               |
| TanStack Query             | ✅      |                                                               |
| Types from `@dento/shared` | ✅      | `SystemLog`, `SystemLogFilters`, `SystemLogStats`             |
| PaginationMeta             | ✅      | Inline in response type, not duplicated as separate interface |

### 6.2 `pages/SystemLogsPage.tsx` — ⚠️ PASS with issues

| Check          | Verdict | Notes                                  |
| -------------- | ------- | -------------------------------------- |
| Loading states | ✅      | `isLoading` to DataTable               |
| Error states   | ❌      | No `isError` / error handling          |
| Empty states   | ✅      | `emptyMessage="No system logs found."` |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 6 | [SystemLogsPage.tsx](apps/developer/src/features/system-logs/pages/SystemLogsPage.tsx#L175) | 175 | `left-3` | → `start-3` |
| 7 | [SystemLogsPage.tsx](apps/developer/src/features/system-logs/pages/SystemLogsPage.tsx#L183) | 183 | `pl-9` | → `ps-9` |

### 6.3 `hooks/useSystemLogs.test.ts` — ✅ PASS

---

## 7. Deployments Module (`apps/developer/src/features/deployments/`)

**Files:** 4 (1 hook, 1 page, 1 component, 1 test)

### 7.1 `hooks/useDeployments.ts` — ⚠️ Minor issue

| Check                              | Verdict | Notes                                                      |
| ---------------------------------- | ------- | ---------------------------------------------------------- |
| Uses `apiClient`                   | ✅      |                                                            |
| TanStack Query                     | ✅      | `useQuery` + `useMutation`                                 |
| Toast from `@dento/ui`             | ✅      | Rollback success/error toasts                              |
| **PaginationMeta defined locally** | ❌      | Lines 23-28: `interface PaginationMeta` duplicated locally |

### 7.2 `pages/DeploymentsPage.tsx` — ⚠️ PASS with issues

| Check          | Verdict | Notes                                  |
| -------------- | ------- | -------------------------------------- |
| Loading states | ✅      |                                        |
| Error states   | ❌      | No error handling                      |
| Empty states   | ✅      | `emptyMessage="No deployments found."` |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 8 | [DeploymentsPage.tsx](apps/developer/src/features/deployments/pages/DeploymentsPage.tsx#L190) | 190 | `mr-1` | → `me-1` |

### 7.3 `components/DeploymentDetailSheet.tsx` — ⚠️ PASS with issues

| Check          | Verdict | Notes                                 |
| -------------- | ------- | ------------------------------------- |
| Loading states | ✅      | `Loader2` spinner shown while loading |
| Error states   | ❌      | No error state handling               |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 9 | [DeploymentDetailSheet.tsx](apps/developer/src/features/deployments/components/DeploymentDetailSheet.tsx#L98) | 98 | `mr-1.5` | → `me-1.5` |

### 7.4 `hooks/useDeployments.test.ts` — ✅ PASS

Covers all 4 hooks incl. rollback mutation. Well structured.

---

## 8. Billing Module (`apps/developer/src/features/billing/`)

**Files:** 5 (1 hook, 1 page, 2 components, 1 test)

### 8.1 `hooks/useBilling.ts` — ⚠️ Minor issue

| Check                              | Verdict | Notes                                                      |
| ---------------------------------- | ------- | ---------------------------------------------------------- |
| Uses `apiClient`                   | ✅      |                                                            |
| TanStack Query                     | ✅      | `useQuery` + `useMutation`                                 |
| Toast from `@dento/ui`             | ✅      | Send reminder success/error                                |
| **PaginationMeta defined locally** | ❌      | Lines 22-27: `interface PaginationMeta` duplicated locally |

### 8.2 `pages/BillingPage.tsx` — ⚠️ PASS with issues

| Check          | Verdict | Notes                                                                                              |
| -------------- | ------- | -------------------------------------------------------------------------------------------------- |
| Loading states | ⚠️      | No explicit loading skeleton for `useBillingStats` — stats block just doesn't render while loading |
| Error states   | ❌      | No error handling for stats or invoice queries                                                     |
| Empty states   | ✅      | `emptyMessage="No invoices found."`                                                                |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 10 | [BillingPage.tsx](apps/developer/src/features/billing/pages/BillingPage.tsx#L276) | 276 | `mr-1` | → `me-1` |

### 8.3 `components/InvoiceDetailSheet.tsx` — ❌ Multiple RTL violations

| Check          | Verdict | Notes                 |
| -------------- | ------- | --------------------- |
| Loading states | ✅      | Spinner while loading |
| Error states   | ❌      | No error handling     |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 11 | [InvoiceDetailSheet.tsx](apps/developer/src/features/billing/components/InvoiceDetailSheet.tsx#L89) | 89 | `mr-1.5` | → `me-1.5` |
| 12 | [InvoiceDetailSheet.tsx](apps/developer/src/features/billing/components/InvoiceDetailSheet.tsx#L149) | 149 | `text-left` | → `text-start` |
| 13 | [InvoiceDetailSheet.tsx](apps/developer/src/features/billing/components/InvoiceDetailSheet.tsx#L152) | 152 | `text-right` | → `text-end` |
| 14 | [InvoiceDetailSheet.tsx](apps/developer/src/features/billing/components/InvoiceDetailSheet.tsx#L155) | 155 | `text-right` | → `text-end` |
| 15 | [InvoiceDetailSheet.tsx](apps/developer/src/features/billing/components/InvoiceDetailSheet.tsx#L158) | 158 | `text-right` | → `text-end` |
| 16 | [InvoiceDetailSheet.tsx](apps/developer/src/features/billing/components/InvoiceDetailSheet.tsx#L167) | 167 | `text-right` | → `text-end` |
| 17 | [InvoiceDetailSheet.tsx](apps/developer/src/features/billing/components/InvoiceDetailSheet.tsx#L168) | 168 | `text-right` | → `text-end` |
| 18 | [InvoiceDetailSheet.tsx](apps/developer/src/features/billing/components/InvoiceDetailSheet.tsx#L171) | 171 | `text-right` | → `text-end` |

### 8.4 `components/RevenueChart.tsx` — ✅ PASS

Uses `recharts`, proper empty state, no RTL issues (SVG chart margins are not CSS logical properties).

### 8.5 `hooks/useBilling.test.ts` — ✅ PASS

Good coverage of all 4 hooks including `useSendReminder` mutation.

---

## 9. User Sessions Module (`apps/developer/src/features/user-sessions/`)

**Files:** 4 (1 hook, 1 page, 1 component, 1 test)

### 9.1 `hooks/useUserSessions.ts` — ✅ PASS

| Check                  | Verdict | Notes                                                   |
| ---------------------- | ------- | ------------------------------------------------------- |
| Uses `apiClient`       | ✅      | Including `apiClient.delete` for revoke                 |
| TanStack Query         | ✅      | `useQuery` + `useMutation`                              |
| Toast from `@dento/ui` | ✅      | Revoke success/error toasts                             |
| PaginationMeta         | ✅      | Inline in response interface, not a separate local type |

### 9.2 `pages/UserSessionsPage.tsx` — ⚠️ PASS with issues

| Check          | Verdict | Notes                               |
| -------------- | ------- | ----------------------------------- |
| Loading states | ✅      |                                     |
| Error states   | ❌      | No error handling                   |
| Empty states   | ✅      | `emptyMessage="No sessions found."` |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 19 | [UserSessionsPage.tsx](apps/developer/src/features/user-sessions/pages/UserSessionsPage.tsx#L139) | 139 | `mr-1` | → `me-1` |

### 9.3 `components/SessionDetailSheet.tsx` — ⚠️ PASS with issues

| Check          | Verdict | Notes             |
| -------------- | ------- | ----------------- |
| Loading states | ✅      | Spinner           |
| Error states   | ❌      | No error handling |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 20 | [SessionDetailSheet.tsx](apps/developer/src/features/user-sessions/components/SessionDetailSheet.tsx#L83) | 83 | `mr-1.5` | → `me-1.5` |

### 9.4 `hooks/useUserSessions.test.ts` — ✅ PASS

---

## 10. Monitoring Module (`apps/developer/src/features/monitoring/`)

**Files:** 11 (4 hooks, 3 pages, 4 components)

### 10.1 `hooks/useErrorLogs.ts` — ⚠️ Issues found

| Check                                | Verdict | Notes                                                                                                                      |
| ------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Uses `apiClient`                     | ✅      |                                                                                                                            |
| TanStack Query                       | ✅      |                                                                                                                            |
| **Types from `@dento/shared`**       | ❌      | `ErrorLog`, `ErrorLogFilters`, `PaginationMeta` ALL defined locally (lines 8-60) instead of importing from `@dento/shared` |
| **`PaginationMeta` defined locally** | ❌      | Lines 45-50: 3rd duplicate of this interface across hooks                                                                  |

### 10.2 `hooks/useResolveError.ts` — ⚠️ Issues found

| Check                   | Verdict | Notes                                                                                                                                        |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Uses `apiClient`        | ✅      | `apiClient.patch`                                                                                                                            |
| TanStack Query          | ✅      | `useMutation`                                                                                                                                |
| **Toast notifications** | ❌      | Neither `useResolveError` nor `useUnresolveError` call `toast.success`/`toast.error` — mutations silently succeed/fail with no user feedback |
| Query invalidation      | ✅      | Invalidates both `errorLogKeys.lists()` and `monitoringStatsKeys.all`                                                                        |

### 10.3 `hooks/useMonitoringStats.ts` — ✅ PASS

| Check                      | Verdict | Notes                                                           |
| -------------------------- | ------- | --------------------------------------------------------------- |
| Uses `apiClient`           | ✅      |                                                                 |
| Types from `@dento/shared` | ⚠️      | `ErrorStats` defined locally (lines 8-17) — should be in shared |

### 10.4 `hooks/useHealthStatus.ts` — ❌ Uses raw `fetch`

| Check                      | Verdict | Notes                                                                                                                  |
| -------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Uses `apiClient`**       | ❌      | Line 48: uses raw `fetch('/api/health')` — bypasses `apiClient` interceptors, error handling, and auth token injection |
| Types from `@dento/shared` | ❌      | `HealthData`, `HealthComponent`, `ComponentStatus` all defined locally                                                 |
| TanStack Query             | ✅      |                                                                                                                        |

**Justification comment exists** (line 47): "Health endpoint may not require auth and doesn't wrap in apiResponse envelope" — however, this still bypasses error interceptors and logging.

### 10.5 `pages/MonitoringPage.tsx` — ✅ PASS

Main tab wrapper. Delegates to sub-pages. Proper loading/empty handling via child components.

### 10.6 `pages/ErrorListPage.tsx` — ⚠️ Issues found

| Check          | Verdict   | Notes                   |
| -------------- | --------- | ----------------------- |
| Loading states | Delegated | Via `RecentErrorsTable` |
| Error states   | ❌        | No error handling       |
| Empty states   | Delegated | Via `RecentErrorsTable` |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 21 | [ErrorListPage.tsx](apps/developer/src/features/monitoring/pages/ErrorListPage.tsx#L49) | 49 | `left-3` | → `start-3` |
| 22 | [ErrorListPage.tsx](apps/developer/src/features/monitoring/pages/ErrorListPage.tsx#L54) | 54 | `pl-9` | → `ps-9` |
| 23 | [ErrorListPage.tsx](apps/developer/src/features/monitoring/pages/ErrorListPage.tsx#L109) | 109 | `mr-1` | → `me-1` |

### 10.7 `pages/HealthStatusPage.tsx` — ⚠️ Issues found

| Check          | Verdict | Notes                                      |
| -------------- | ------- | ------------------------------------------ |
| Loading states | ✅      | `ComponentStatusCardSkeleton` placeholders |
| Error states   | ❌      | If health check fetch fails, nothing shown |
| Empty states   | ⚠️      | `null` rendered when no components data    |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 24 | [HealthStatusPage.tsx](apps/developer/src/features/monitoring/pages/HealthStatusPage.tsx#L54) | 54 | `text-right` | → `text-end` |

### 10.8 `components/ErrorDetailSheet.tsx` — ⚠️ Issues found

| Check                  | Verdict | Notes                                                                    |
| ---------------------- | ------- | ------------------------------------------------------------------------ |
| Toast from `@dento/ui` | ✅      | `import { toast } from '@dento/ui'`                                      |
| Error states           | ❌      | No error handling if resolve/unresolve fails (mutation has no `onError`) |

**RTL Violations:**
| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 25 | [ErrorDetailSheet.tsx](apps/developer/src/features/monitoring/components/ErrorDetailSheet.tsx#L67) | 67 | `mr-1.5` | → `me-1.5` |
| 26 | [ErrorDetailSheet.tsx](apps/developer/src/features/monitoring/components/ErrorDetailSheet.tsx#L77) | 77 | `mr-1.5` | → `me-1.5` |
| 27 | [ErrorDetailSheet.tsx](apps/developer/src/features/monitoring/components/ErrorDetailSheet.tsx#L106) | 106 | `mr-1` | → `me-1` |

### 10.9 `components/ComponentStatusCard.tsx` — ✅ PASS

Clean component, proper types, no RTL issues.

### 10.10 `components/ErrorTimelineChart.tsx` — ✅ PASS

Recharts area chart. Has empty state and loading state. SVG `margin` prop `{ left: -10 }` is not a CSS logical property issue.

### 10.11 `components/RecentErrorsTable.tsx` — ✅ PASS

Uses `DataTable`, proper pagination, loading/empty states via DataTable, no RTL issues.

### 10.12 Missing Tests

❌ No test files exist for the monitoring module. The following hooks have **zero test coverage**:

- `useErrorLogs`
- `useResolveError` / `useUnresolveError`
- `useMonitoringStats`
- `useHealthStatus`

---

## 11. Admin Audit Logs Pages

❌ **NOT IMPLEMENTED.** No audit-logs pages/hooks exist under `apps/admin/src/features/`.

If Phase 6 requires admin-side audit log viewing, this is a gap.

---

## Complete RTL Violations Summary

**27 total RTL violations** across Phase 6 frontend files:

| #   | File                                             | Line | Class        | Fix          |
| --- | ------------------------------------------------ | ---- | ------------ | ------------ |
| 1   | audit-logs/pages/AuditLogsPage.tsx               | 186  | `left-3`     | `start-3`    |
| 2   | audit-logs/pages/AuditLogsPage.tsx               | 194  | `pl-9`       | `ps-9`       |
| 3   | audit-logs/components/AuditLogDetailSheet.tsx    | 147  | `mr-1`       | `me-1`       |
| 4   | audit-logs/components/AuditLogDetailSheet.tsx    | 171  | `mr-1`       | `me-1`       |
| 5   | audit-logs/components/AuditLogDetailSheet.tsx    | 194  | `mr-1`       | `me-1`       |
| 6   | system-logs/pages/SystemLogsPage.tsx             | 175  | `left-3`     | `start-3`    |
| 7   | system-logs/pages/SystemLogsPage.tsx             | 183  | `pl-9`       | `ps-9`       |
| 8   | deployments/pages/DeploymentsPage.tsx            | 190  | `mr-1`       | `me-1`       |
| 9   | deployments/components/DeploymentDetailSheet.tsx | 98   | `mr-1.5`     | `me-1.5`     |
| 10  | billing/pages/BillingPage.tsx                    | 276  | `mr-1`       | `me-1`       |
| 11  | billing/components/InvoiceDetailSheet.tsx        | 89   | `mr-1.5`     | `me-1.5`     |
| 12  | billing/components/InvoiceDetailSheet.tsx        | 149  | `text-left`  | `text-start` |
| 13  | billing/components/InvoiceDetailSheet.tsx        | 152  | `text-right` | `text-end`   |
| 14  | billing/components/InvoiceDetailSheet.tsx        | 155  | `text-right` | `text-end`   |
| 15  | billing/components/InvoiceDetailSheet.tsx        | 158  | `text-right` | `text-end`   |
| 16  | billing/components/InvoiceDetailSheet.tsx        | 167  | `text-right` | `text-end`   |
| 17  | billing/components/InvoiceDetailSheet.tsx        | 168  | `text-right` | `text-end`   |
| 18  | billing/components/InvoiceDetailSheet.tsx        | 171  | `text-right` | `text-end`   |
| 19  | user-sessions/pages/UserSessionsPage.tsx         | 139  | `mr-1`       | `me-1`       |
| 20  | user-sessions/components/SessionDetailSheet.tsx  | 83   | `mr-1.5`     | `me-1.5`     |
| 21  | monitoring/pages/ErrorListPage.tsx               | 49   | `left-3`     | `start-3`    |
| 22  | monitoring/pages/ErrorListPage.tsx               | 54   | `pl-9`       | `ps-9`       |
| 23  | monitoring/pages/ErrorListPage.tsx               | 109  | `mr-1`       | `me-1`       |
| 24  | monitoring/pages/HealthStatusPage.tsx            | 54   | `text-right` | `text-end`   |
| 25  | monitoring/components/ErrorDetailSheet.tsx       | 67   | `mr-1.5`     | `me-1.5`     |
| 26  | monitoring/components/ErrorDetailSheet.tsx       | 77   | `mr-1.5`     | `me-1.5`     |
| 27  | monitoring/components/ErrorDetailSheet.tsx       | 106  | `mr-1`       | `me-1`       |

---

## Cross-Cutting Issues

### Issue 1: No error state handling (ALL pages)

Every single Phase 6 page destructures only `{ data, isLoading }` from hooks. None destructure `isError` or `error`. If an API call fails, the user sees "No X found" (empty state) instead of an error message. This is a UX deficiency.

**Affected files (8):**

- `audit-logs/pages/AuditLogsPage.tsx`
- `system-logs/pages/SystemLogsPage.tsx`
- `deployments/pages/DeploymentsPage.tsx`
- `billing/pages/BillingPage.tsx` (both tabs)
- `user-sessions/pages/UserSessionsPage.tsx`
- `monitoring/pages/ErrorListPage.tsx`
- `monitoring/pages/HealthStatusPage.tsx`
- `monitoring/pages/MonitoringPage.tsx` (overview stats)

### Issue 2: `PaginationMeta` duplicated locally

`PaginationMeta` interface is defined **locally in 2 Phase 6 hooks** (and 4 more non-Phase-6 hooks):

- `deployments/hooks/useDeployments.ts` line 23
- `billing/hooks/useBilling.ts` line 22
- `monitoring/hooks/useErrorLogs.ts` line 45

`@dento/shared` only exports a `buildPaginationMeta()` utility function but **no `PaginationMeta` type**. Should add and re-export the type.

### Issue 3: `useHealthStatus` bypasses `apiClient`

`monitoring/hooks/useHealthStatus.ts` line 48 uses raw `fetch()`. While the health endpoint may be auth-free, this bypasses:

- Global error interceptors
- Request/response logging
- Sentry breadcrumb tracking

### Issue 4: `useResolveError` / `useUnresolveError` — silent mutations

`monitoring/hooks/useResolveError.ts`: Neither mutation has `onSuccess`/`onError` callbacks with toast notifications. Other mutations (rollback, revoke, send reminder) all provide user feedback.

### Issue 5: Local types in monitoring hooks

`useErrorLogs.ts` defines `ErrorLog`, `ErrorLogFilters`, and `PaginationMeta` locally (~50 lines of types). These should be in `@dento/shared` alongside other Phase 6 shared types.

### Issue 6: `any` types — None in Phase 6 files ✅

No `any` types or `@ts-ignore` found in any Phase 6 frontend file.

### Issue 7: Hardcoded strings

All page titles/descriptions are hardcoded English strings. Acceptable for MVP but would need i18n for production. Not blocking.

### Issue 8: `apiClient.get<T>()` envelope typing

All hooks correctly type T as the full envelope (`{ success: boolean; data: X; meta?: Y }`), then use `select` to unwrap. ✅ Correct pattern.

### Issue 9: Toaster RTL position

Both `apps/admin/src/App.tsx` line 24 and `apps/developer/src/App.tsx` line 24 use `position="top-right"` — this is a physical direction incompatible with RTL. A `TODO` comment acknowledges this is a Sonner library limitation.

---

## Recommendations (Priority Order)

1. **P0 — Add error states** to all 8 pages: destructure `isError`/`error` and show an error banner
2. **P0 — Add toast feedback** to `useResolveError` / `useUnresolveError` mutations
3. **P1 — Fix 27 RTL violations** (find-and-replace: `mr-` → `me-`, `ml-` → `ms-`, `pl-` → `ps-`, `pr-` → `pe-`, `left-` → `start-`, `right-` → `end-`, `text-left` → `text-start`, `text-right` → `text-end`)
4. **P1 — Extract `PaginationMeta` type** to `@dento/shared` and remove local duplicates
5. **P1 — Move monitoring types** (`ErrorLog`, `ErrorLogFilters`, `ErrorStats`, `HealthData`) to `@dento/shared`
6. **P2 — Add loading state** for `AuditLogDetailSheet` while detail is being fetched
7. **P2 — Fix Failures stat card** in AuditLogsPage (placeholder computation at lines 160-165)
8. **P2 — Add monitoring hook tests** (4 hooks have zero test coverage)
9. **P2 — Consider `apiClient` wrapper** for health check endpoint
10. **P3 — Assess** whether admin app needs audit-logs pages
