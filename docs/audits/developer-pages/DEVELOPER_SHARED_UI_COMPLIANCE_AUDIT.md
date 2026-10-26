# Deep Compliance Audit — Developer Frontend, Shared & UI Packages

> **Date:** 2025-01-XX  
> **Scope:** `apps/developer/src/`, `packages/shared/src/`, `packages/ui/src/`  
> **Auditor:** Automated Deep Scan  
> **Standard:** Dento v2 Build Rules, PLATFORM_RBAC.md, V2_STRUCTURE.md

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Part 1 — Developer Frontend (`apps/developer/src/`)](#2-part-1--developer-frontend)
   - [2.1 Core Infrastructure](#21-core-infrastructure)
   - [2.2 Feature-by-Feature Audit](#22-feature-by-feature-audit)
   - [2.3 RTL Compliance Matrix](#23-rtl-compliance-matrix)
   - [2.4 Loading / Error / Empty State Matrix](#24-loading--error--empty-state-matrix)
   - [2.5 Toast Usage Matrix](#25-toast-usage-matrix)
   - [2.6 Mock Data vs Real Hooks Matrix](#26-mock-data-vs-real-hooks-matrix)
   - [2.7 @dento/ui Adoption Matrix](#27-dentoui-adoption-matrix)
3. [Part 2 — Shared Package (`packages/shared/src/`)](#3-part-2--shared-package)
   - [3.1 Barrel Exports](#31-barrel-exports)
   - [3.2 Schema `.strict()` Audit](#32-schema-strict-audit)
   - [3.3 Types Completeness](#33-types-completeness)
   - [3.4 Constants Audit](#34-constants-audit)
   - [3.5 Utils Audit](#35-utils-audit)
4. [Part 3 — UI Package (`packages/ui/src/`)](#4-part-3--ui-package)
   - [4.1 Barrel Exports](#41-barrel-exports)
   - [4.2 Primitives Audit](#42-primitives-audit)
   - [4.3 Composites Audit](#43-composites-audit)
   - [4.4 Design Tokens & globals.css](#44-design-tokens--globalscss)
   - [4.5 RTL Compliance in UI](#45-rtl-compliance-in-ui)
5. [Critical Issues Summary](#5-critical-issues-summary)
6. [Remediation Checklist](#6-remediation-checklist)

---

## 1. Executive Summary

| Area               | Files Audited | Critical | High  | Medium |  Low  |
| ------------------ | :-----------: | :------: | :---: | :----: | :---: |
| Developer Frontend |     ~65+      |    2     |   5   |   8    |   6   |
| Shared Package     |      ~70      |    1     |   0   |   1    |   0   |
| UI Package         |      ~38      |    0     |   0   |   1    |   1   |
| **Total**          |   **~173**    |  **3**   | **5** | **10** | **7** |

### Top-Level Verdicts

| Check                                       | Status                                     |
| ------------------------------------------- | ------------------------------------------ |
| `api-client.ts` — No `X-Tenant-Slug` header | ✅ PASS                                    |
| All schemas use `.strict()`                 | ❌ FAIL — 8 files missing                  |
| RTL logical properties everywhere           | ❌ FAIL — 51 violations in developer app   |
| Toaster position uses logical property      | ⚠️ TODO — hardcoded `top-right`            |
| All pages have Loading/Error/Empty          | ⚠️ PARTIAL — 5 mock-data pages skip states |
| Barrel exports complete                     | ✅ PASS                                    |
| Permission gating on routes                 | ✅ PASS                                    |
| UI package zero RTL violations              | ✅ PASS                                    |

---

## 2. Part 1 — Developer Frontend

### 2.1 Core Infrastructure

#### `lib/api-client.ts` (168 lines)

| Check                                         | Result                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| No `X-Tenant-Slug` header                     | ✅ **CONFIRMED** — Developer portal is platform-level, no tenant header sent |
| `credentials: 'include'` for HttpOnly cookies | ✅                                                                           |
| Silent 401 refresh with queue dedup           | ✅                                                                           |
| `ApiError` class with structured error        | ✅                                                                           |
| Base URL from `VITE_API_URL` env              | ✅                                                                           |

#### `lib/sentry.ts`

| Check                                                | Result |
| ---------------------------------------------------- | ------ |
| PII scrubbing (strips Authorization header)          | ✅     |
| `tracesSampleRate 0.1` in production                 | ✅     |
| Ignores ResizeObserver / AbortError / ChunkLoadError | ✅     |

#### `App.tsx`

| Check                                           | Result                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| `QueryClientProvider` (staleTime 5min, retry 1) | ✅                                                                       |
| `Sentry.ErrorBoundary` + fallback               | ✅                                                                       |
| `Toaster` from `@dento/ui`                      | ✅                                                                       |
| **Toaster position**                            | ⚠️ `position="top-right"` — **TODO in code** to use RTL logical position |

#### `router.tsx`

| Check                                                                | Result |
| -------------------------------------------------------------------- | ------ |
| `ProtectedRoute` guard on all dashboard paths                        | ✅     |
| `GuestRoute` for `/login`                                            | ✅     |
| `PlatformRoute` with `permission="platform_users.read"` for `/users` | ✅     |
| Public `/invite/:token` route                                        | ✅     |
| Fallback `*` → Navigate `/`                                          | ✅     |

#### `stores/auth.store.ts`

| Check                                                | Result |
| ---------------------------------------------------- | ------ |
| No `persist` middleware (tokens in HttpOnly cookies) | ✅     |
| `hasPlatformPerm()` with wildcard support            | ✅     |

#### `stores/sidebar.store.ts`

| Check                                      | Result |
| ------------------------------------------ | ------ |
| `persist` with key `'dev-sidebar-storage'` | ✅     |

#### `config/sidebar-config.ts`

| Check                        | Result |
| ---------------------------- | ------ |
| Per-item `permission` gating | ✅     |
| 7 sections, ~20 items        | ✅     |

### 2.1.1 Critical Issues in Core

#### **CRITICAL: `AppSidebar.tsx` duplicates navigation without permission filtering**

- **File:** `components/AppSidebar.tsx` (306 lines)
- **Issue:** Contains a hardcoded `navSections` array that **duplicates** `sidebar-config.ts` BUT does **NOT** filter by `hasPlatformPerm()`.
- **Contrast:** `layouts/Sidebar/Sidebar.tsx` correctly imports `DEV_SIDEBAR_CONFIG` and filters by permission.
- **Impact:** If `AppSidebar` is the one mounted in `DevPortalLayout`, unprivileged users could see nav items they shouldn't access.
- **Severity:** 🔴 **CRITICAL**

#### **HIGH: `PlatformUsersPage` uses dynamic `import()` + `window.location.reload()`**

- **File:** `features/platform-users/pages/PlatformUsersPage.tsx` (line ~400+)
- **Issue:** `handleConfirmAction` for suspend/activate uses:
  ```ts
  const { apiClient } = await import('../../../lib/api-client.js');
  // ... then window.location.reload()
  ```
- **Fix:** Use proper mutation hook + `queryClient.invalidateQueries()` instead of page reload.
- **Severity:** 🟠 **HIGH**

---

### 2.2 Feature-by-Feature Audit

#### `dashboard/` — DashboardPage.tsx

| Check       | Status | Notes                                    |
| ----------- | ------ | ---------------------------------------- |
| Loading     | N/A    | Static placeholder page                  |
| Error       | N/A    | No data fetching                         |
| Empty       | N/A    | Shows "—" for all stat values            |
| RTL         | ✅     | No directional classes                   |
| Toast       | N/A    | No actions                               |
| **Verdict** | ⚠️     | Phase 5 placeholder — all values are "—" |

#### `auth/` — DevLoginPage.tsx + AcceptInvitePage.tsx

| Check      | Status | Notes                                                                           |
| ---------- | ------ | ------------------------------------------------------------------------------- |
| Loading    | ✅     | Login: `isLoading` on button. Invite: loading spinner during token verification |
| Error      | ✅     | Login: toast.error on failure. Invite: "Invalid or expired token" state         |
| Empty      | N/A    | Not applicable for auth flows                                                   |
| RTL        | ✅     | No directional violations found                                                 |
| Toast      | ✅     | `toast.error` / `toast.success` throughout                                      |
| 2FA TOTP   | ✅     | Full TOTP flow with `InputOTP` from `@dento/ui`                                 |
| Role check | ✅     | Enforces `platform_admin` role on login                                         |

#### `tenants/` — TenantsPage.tsx + TenantDetailPage.tsx

| Check       | Status  | Notes                                                                   |
| ----------- | ------- | ----------------------------------------------------------------------- |
| Loading     | ❌      | **MOCK DATA — no real hooks, no loading state**                         |
| Error       | ❌      | No error handling                                                       |
| Empty       | ⚠️      | Search filter with "No tenants found" but mock only                     |
| RTL         | ✅      | Uses `text-start` correctly                                             |
| Toast       | ❌      | No toast (no mutations)                                                 |
| **Verdict** | 🟡 Mock | 7 hardcoded tenants. TenantDetailPage (2402 lines) has 10 tabs all mock |

#### `api-catalog/` — ApiCatalogPage.tsx (517 lines)

| Check     | Status | Notes                                                                                       |
| --------- | ------ | ------------------------------------------------------------------------------------------- |
| Loading   | ✅     | Full-page spinner while fetching OpenAPI spec                                               |
| Error     | ✅     | Error state with retry button                                                               |
| Empty     | ✅     | "No endpoints match your search"                                                            |
| RTL       | ✅     | Uses `start-3`, `ps-10`, `text-start`, `ms-3`                                               |
| Toast     | N/A    | Read-only catalog                                                                           |
| **Issue** | ⚠️     | Uses raw `fetch()` instead of `apiClient` — acceptable since it fetches public OpenAPI JSON |
| **Issue** | ⚠️     | Uses `useState` + `useEffect` instead of React Query — inconsistent pattern                 |

#### `api-keys/` — ApiKeysPage.tsx (451 lines)

| Check       | Status  | Notes                                                      |
| ----------- | ------- | ---------------------------------------------------------- |
| Loading     | ❌      | **MOCK DATA — no loading state**                           |
| Error       | ❌      | No error handling                                          |
| Empty       | ✅      | "No API keys found matching your filters"                  |
| RTL         | ✅      | Uses `text-start` on table                                 |
| Toast       | ❌      | No toast (button actions are non-functional)               |
| **Verdict** | 🟡 Mock | 6 hardcoded API keys. Actions (rotate, revoke) are UI-only |

#### `backups/` — BackupsPage.tsx + BackupConfigPanel.tsx + useBackups.ts

| Check      | Status | Notes                                                                 |
| ---------- | ------ | --------------------------------------------------------------------- |
| Loading    | ✅     | `DataTable` `isLoading` prop                                          |
| Error      | ⚠️     | Toast on mutation failure, but no explicit error state for list fetch |
| Empty      | ✅     | `DataTable` `emptyMessage`                                            |
| RTL        | ❌     | `left-3`, `pl-9`, `mr-1.5`, `mr-1` — **7 violations**                 |
| Toast      | ✅     | Trigger, restore, delete all use `toast.success` / `toast.error`      |
| Real hooks | ✅     | Full CRUD hooks in `useBackups.ts`                                    |

#### `billing/` — BillingPage.tsx + InvoiceDetailSheet.tsx + useBilling.ts

| Check      | Status | Notes                                                                           |
| ---------- | ------ | ------------------------------------------------------------------------------- |
| Loading    | ✅     | `DataTable` `isLoading`, stat loading                                           |
| Error      | ⚠️     | Toast on reminder failure only                                                  |
| Empty      | ✅     | `DataTable` `emptyMessage`                                                      |
| RTL        | ❌     | `mr-1`, `text-left`, `text-right` — **8 violations** (InvoiceDetailSheet table) |
| Toast      | ✅     | Send reminder uses toast                                                        |
| Real hooks | ✅     | Stats, invoice list, detail, send reminder                                      |
| Tests      | ✅     | `useBilling.test.ts` — key factory, stats, list, detail null guard, mutation    |

#### `audit-logs/` — AuditLogsPage.tsx + AuditLogDetailSheet.tsx + useAuditLogs.ts

| Check      | Status | Notes                                        |
| ---------- | ------ | -------------------------------------------- |
| Loading    | ✅     | `DataTable` `isLoading`                      |
| Error      | ⚠️     | No explicit error state                      |
| Empty      | ✅     | `DataTable` `emptyMessage`                   |
| RTL        | ❌     | `left-3`, `pl-9`, `mr-1` — **5 violations**  |
| Toast      | ✅     | Copy-to-clipboard uses toast                 |
| Real hooks | ✅     | List, detail, stats                          |
| Tests      | ✅     | Full test suite with key factory, null guard |

#### `deployments/` — DeploymentsPage.tsx + DeploymentDetailSheet.tsx + useDeployments.ts

| Check      | Status | Notes                                                       |
| ---------- | ------ | ----------------------------------------------------------- |
| Loading    | ✅     | `DataTable` `isLoading`, detail sheet Loader2 spinner       |
| Error      | ⚠️     | Toast on rollback failure only                              |
| Empty      | ✅     | `DataTable` `emptyMessage`                                  |
| RTL        | ❌     | `mr-1`, `mr-1.5` — **2 violations**                         |
| Toast      | ✅     | Rollback mutation uses toast                                |
| Real hooks | ✅     | List, detail, stats, rollback                               |
| Types      | ✅     | Uses `@dento/shared` types (Deployment, DeployStatus, etc.) |
| Tests      | ✅     | Full test suite                                             |

#### `domains/` — DomainsPage.tsx + AddDomainDialog.tsx + DomainDetailSheet.tsx + useDomains.ts

| Check      | Status | Notes                                                               |
| ---------- | ------ | ------------------------------------------------------------------- |
| Loading    | ✅     | `DataTable` `isLoading`                                             |
| Error      | ⚠️     | Toast on create/verify/delete failure                               |
| Empty      | ✅     | `DataTable` `emptyMessage`                                          |
| RTL        | ❌     | `left-3`, `pl-9`, `mr-1.5` — **5 violations**                       |
| Toast      | ✅     | Create, verify, delete, clipboard all use toast                     |
| Real hooks | ✅     | Full CRUD (list, detail, create, verify, update, delete)            |
| **Issue**  | ⚠️     | Types defined locally in `useDomains.ts` instead of `@dento/shared` |

#### `monitoring/` — MonitoringPage + ErrorListPage + HealthStatusPage + 5 components + 4 hooks

| Check      | Status | Notes                                                                                                               |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| Loading    | ✅     | HealthStatus: Skeleton loading. ErrorTimeline: Loader2 spinner. DataTable: isLoading                                |
| Error      | ⚠️     | Toast on resolve error failure, no global error state                                                               |
| Empty      | ✅     | ErrorTimeline: "No error data", DataTable empty message                                                             |
| RTL        | ❌     | `left-3`, `pl-9`, `mr-1.5`, `mr-1`, `text-right` — **6 violations**                                                 |
| Toast      | ✅     | Resolve/unresolve, clipboard all use toast                                                                          |
| Real hooks | ✅     | 4 separate hooks (error logs, health, monitoring stats, resolve)                                                    |
| Polling    | ✅     | Health: 30s, stats: 60s                                                                                             |
| **Issue**  | ⚠️     | `useHealthStatus` uses raw `fetch('/api/health')` not `apiClient` — intentional for unauthenticated health endpoint |

#### `platform-users/` — PlatformUsersPage.tsx + use-platform-users.ts

| Check      | Status   | Notes                                                                                              |
| ---------- | -------- | -------------------------------------------------------------------------------------------------- |
| Loading    | ✅       | `DataTable` `isLoading`                                                                            |
| Error      | ⚠️       | Toast on mutation failures                                                                         |
| Empty      | ✅       | `DataTable` `emptyMessage`                                                                         |
| RTL        | ⚠️ Mixed | ✅ Uses `inset-s-3` and `ps-10` for search. ❌ `mr-2` x5 in dropdown items                         |
| Toast      | ✅       | Invite, suspend, activate, delete all use toast                                                    |
| Real hooks | ✅       | Full CRUD + invite + permissions                                                                   |
| Permission | ✅       | `hasPlatformPerm()` gates create/update/delete buttons                                             |
| Types      | ✅       | Uses `@dento/shared` types (PlatformRole, PlatformPermissionOverride)                              |
| **Issue**  | 🟠       | Dynamic `import()` for apiClient + `window.location.reload()` — should use mutation + invalidation |

#### `support/` — SupportPage.tsx + SessionsTab.tsx + StartSessionDialog.tsx + SessionDetailSheet.tsx + useSupport.ts

| Check      | Status | Notes                                                                                   |
| ---------- | ------ | --------------------------------------------------------------------------------------- |
| Loading    | ✅     | Custom spinner: `<Clock className="mr-2 h-5 w-5 animate-spin" />`                       |
| Error      | ⚠️     | Toast on mutations only                                                                 |
| Empty      | ✅     | Custom: "No tickets found" card                                                         |
| RTL        | ❌     | `left-3`, `pl-9`, `mr-0.5`, `mr-2`, `mr-1` — **7 violations**                           |
| Toast      | ✅     | Start session, ticket operations                                                        |
| Real hooks | ✅     | Comprehensive hooks for tickets + sessions + impersonation                              |
| **Issue**  | ⚠️     | Custom ticket cards instead of `DataTable` for tickets tab — OK for UX but inconsistent |

#### `system-logs/` — SystemLogsPage.tsx + useSystemLogs.ts

| Check      | Status | Notes                               |
| ---------- | ------ | ----------------------------------- |
| Loading    | ✅     | `DataTable` `isLoading`             |
| Error      | ⚠️     | No explicit error state             |
| Empty      | ✅     | `DataTable` `emptyMessage`          |
| RTL        | ❌     | `left-3`, `pl-9` — **2 violations** |
| Toast      | N/A    | Read-only page                      |
| Real hooks | ✅     | List + stats (60s polling)          |
| Types      | ✅     | Uses `@dento/shared` types          |
| Tests      | ✅     | Full test suite                     |

#### `user-sessions/` — UserSessionsPage.tsx + SessionDetailSheet.tsx + useUserSessions.ts

| Check      | Status | Notes                                            |
| ---------- | ------ | ------------------------------------------------ |
| Loading    | ✅     | `DataTable` `isLoading`, detail: Loader2 spinner |
| Error      | ⚠️     | Toast on revoke failure only                     |
| Empty      | ✅     | `DataTable` `emptyMessage`                       |
| RTL        | ❌     | `mr-1` — **2 violations**                        |
| Toast      | ✅     | Revoke session uses toast directly               |
| Real hooks | ✅     | List, detail, stats (30s polling), revoke        |
| Types      | ✅     | Uses `@dento/shared` types                       |
| Tests      | ✅     | Full test suite with toast mocking               |

#### `webhooks/` — WebhooksPage.tsx (584 lines)

| Check       | Status  | Notes                                                              |
| ----------- | ------- | ------------------------------------------------------------------ |
| Loading     | ❌      | **MOCK DATA — no loading state**                                   |
| Error       | ❌      | No error handling                                                  |
| Empty       | ✅      | No endpoints empty state present                                   |
| RTL         | ✅      | Uses `start`, `ps`, `pe` logical properties                        |
| Toast       | ❌      | No toast (no mutations)                                            |
| **Verdict** | 🟡 Mock | 5 hardcoded endpoints + 7 delivery logs. Custom tabs, no DataTable |

#### `modules/` — ModulesPage.tsx (470 lines)

| Check     | Status | Notes                                                         |
| --------- | ------ | ------------------------------------------------------------- |
| Loading   | ✅     | Custom spinner                                                |
| Error     | ✅     | Error state with retry                                        |
| Empty     | ✅     | "No modules found"                                            |
| RTL       | ✅     | Uses `start`, `ps`, `pe`, `end`                               |
| Toast     | N/A    | Read-only                                                     |
| **Issue** | 🟠     | Uses raw `fetch()` with `API_BASE_URL` instead of `apiClient` |
| **Issue** | 🟠     | Uses `useState` + `useEffect` instead of React Query hooks    |
| **Issue** | ⚠️     | Custom StatCard component instead of `@dento/ui` `StatCard`   |

#### `pricing/` — PricingPage.tsx (628 lines)

| Check       | Status  | Notes                                                    |
| ----------- | ------- | -------------------------------------------------------- |
| Loading     | ❌      | **MOCK DATA — no loading state**                         |
| Error       | ❌      | No error handling                                        |
| Empty       | ⚠️      | Filters exist but no explicit empty state                |
| RTL         | ✅      | Uses `start`, `ps` logical properties                    |
| Toast       | ❌      | No toast (actions non-functional)                        |
| **Verdict** | 🟡 Mock | 8 modules, 4 coupons, 5 global discounts — all hardcoded |

---

### 2.3 RTL Compliance Matrix

**51 total violations** across the developer app. The `@dento/ui` package has **0 violations**.

| Violation Pattern                            | Count  | Fix                         |
| -------------------------------------------- | :----: | --------------------------- |
| `left-3` (search icon positioning)           |   8    | → `start-3`                 |
| `pl-9` (search input padding)                |   8    | → `ps-9`                    |
| `mr-{n}` (icon margin-right)                 |   27   | → `me-{n}`                  |
| `text-left` / `text-right` (table alignment) |   7    | → `text-start` / `text-end` |
| `ml-{n}` (margin-left)                       |   0    | —                           |
| `border-l` / `border-r`                      |   0    | —                           |
| `rounded-l` / `rounded-r`                    |   0    | —                           |
| **Sub-total**                                | **51** |                             |

**Files with most violations:**

| File                                            | Violations |
| ----------------------------------------------- | :--------: |
| `billing/components/InvoiceDetailSheet.tsx`     |     8      |
| `support/pages/SupportPage.tsx`                 |     5      |
| `backups/pages/BackupsPage.tsx`                 |     3      |
| `backups/components/BackupConfigPanel.tsx`      |     3      |
| `monitoring/pages/ErrorListPage.tsx`            |     3      |
| `domains/pages/DomainsPage.tsx`                 |     3      |
| `audit-logs/pages/AuditLogsPage.tsx`            |     2      |
| `audit-logs/components/AuditLogDetailSheet.tsx` |     3      |
| `platform-users/pages/PlatformUsersPage.tsx`    |     5      |
| `monitoring/components/ErrorDetailSheet.tsx`    |     3      |

---

### 2.4 Loading / Error / Empty State Matrix

| Feature        | Loading |     Error     |     Empty      |
| -------------- | :-----: | :-----------: | :------------: |
| dashboard      |   N/A   |      N/A      |  N/A (static)  |
| auth (login)   |   ✅    |      ✅       |      N/A       |
| auth (invite)  |   ✅    |      ✅       |      N/A       |
| tenants        | ❌ Mock |    ❌ Mock    | ⚠️ Filter only |
| api-catalog    |   ✅    |      ✅       |       ✅       |
| api-keys       | ❌ Mock |    ❌ Mock    |       ✅       |
| backups        |   ✅    | ⚠️ Toast only |       ✅       |
| billing        |   ✅    | ⚠️ Toast only |       ✅       |
| audit-logs     |   ✅    | ⚠️ Toast only |       ✅       |
| deployments    |   ✅    | ⚠️ Toast only |       ✅       |
| domains        |   ✅    | ⚠️ Toast only |       ✅       |
| monitoring     |   ✅    | ⚠️ Toast only |       ✅       |
| platform-users |   ✅    | ⚠️ Toast only |       ✅       |
| support        |   ✅    | ⚠️ Toast only |       ✅       |
| system-logs    |   ✅    | ⚠️ Toast only |       ✅       |
| user-sessions  |   ✅    | ⚠️ Toast only |       ✅       |
| webhooks       | ❌ Mock |    ❌ Mock    |       ✅       |
| modules        |   ✅    |      ✅       |       ✅       |
| pricing        | ❌ Mock |    ❌ Mock    |       ⚠️       |

**Summary:** 10/18 features have proper loading states. Only `api-catalog` and `modules` have explicit full-page error states with retry. All others rely on toast for mutation errors — **no query-level error boundaries**.

---

### 2.5 Toast Usage Matrix

| Feature        | Toast on Success | Toast on Error | Notes                                 |
| -------------- | :--------------: | :------------: | ------------------------------------- |
| auth           |        ✅        |       ✅       | Login, invite accept                  |
| backups        |        ✅        |       ✅       | Trigger, restore, delete, config save |
| billing        |        ✅        |       ✅       | Send reminder                         |
| audit-logs     |        ✅        |       —        | Copy to clipboard only                |
| deployments    |        ✅        |       ✅       | Rollback                              |
| domains        |        ✅        |       ✅       | Create, verify, delete, copy DNS      |
| monitoring     |        ✅        |       ✅       | Resolve/unresolve, copy stack trace   |
| platform-users |        ✅        |       ✅       | All CRUD + invite                     |
| support        |        ✅        |       ✅       | Start session                         |
| user-sessions  |        ✅        |       ✅       | Revoke session                        |
| tenants        |        ❌        |       ❌       | Mock — no mutations                   |
| api-keys       |        ❌        |       ❌       | Mock — no mutations                   |
| webhooks       |        ❌        |       ❌       | Mock — no mutations                   |
| pricing        |        ❌        |       ❌       | Mock — no mutations                   |

---

### 2.6 Mock Data vs Real Hooks Matrix

| Feature        |   Data Source   | Hook File               | Notes                                       |
| -------------- | :-------------: | ----------------------- | ------------------------------------------- |
| dashboard      |     Static      | —                       | Placeholder values                          |
| tenants        |   🟡 **MOCK**   | —                       | 7 hardcoded tenants + 2402-line detail page |
| api-catalog    | 🟢 Real (fetch) | —                       | Loads from OpenAPI JSON endpoint            |
| api-keys       |   🟡 **MOCK**   | —                       | 6 hardcoded keys                            |
| backups        |     🟢 Real     | `useBackups.ts`         | Full CRUD                                   |
| billing        |     🟢 Real     | `useBilling.ts`         | Stats + invoices + reminder                 |
| audit-logs     |     🟢 Real     | `useAuditLogs.ts`       | List + detail + stats                       |
| deployments    |     🟢 Real     | `useDeployments.ts`     | List + detail + stats + rollback            |
| domains        |     🟢 Real     | `useDomains.ts`         | Full CRUD + verify                          |
| monitoring     |     🟢 Real     | 4 hook files            | Error logs + health + stats + resolve       |
| platform-users |     🟢 Real     | `use-platform-users.ts` | Full CRUD + invite + permissions            |
| support        |     🟢 Real     | `useSupport.ts`         | Tickets + sessions + impersonate            |
| system-logs    |     🟢 Real     | `useSystemLogs.ts`      | List + stats                                |
| user-sessions  |     🟢 Real     | `useUserSessions.ts`    | List + detail + stats + revoke              |
| webhooks       |   🟡 **MOCK**   | —                       | 5 endpoints + 7 delivery logs               |
| modules        | 🟢 Real (fetch) | —                       | Uses raw fetch, no React Query              |
| pricing        |   🟡 **MOCK**   | —                       | 8 modules + 4 coupons + 5 discounts         |

**5 features remain on mock data:** tenants, api-keys, webhooks, pricing, dashboard.

---

### 2.7 @dento/ui Adoption Matrix

| Feature        | PageHeader | StatCard  |  DataTable   | Sheet | ConfirmDialog | Badge | Notes                             |
| -------------- | :--------: | :-------: | :----------: | :---: | :-----------: | :---: | --------------------------------- |
| backups        |     ✅     |    ✅     |      ✅      |   —   |      ✅       |  ✅   | Full adoption                     |
| billing        |     ✅     |    ✅     |      ✅      |  ✅   |       —       |  ✅   | Full adoption                     |
| audit-logs     |     ✅     |    ✅     |      ✅      |  ✅   |       —       |  ✅   | Full adoption                     |
| deployments    |     ✅     |    ✅     |      ✅      |  ✅   |      ✅       |  ✅   | Full adoption                     |
| domains        |     ✅     |     —     |      ✅      |  ✅   |      ✅       |  ✅   | StatCards computed inline         |
| monitoring     |     ✅     |    ✅     |      ✅      |  ✅   |       —       |  ✅   | Full adoption                     |
| platform-users |     ✅     |    ✅     |      ✅      |   —   |      ✅       |  ✅   | Full adoption                     |
| support        |     ✅     |    ✅     |      ✅      |  ✅   |      ✅       |  ✅   | Full adoption (sessions tab)      |
| system-logs    |     ✅     |    ✅     |      ✅      |   —   |       —       |  ✅   | Full adoption                     |
| user-sessions  |     ✅     |    ✅     |      ✅      |  ✅   |      ✅       |  ✅   | Full adoption                     |
| tenants        | ❌ Custom  | ❌ Custom |  ❌ Custom   |   —   |       —       |  ✅   | Mock page, custom everything      |
| api-keys       | ❌ Custom  | ❌ Custom | ❌ `<table>` |   —   |       —       |   —   | Mock page, custom table           |
| webhooks       | ❌ Custom  | ❌ Custom |   ❌ Cards   |   —   |       —       |   —   | Mock page, custom layout          |
| modules        | ❌ Custom  | ❌ Custom |   ❌ Cards   |   —   |       —       |  ✅   | Uses raw fetch, custom components |
| pricing        | ❌ Custom  | ❌ Custom |   ❌ Cards   |   —   |       —       |   —   | Mock page, custom everything      |
| api-catalog    | ❌ Custom  | ❌ Custom |  ❌ Custom   |   —   |       —       |   —   | Specialized layout (acceptable)   |

---

## 3. Part 2 — Shared Package

### 3.1 Barrel Exports

| File                     | Exports                                                                                     | Status |
| ------------------------ | ------------------------------------------------------------------------------------------- | ------ |
| `src/index.ts`           | Re-exports `schemas`, `types`, `constants`, `utils`                                         | ✅     |
| `src/schemas/index.ts`   | Re-exports all 40 schema files                                                              | ✅     |
| `src/types/index.ts`     | Re-exports all 25 type files + inline types (AuthTokens, AuthUser, Role, ApiResponse, etc.) | ✅     |
| `src/constants/index.ts` | Single file with all constants                                                              | ✅     |
| `src/utils/index.ts`     | Single file with all utilities                                                              | ✅     |

---

### 3.2 Schema `.strict()` Audit

**198 `.strict()` calls found across 32 schema files. 8 schema files are MISSING `.strict()` entirely:**

| Missing File             | `z.object()` Count | Severity    |
| ------------------------ | :----------------: | ----------- |
| `workflow.schema.ts`     |         7+         | 🔴 CRITICAL |
| `webhook.schema.ts`      |         5          | 🔴 CRITICAL |
| `totp.schema.ts`         |         5          | 🔴 CRITICAL |
| `settings.schema.ts`     |         8+         | 🔴 CRITICAL |
| `notification.schema.ts` |         7+         | 🔴 CRITICAL |
| `doctor.schema.ts`       |         2          | 🔴 CRITICAL |
| `custom-field.schema.ts` |         6+         | 🔴 CRITICAL |
| `audit.schema.ts`        |         2          | 🔴 CRITICAL |

**Why this matters:** Without `.strict()`, extra/unexpected fields pass validation silently — violating HIPAA data minimization and enabling potential injection of unintended fields.

**Schemas with full `.strict()` coverage (32 files):**
`appointment`, `auth`, `booking`, `branch`, `cbct`, `cbct-scan-region`, `chat`, `commission`, `consent`, `dental-chart`, `dental-lab`, `installment`, `insurance`, `inventory`, `invoice`, `lab-order`, `lab-order-type`, `leave`, `medication`, `patient`, `payment`, `platform-user`, `prescription`, `procedure-note`, `report`, `schedule`, `service`, `tenant`, `treatment-plan`, `user`, `xray`, `xray-type`

---

### 3.3 Types Completeness

25 type files covering all major domains:

| Category                 | Files                                                                                            | Status |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ------ |
| API/Platform             | `apikey`, `platform`, `ratelimit`                                                                | ✅     |
| Infrastructure           | `deployment`, `health-check`, `system-log`, `error-log`                                          | ✅     |
| Financial                | `billing`, `payment`, `pricing`                                                                  | ✅     |
| Security                 | `audit-log`, `user-session`, `support-session`, `support-ticket`                                 | ✅     |
| Feature                  | `backup`, `domain`, `migration`, `webhook`, `versioning`                                         | ✅     |
| UX                       | `branding`, `notification`, `socket`, `recurring`, `report`, `db-explorer`                       | ✅     |
| Inline types in index.ts | `AuthTokens`, `AuthUser`, `Role`, `TenantStatus`, `ApiResponse`, `ApiError`, `PaginatedResponse` | ✅     |

**No missing types detected for currently implemented features.**

---

### 3.4 Constants Audit

`constants/index.ts` (245 lines) — comprehensive constant definitions:

| Constant Group                        |         Count          |        `.as const satisfies`        | Status |
| ------------------------------------- | :--------------------: | :---------------------------------: | ------ |
| ROLES                                 |        8 roles         | ✅ `satisfies Record<string, Role>` | ✅     |
| APPOINTMENT_STATUSES                  |           8            |             `as const`              | ✅     |
| INVOICE_STATUSES                      |           7            |             `as const`              | ✅     |
| PAYMENT_METHODS                       | 8 (incl. Fawry, Meeza) |             `as const`              | ✅     |
| PAYMENT_STATUSES                      |           4            |             `as const`              | ✅     |
| INSURANCE_CLAIM_STATUSES              |           6            |             `as const`              | ✅     |
| INSTALLMENT\_\*                       |        3 groups        |             `as const`              | ✅     |
| COMMISSION_STATUSES                   |           4            |             `as const`              | ✅     |
| TREATMENT_PLAN_STATUSES               |           6            |             `as const`              | ✅     |
| TENANT_STATUSES                       |           4            |             `as const`              | ✅     |
| MODULE_SLUGS                          |           27           |             `as const`              | ✅     |
| WEBHOOK_EVENTS                        |           26           |             `as const`              | ✅     |
| TOOTH_CONDITIONS                      |           14           |             `as const`              | ✅     |
| VALID_STATUS_TRANSITIONS              |   Keyed transitions    |             `as const`              | ✅     |
| WAITLIST/SCHEDULE/LEAVE/ATTENDANCE/\* |   8+ groups (Week 9)   |             `as const`              | ✅     |
| BOOKING_CONFIRMATION_ACTIONS          |           3            |             `as const`              | ✅     |

**All constants use `as const` — type-safe and non-mutable.** ✅

---

### 3.5 Utils Audit

`utils/index.ts` (68 lines) — clean utility functions:

| Utility                                    | Params                      | Status | Notes                            |
| ------------------------------------------ | --------------------------- | ------ | -------------------------------- |
| `formatCurrency(amount, locale, currency)` | Defaults: `en-EG`, `EGP`    | ✅     | Uses `Intl.NumberFormat`         |
| `formatDate(date, format)`                 | Default: `DD/MM/YYYY`       | ✅     | Uses `dayjs`                     |
| `formatDateTime(date, format)`             | Default: `DD/MM/YYYY HH:mm` | ✅     | Uses `dayjs`                     |
| `diffDays(start, end)`                     | —                           | ✅     |                                  |
| `truncate(str, length)`                    | Default: 50                 | ✅     |                                  |
| `capitalize(str)`                          | —                           | ✅     |                                  |
| `isValidEgyptianPhone(phone)`              | —                           | ✅     | Regex: `^(\+?20)?01[0125]\d{8}$` |
| `buildPaginationParams(page, limit)`       | Defaults: 1, 20             | ✅     | Returns `{ skip, limit }`        |
| `buildPaginationMeta(total, page, limit)`  | —                           | ✅     | Returns full pagination object   |

**Dependency:** `dayjs` — lightweight date library. ✅

---

## 4. Part 3 — UI Package

### 4.1 Barrel Exports

`src/index.ts` (164 lines) — exports everything:

| Category   |     Components      | Status |
| ---------- | :-----------------: | ------ |
| Primitives | 27 component groups | ✅     |
| Composites | 8 component groups  | ✅     |
| Utils      |        `cn`         | ✅     |

**All primitives and composites are properly re-exported.** ✅

---

### 4.2 Primitives Audit

27 primitive components, all following Shadcn/Radix patterns:

| Component    | RTL-Safe | Accessible | Notes                                                    |
| ------------ | :------: | :--------: | -------------------------------------------------------- |
| Button       |    ✅    |     ✅     | CVA variants, Slot support                               |
| Input        |    ✅    |     ✅     | `ring-offset-background`, disabled states                |
| Label        |    ✅    |     ✅     | `@radix-ui/react-label`                                  |
| Card         |    ✅    |     ✅     | Simple styled div                                        |
| Badge        |    ✅    |     ✅     | CVA variants                                             |
| Separator    |    ✅    |     ✅     | `@radix-ui/react-separator`                              |
| Select       |    ✅    |     ✅     | `@radix-ui/react-select`                                 |
| Modal/Dialog |    ✅    |     ✅     | **Uses `start-[50%]`, `end-4`, `text-start`** — RTL-safe |
| Checkbox     |    ✅    |     ✅     | `@radix-ui/react-checkbox`                               |
| Switch       |    ✅    |     ✅     | `@radix-ui/react-switch`                                 |
| Tabs         |    ✅    |     ✅     | `@radix-ui/react-tabs`                                   |
| DropdownMenu |    ✅    |     ✅     | `@radix-ui/react-dropdown-menu`                          |
| Tooltip      |    ✅    |     ✅     | `@radix-ui/react-tooltip`                                |
| Avatar       |    ✅    |     ✅     | `@radix-ui/react-avatar`                                 |
| Popover      |    ✅    |     ✅     | `@radix-ui/react-popover`                                |
| ScrollArea   |    ✅    |     ✅     | `@radix-ui/react-scroll-area`                            |
| Accordion    |    ✅    |     ✅     | `@radix-ui/react-accordion`                              |
| AlertDialog  |    ✅    |     ✅     | `@radix-ui/react-alert-dialog`                           |
| Textarea     |    ✅    |     ✅     | Styled `<textarea>`                                      |
| Table        |    ✅    |     ✅     | Semantic HTML with styled wrappers                       |
| Skeleton     |    ✅    |     ✅     | Pulse animation                                          |
| Progress     |    ✅    |     ✅     | `@radix-ui/react-progress`                               |
| Command      |    ✅    |     ✅     | `cmdk` library                                           |
| InputOTP     |    ✅    |     ✅     | `input-otp` library                                      |
| Sheet        |    ✅    |     ✅     | Built on `vaul` (drawer). Uses `text-start`              |
| Toaster      |    ✅    |     ✅     | `sonner` — semantic token classes                        |
| Calendar     |    ✅    |     ✅     | `react-day-picker`                                       |

**All primitives pass RTL and accessibility checks.** ✅

---

### 4.3 Composites Audit

| Component      | Lines |         RTL         |              A11y              | Notes                                                     |
| -------------- | :---: | :-----------------: | :----------------------------: | --------------------------------------------------------- |
| DataTable      | ~200  |     ✅ (`ms-1`)     | ✅ (aria-labels on pagination) | Loading spinner + empty message built in                  |
| PageHeader     |  ~35  |         ✅          |               ✅               | Simple flex layout                                        |
| StatCard       |  ~65  |         ✅          |               ✅               | Semantic token based                                      |
| EmptyState     |  ~40  |         ✅          |               ✅               | Centered with optional action                             |
| FormField      |  ~40  |    ✅ (`ms-0.5`)    |               ✅               | Error + description variants                              |
| ConfirmDialog  |  ~65  |         ✅          |               ✅               | Wraps AlertDialog                                         |
| SearchCombobox |  ~95  | ✅ (`ms-2`, `me-2`) |       ✅ (combobox role)       | Command-based search                                      |
| ClinicHeader   |  ~90  |         ⚠️          |               ✅               | `dir="rtl"` on Arabic text, but uses `text-end` correctly |

---

### 4.4 Design Tokens & globals.css

`globals.css` (299 lines) — comprehensive design system:

| Category                                          | Status | Notes                              |
| ------------------------------------------------- | ------ | ---------------------------------- |
| Font: Outfit                                      | ✅     | Google Fonts import, `--font-sans` |
| Gray scale (11 steps)                             | ✅     | TailAdmin foundation               |
| Success/Error/Warning/Orange/Blue-light/Purple    | ✅     | Full scales                        |
| Semantic tokens (primary, secondary, muted, etc.) | ✅     | Via `--color-brand-*` bridge       |
| Dark mode overrides (`.dark` class)               | ✅     | Complete semantic layer            |
| Shadows (6 levels)                                | ✅     | TailAdmin scale                    |
| Z-index scale                                     | ✅     | Named levels                       |
| Custom breakpoints (2xsm, xsm, 3xl)               | ✅     |                                    |
| Typography scale (title + theme)                  | ✅     |                                    |
| Menu item utilities                               | ✅     | Active/inactive/icon states        |
| Custom scrollbar                                  | ✅     | WebKit + dark mode                 |
| Dropdown animation                                | ✅     |                                    |
| **RTL support rule**                              | ✅     | `[dir='rtl'] { text-align: end; }` |

---

### 4.5 RTL Compliance in UI

| Area        | Violations | Notes                                |
| ----------- | :--------: | ------------------------------------ |
| Primitives  |   **0**    | All use logical properties           |
| Composites  |   **0**    | All use `ms-`, `me-`, `start`, `end` |
| globals.css |   **0**    | Has explicit `[dir='rtl']` rule      |
| **Total**   |   **0**    | ✅ Perfect RTL compliance            |

---

## 5. Critical Issues Summary

### 🔴 CRITICAL (Fix Immediately)

| #   | Issue                                                  | Location                                                                                                      | Impact                                                           |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| C1  | AppSidebar duplicates nav without permission filtering | `components/AppSidebar.tsx`                                                                                   | Unprivileged users may see restricted nav items                  |
| C2  | 8 Zod schemas missing `.strict()`                      | `packages/shared/src/schemas/` (workflow, webhook, totp, settings, notification, doctor, custom-field, audit) | Extra fields pass validation — HIPAA data minimization violation |
| C3  | 51 RTL direction violations in developer app           | See §2.3 matrix                                                                                               | Arabic/RTL users see broken layouts                              |

### 🟠 HIGH (Fix Before Release)

| #   | Issue                                                              | Location                                              | Impact                                                         |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------- |
| H1  | `PlatformUsersPage` uses dynamic import + window.location.reload() | `features/platform-users/pages/PlatformUsersPage.tsx` | Breaks SPA UX, causes full page reload                         |
| H2  | `ModulesPage` uses raw `fetch()` instead of `apiClient`            | `features/modules/pages/ModulesPage.tsx`              | Bypasses auth refresh, error handling, interceptors            |
| H3  | `ModulesPage` uses `useState+useEffect` instead of React Query     | Same file                                             | Inconsistent with codebase pattern, no caching/dedup           |
| H4  | Toaster position hardcoded `top-right`                             | `App.tsx`                                             | Broken in RTL — should be logical position                     |
| H5  | No query-level error boundaries                                    | All features                                          | Network failures show no UI feedback (toast only on mutations) |

### 🟡 MEDIUM (Fix in Next Sprint)

| #   | Issue                                                                                                                                            | Location                                        | Impact                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------- |
| M1  | 5 features on mock data with no hooks                                                                                                            | tenants, api-keys, webhooks, pricing, dashboard | Non-functional features in production                           |
| M2  | Mock pages skip @dento/ui components                                                                                                             | Same 5 features                                 | Inconsistent UX patterns                                        |
| M3  | `domains/useDomains.ts` defines types locally                                                                                                    | `useDomains.ts`                                 | Types should be in `@dento/shared`                              |
| M4  | `monitoring/useErrorLogs.ts` defines types locally                                                                                               | `useErrorLogs.ts`                               | Same as M3                                                      |
| M5  | `monitoring/useHealthStatus.ts` defines types locally                                                                                            | `useHealthStatus.ts`                            | Same as M3 (though `health-check.types.ts` exists in shared)    |
| M6  | `api-catalog` uses raw fetch + useState/useEffect                                                                                                | `ApiCatalogPage.tsx`                            | Inconsistent pattern (acceptable for OpenAPI spec)              |
| M7  | No tests for: backups, domains, support, monitoring, platform-users, modules, pricing, api-catalog, api-keys, webhooks, tenants, dashboard, auth | Multiple                                        | Test coverage gap                                               |
| M8  | `support/SupportPage.tsx` uses custom ticket cards                                                                                               | `SupportPage.tsx`                               | Inconsistent with DataTable pattern (may be intentional for UX) |

### 🔵 LOW (Track for Later)

| #   | Issue                                                                                    | Location                   | Impact                                                            |
| --- | ---------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| L1  | `api-catalog` fetches from `/api/openapi.json` but code also references `/api/docs-json` | `ApiCatalogPage.tsx`       | Potential stale URL reference                                     |
| L2  | `useHealthStatus` uses raw `fetch` instead of `apiClient`                                | `useHealthStatus.ts`       | Intentional for unauthenticated endpoint, but inconsistent        |
| L3  | Some StatCards computed from current page data (domains)                                 | `DomainsPage.tsx`          | Stats change with pagination — should use separate stats endpoint |
| L4  | `TenantDetailPage.tsx` is 2402 lines                                                     | `TenantDetailPage.tsx`     | Should be split into sub-components                               |
| L5  | `AppHeader.tsx` notifications use mock data                                              | `components/AppHeader.tsx` | Hardcoded notification items                                      |
| L6  | No `EmptyState` composite used in developer app                                          | All features               | DataTable has inline empty message, but formal EmptyState unused  |
| L7  | `useSupport.ts` hits `/api/admin/` endpoints                                             | `useSupport.ts`            | Should verify these are correct for developer portal context      |

---

## 6. Remediation Checklist

### Phase 1 — Critical Fixes (This Sprint)

- [ ] **C1:** Refactor `AppSidebar.tsx` to import `DEV_SIDEBAR_CONFIG` and filter by `hasPlatformPerm()`, exactly like `Sidebar.tsx` does
- [ ] **C2:** Add `.strict()` to all exported schemas in these 8 files:
  - [ ] `workflow.schema.ts`
  - [ ] `webhook.schema.ts`
  - [ ] `totp.schema.ts`
  - [ ] `settings.schema.ts`
  - [ ] `notification.schema.ts`
  - [ ] `doctor.schema.ts`
  - [ ] `custom-field.schema.ts`
  - [ ] `audit.schema.ts`
- [ ] **C3:** Fix all 51 RTL violations:
  - [ ] Search all `left-3` → `start-3` (8 files)
  - [ ] Search all `pl-9` → `ps-9` (8 files)
  - [ ] Search all `mr-{n}` → `me-{n}` (27 instances)
  - [ ] Search all `text-left` → `text-start` (1 instance)
  - [ ] Search all `text-right` → `text-end` (6 instances)

### Phase 2 — High Priority Fixes

- [ ] **H1:** Replace dynamic import + `window.location.reload()` in PlatformUsersPage with proper mutation hook
- [ ] **H2+H3:** Refactor `ModulesPage` to use `apiClient` + React Query hooks
- [ ] **H4:** Change Toaster position from `"top-right"` to a logical position or use `dir`-aware positioning
- [ ] **H5:** Add `QueryErrorResetBoundary` or similar for query-level error UI

### Phase 3 — Medium Priority

- [ ] **M1+M2:** Replace mock data with real API hooks for tenants, api-keys, webhooks, pricing
- [ ] **M3-M5:** Move locally defined types to `@dento/shared`
- [ ] **M7:** Add test coverage for untested features

---

_End of audit report._
