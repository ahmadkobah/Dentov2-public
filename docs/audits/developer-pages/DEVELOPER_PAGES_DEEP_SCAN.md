# Developer Portal — Deep Scan Report

> **Date:** 2025-07-02
> **Scope:** All 27 page-level components in `apps/developer/`
> **References:** BUILD_RULES, DENTO_V2_MASTER_PLAN, IMPLEMENTATION_ROADMAP, SECURITY_AND_ENCRYPTION, TECH_REQUIREMENTS, V2_DATABASE, V2_DECISION_LOG, V2_STRUCTURE, PLATFORM_RBAC
> **TypeScript Build:** ✅ 0 errors (`tsc --noEmit`)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Full Page Matrix](#2-full-page-matrix)
3. [Per-Page Findings](#3-per-page-findings)
   - [3.1 DashboardPage](#31-dashboardpage)
   - [3.2 TenantsPage](#32-tenantspage)
   - [3.3 TenantDetailPage](#33-tenantdetailpage)
   - [3.4 ApiKeysPage](#34-apikeyspage)
   - [3.5 ModulesPage](#35-modulespage)
   - [3.6 PricingPage](#36-pricingpage)
   - [3.7 WebhooksPage](#37-webhookspage)
   - [3.8 ApiCatalogPage](#38-apicatalogpage)
   - [3.9 DevLoginPage](#39-devloginpage)
   - [3.10 AcceptInvitePage](#310-acceptinvitepage)
   - [3.11 PlatformUsersPage](#311-platformuserspage)
   - [3.12 BillingPage](#312-billingpage)
   - [3.13 SettingsPage](#313-settingspage)
   - [3.14 SupportPage](#314-supportpage)
   - [3.15 FeatureFlagsPage](#315-featureflagspage)
   - [3.16 CustomFieldsPage](#316-customfieldspage)
   - [3.17 AuditLogsPage](#317-auditlogspage)
   - [3.18 UserSessionsPage](#318-usersessionspage)
   - [3.19 BackupsPage](#319-backupspage)
   - [3.20 DeploymentsPage](#320-deploymentspage)
   - [3.21 DomainsPage](#321-domainspage)
   - [3.22 StoragePage](#322-storagepage)
   - [3.23 SystemLogsPage](#323-systemlogspage)
   - [3.24 MonitoringOverviewPage](#324-monitoringoverviewpage)
   - [3.25 HealthStatusPage](#325-healthstatuspage)
   - [3.26 ErrorListPage](#326-errorlistpage)
   - [3.27 ForbiddenPage](#327-forbiddenpage)
4. [Category Breakdowns](#4-category-breakdowns)
   - [4.1 Mock Data Pages](#41-mock-data-pages)
   - [4.2 RTL Violations](#42-rtl-violations)
   - [4.3 Missing Loading/Error/Empty States](#43-missing-loadingerrorempty-states)
   - [4.4 Toast Feedback Gaps](#44-toast-feedback-gaps)
   - [4.5 Accessibility Violations](#45-accessibility-violations)
   - [4.6 React Query Compliance](#46-react-query-compliance)
   - [4.7 Form Pattern Compliance](#47-form-pattern-compliance)
5. [Sidebar & Navigation Audit](#5-sidebar--navigation-audit)
6. [Priority Fix Order](#6-priority-fix-order)

---

## 1. Executive Summary

| Metric                                         | Count                                  |
| :--------------------------------------------- | :------------------------------------- |
| Total pages scanned                            | **27**                                 |
| Pages fully compliant                          | **2** (SystemLogsPage, ForbiddenPage)  |
| Pages with mock/hardcoded data                 | **7**                                  |
| Pages with inline `fetch()` (no React Query)   | **2**                                  |
| Pages using `apiClient` directly (no RQ hooks) | **2**                                  |
| Missing error states                           | **9**                                  |
| Missing loading states                         | **7**                                  |
| Missing empty states                           | **11**                                 |
| RTL violations (page-level)                    | **17** across 4 pages                  |
| RTL violations (components included)           | **24** across 7 files                  |
| Accessibility issues                           | **~25** across 16 pages                |
| Missing toast on mutations                     | **8** pages                            |
| Forms without RHF + Zod                        | **4**                                  |
| File exceeding size limit                      | **1** (TenantDetailPage — 2,402 lines) |

### Severity Distribution

| Severity    | Count | Label                                              |
| :---------- | :---- | :------------------------------------------------- |
| 🔴 Critical | 7     | Mock-only pages, 2400-line file, no error handling |
| 🟠 High     | 15    | Missing states, inline fetch, no toast feedback    |
| 🟡 Medium   | 24    | RTL violations, accessibility gaps                 |
| 🔵 Low      | 6     | Minor: empty guards, stats computed client-side    |

---

## 2. Full Page Matrix

| #   | Page               | Lines    | Data Source     | Loading | Error | Empty | Toast | RTL   | a11y | RQ Hook | RHF+Zod   | Issues |
| :-- | :----------------- | :------- | :-------------- | :------ | :---- | :---- | :---- | :---- | :--- | :------ | :-------- | :----- |
| 1   | DashboardPage      | 49       | 🔴 Mock         | ❌      | ❌    | ❌    | N/A   | 0     | ⚠️   | ❌      | N/A       | 4      |
| 2   | TenantsPage        | 282      | 🔴 Mock         | ❌      | ❌    | ❌    | ❌    | 0     | ✅   | ❌      | N/A       | 7      |
| 3   | TenantDetailPage   | **2402** | 🔴 Mock (×9)    | ❌      | ❌    | ❌    | ❌    | 0     | ⚠️   | ❌      | ❌        | **11** |
| 4   | ApiKeysPage        | 377      | 🔴 Mock         | ❌      | ❌    | ⚠️    | ❌    | 0     | ✅   | ❌      | N/A       | 8      |
| 5   | ModulesPage        | 360      | ⚠️ Inline fetch | ✅      | ❌    | ✅    | N/A   | 0     | ⚠️   | ❌      | N/A       | 6      |
| 6   | PricingPage        | 628      | 🔴 Mock (×3)    | ❌      | ❌    | ❌    | ❌    | 0     | ✅   | ❌      | N/A       | 8      |
| 7   | WebhooksPage       | 584      | 🔴 Mock (×2)    | ❌      | ❌    | ⚠️    | ❌    | 0     | ✅   | ❌      | N/A       | 9      |
| 8   | ApiCatalogPage     | 517      | ⚠️ Inline fetch | ✅      | ✅    | ✅    | N/A   | 0     | ⚠️   | ❌      | N/A       | 4      |
| 9   | DevLoginPage       | 281      | ✅ apiClient    | ✅      | ✅    | N/A   | N/A   | 0     | ⚠️   | N/A     | ❌        | 6      |
| 10  | AcceptInvitePage   | 237      | ⚠️ apiClient    | ✅      | ✅    | N/A   | ✅    | 0     | ⚠️   | ❌      | ❌        | 5      |
| 11  | PlatformUsersPage  | 685      | ⚠️ Mixed        | ✅      | ❌    | ✅    | ✅    | **5** | ⚠️   | ⚠️      | ❌        | 7      |
| 12  | BillingPage        | 291      | ✅ Hooks        | ⚠️      | ✅    | ⚠️    | ❌    | 0     | ⚠️   | ✅      | N/A       | 5      |
| 13  | SettingsPage       | 82       | ✅ Hooks        | ✅      | ✅    | ⚠️    | N/A   | 0     | ✅   | ✅      | N/A       | 1      |
| 14  | SupportPage        | 312      | ✅ Hooks        | ✅      | ❌    | ✅    | N/A   | **6** | ⚠️   | ✅      | N/A       | 4      |
| 15  | FeatureFlagsPage   | 253      | ✅ Hooks        | ✅      | ✅    | ✅    | ⚠️    | 0     | ⚠️   | ✅      | Delegated | 2      |
| 16  | CustomFieldsPage   | 307      | ✅ Hooks        | ✅      | ✅    | ✅    | ✅    | 0     | ⚠️   | ✅      | Delegated | 1      |
| 17  | AuditLogsPage      | 204      | ✅ Hooks        | ✅      | ✅    | ✅    | N/A   | 0     | ⚠️   | ✅      | N/A       | 1      |
| 18  | UserSessionsPage   | 209      | ✅ Hooks        | ✅      | ✅    | ✅    | ❌    | 0     | ⚠️   | ✅      | N/A       | 3      |
| 19  | BackupsPage        | 295      | ✅ Hooks        | ✅      | ❌    | ✅    | ✅    | **3** | ⚠️   | ✅      | N/A       | 5      |
| 20  | DeploymentsPage    | 255      | ✅ Hooks        | ✅      | ✅    | ✅    | ❌    | 0     | ✅   | ✅      | N/A       | 1      |
| 21  | DomainsPage        | 177      | ✅ Hooks        | ✅      | ❌    | ✅    | N/A   | **3** | ⚠️   | ✅      | N/A       | 6      |
| 22  | StoragePage        | 82       | ✅ Hooks        | ✅      | ✅    | ❌    | N/A   | 0     | ✅   | ✅      | N/A       | 1      |
| 23  | SystemLogsPage     | 186      | ✅ Hooks        | ✅      | ✅    | ✅    | N/A   | 0     | ✅   | ✅      | N/A       | **0**  |
| 24  | MonitoringOverview | 88       | ✅ Hooks        | ⚠️      | ✅    | ❌    | N/A   | 0     | ✅   | ✅      | N/A       | 2      |
| 25  | HealthStatusPage   | 110      | ✅ Hooks        | ✅      | ✅    | ❌    | N/A   | 0     | ⚠️   | ✅      | N/A       | 3      |
| 26  | ErrorListPage      | 120      | ✅ Hooks        | ✅      | ✅    | ✅    | ❌    | 0     | ⚠️   | ✅      | N/A       | 2      |
| 27  | ForbiddenPage      | 27       | Static          | N/A     | N/A   | N/A   | N/A   | 0     | ✅   | N/A     | N/A       | **0**  |

**Legend:** ✅ = Compliant | ⚠️ = Partial | ❌ = Violation | N/A = Not applicable

---

## 3. Per-Page Findings

### 3.1 DashboardPage

**File:** `features/dashboard/pages/DashboardPage.tsx` (49 lines)
**Data Source:** 🔴 Static mock — hardcoded `stats` array with `value: '—'` placeholders

| Check         | Status                     |
| :------------ | :------------------------- |
| Loading State | ❌ Missing                 |
| Error State   | ❌ Missing                 |
| Empty State   | ❌ Missing                 |
| RTL           | ✅ 0 violations            |
| React Query   | ❌ No data fetching at all |

**Issues:**

1. 🔴 **100% mock data** — `stats` array with `value: '—'` for all 4 cards. Header says "will be implemented in Phase 5."
2. 🟠 **§15 violation** — no loading/error/empty states
3. 🟠 **§8.3 violation** — needs `useDashboardStats()` hook → `GET /api/platform/dashboard/stats`
4. 🔵 Stat icons have no `aria-hidden` (decorative icons)

---

### 3.2 TenantsPage

**File:** `features/tenants/pages/TenantsPage.tsx` (282 lines)
**Data Source:** 🔴 Mock — `mockTenants` hardcoded array (7 tenants)

| Check         | Status                                                |
| :------------ | :---------------------------------------------------- |
| Loading State | ❌ Missing                                            |
| Error State   | ❌ Missing                                            |
| Empty State   | ❌ Missing — no empty state for zero filtered results |
| Toast         | ❌ No feedback on delete                              |
| RTL           | ✅ 0 violations                                       |
| React Query   | ❌ Local constant                                     |

**Issues:**

1. 🔴 **`mockTenants` array** (7 entries) — stats computed from mock data. Needs `GET /api/platform/tenants`
2. 🟠 **§15 violation** — no loading skeleton, error state, or empty state
3. 🟠 **§8.3 violation** — needs `useTenantList(filters)` React Query hook
4. 🟠 Pagination is non-functional (always page 1, buttons disabled)
5. 🟡 Delete/Configure buttons are non-functional (no handler, no confirmation, no toast)
6. 🟡 `showActions` dropdown has no click-outside-close or Escape handling

---

### 3.3 TenantDetailPage

**File:** `features/tenants/pages/TenantDetailPage.tsx` (**2,402 lines**)
**Data Source:** 🔴 100% Mock — **9 mock objects**

| Check         | Status                               |
| :------------ | :----------------------------------- |
| Loading State | ❌ Missing                           |
| Error State   | ❌ Missing                           |
| Empty State   | ❌ Missing                           |
| Toast         | ❌ No feedback on any mutation       |
| RTL           | ✅ 0 violations                      |
| React Query   | ❌ No hooks at all                   |
| Forms         | ❌ Raw `defaultValue` — no RHF + Zod |

**Issues:**

1. 🔴 **2,402 lines — MUST be split** into ~10 sub-files (BUILD_RULES file-size limits, V2_STRUCTURE §14)
2. 🔴 **9 mock data objects:** `mockTenant`, `mockUsers`, `allModules`, `mockWorkflows`, `mockSupportSessions`, `mockCollections`, `mockDocuments`, inline `mockTickets`, inline billing invoices
3. 🔴 **`_tenantId` from `useParams()` captured but never used** — always shows mockTenant
4. 🟠 **§15 violation** — no loading/error/empty states at page level
5. 🟠 **§8.3 violation** — needs `useTenantDetail(id)`, `useTenantUsers(id)`, etc.
6. 🟠 **§8.4 violation** — SettingsTab, BrandingTab, ChannelsTab forms use `<input defaultValue>` without RHF + Zod
7. 🟠 Module toggles are local state only — no API call, no optimistic update
8. 🟡 DatabaseTab "Quick Query" Run button has no handler
9. 🟡 BillingTab invoices are inline hardcoded arrays
10. 🟡 SupportTab sub-tabs contain additional inline mock data
11. 🟡 Back button (`ArrowLeft`) missing `aria-label`

**Required API endpoints:**

- `GET /api/platform/tenants/:id` → tenant detail
- `GET /api/platform/tenants/:id/users` → tenant users
- `GET /api/platform/modules` → modules list
- `GET /api/platform/tenants/:id/workflows` → workflows
- `GET /api/platform/tenants/:id/support-sessions` → support sessions
- `GET /api/platform/tenants/:id/db/collections` → DB explorer
- `GET /api/platform/tenants/:id/tickets` → tickets
- `GET /api/platform/tenants/:id/invoices` → billing

---

### 3.4 ApiKeysPage

**File:** `features/api-keys/pages/ApiKeysPage.tsx` (377 lines)
**Data Source:** 🔴 Mock — `mockApiKeys` (6 keys) + inline `stats`

| Check         | Status                                 |
| :------------ | :------------------------------------- |
| Loading State | ❌ Missing                             |
| Error State   | ❌ Missing                             |
| Empty State   | ⚠️ Partial — only for filtered-to-zero |
| Toast         | ❌ No feedback on Revoke/Rotate/Copy   |
| RTL           | ✅ 0 violations                        |
| React Query   | ❌ Local constant                      |

**Issues:**

1. 🔴 **`mockApiKeys` array** (6 keys) + `stats` object hardcoded. Needs `GET /api/platform/api-keys`
2. 🟠 **§15 violation** — no loading skeleton, no error state with retry
3. 🟠 **§8.3 violation** — needs `useApiKeyList()` hook
4. 🟡 "Generate Key" button has no handler/modal
5. 🟡 Revoke/Rotate buttons have no confirmation dialog
6. 🟡 Copy button has no handler (no `navigator.clipboard`)
7. 🟡 Key reveal shows fake data — not real masked key
8. 🔵 Stats should come from `GET /api/platform/api-keys/stats`

---

### 3.5 ModulesPage

**File:** `features/modules/pages/ModulesPage.tsx` (360 lines)
**Data Source:** ⚠️ Real API — `fetch()` to `/api/platform/modules`

| Check         | Status                                         |
| :------------ | :--------------------------------------------- |
| Loading State | ✅ Spinner present                             |
| Error State   | ❌ Missing — `catch` only does `console.error` |
| Empty State   | ✅ "No modules found"                          |
| RTL           | ✅ 0 violations                                |
| React Query   | ❌ Raw `fetch()` + `useState` + `useEffect`    |

**Issues:**

1. 🟠 **§8.3 violation** — uses raw `fetch()` + `useEffect` instead of React Query with key factory. Needs `useModuleList(filters)` extracted hook
2. 🟠 **No error UI** — network failures silently fail (`console.error` only)
3. 🟡 Refresh button missing `aria-label`
4. 🟡 Dropdown menus don't close on Escape
5. 🟡 Debounced search has stale closure risk — `fetchData` recreated each render but not in deps
6. 🔵 No pagination support

---

### 3.6 PricingPage

**File:** `features/pricing/pages/PricingPage.tsx` (628 lines)
**Data Source:** 🔴 Mock — `mockModules` (8), `mockCoupons` (4), `mockDiscounts` (5), inline `stats`

| Check         | Status                          |
| :------------ | :------------------------------ |
| Loading State | ❌ Missing                      |
| Error State   | ❌ Missing                      |
| Empty State   | ❌ Missing                      |
| Toast         | ❌ No feedback on edits/deletes |
| RTL           | ✅ 0 violations                 |
| React Query   | ❌ Local constants              |

**Issues:**

1. 🔴 **3 mock arrays** + `stats` object. Needs `GET /api/platform/pricing/modules`, `/coupons`, `/discounts`
2. 🟠 **§15 violation** — no loading/error/empty states
3. 🟠 **§8.3 violation** — needs `useModulePricing()`, `useCoupons()`, `useDiscounts()` hooks
4. 🟡 "Price Calculator" button has no handler
5. 🟡 "Add Coupon" button has no handler/modal
6. 🟡 Edit/Delete coupon buttons have no handlers
7. 🟡 No confirmation dialogs for destructive actions
8. 🔵 Edit module pricing button non-functional

---

### 3.7 WebhooksPage

**File:** `features/webhooks/pages/WebhooksPage.tsx` (584 lines)
**Data Source:** 🔴 Mock — `mockWebhooks` (5), `mockDeliveries` (7), inline `stats`

| Check         | Status                                          |
| :------------ | :---------------------------------------------- |
| Loading State | ❌ Missing                                      |
| Error State   | ❌ Missing                                      |
| Empty State   | ⚠️ Partial — endpoints tab only, not deliveries |
| Toast         | ❌ No feedback on any action                    |
| RTL           | ✅ 0 violations                                 |
| React Query   | ❌ Local constants                              |

**Issues:**

1. 🔴 **2 mock arrays** + `stats`. Needs `GET /api/platform/webhooks`, `/deliveries`
2. 🟠 **§15 violation** — no loading skeleton, no error state
3. 🟠 **§8.3 violation** — needs `useWebhookList()`, `useDeliveryLog()` hooks
4. 🟡 "Add Endpoint" button has no handler/modal
5. 🟡 Test/Delete/Enable/Disable buttons non-functional
6. 🟡 No empty state for deliveries tab
7. 🟡 ExternalLink on webhook URLs not confirmed before navigation
8. 🔵 Delivery payload viewer non-functional
9. 🔵 No pagination support

---

### 3.8 ApiCatalogPage

**File:** `features/api-catalog/pages/ApiCatalogPage.tsx` (517 lines)
**Data Source:** ⚠️ Real API — `fetch()` to `/api/openapi.json`

| Check         | Status                         |
| :------------ | :----------------------------- |
| Loading State | ✅ Spinner                     |
| Error State   | ✅ Retry button                |
| Empty State   | ✅ "No endpoints match"        |
| RTL           | ✅ 0 violations                |
| React Query   | ❌ Raw `fetch()` + `useEffect` |

**Issues:**

1. 🟠 **§8.3 violation** — uses raw `fetch()` instead of `useOpenApiSpec()` React Query hook
2. 🟡 Expand/collapse chevrons missing `aria-label` or `aria-expanded`
3. 🔵 `fetchSpec` not in `useEffect` deps (minor stale closure)
4. 🔵 No pagination for large API specs

**Note:** Best-implemented among mock/inline pages — has all three states.

---

### 3.9 DevLoginPage

**File:** `features/auth/pages/DevLoginPage.tsx` (281 lines)
**Data Source:** ✅ Real `apiClient.post`

| Check         | Status                           |
| :------------ | :------------------------------- |
| Loading State | ✅ Spinner on button             |
| Error State   | ✅ Inline error banner           |
| RTL           | ✅ 0 violations                  |
| Forms         | ❌ Raw `useState` — no RHF + Zod |

**Issues:**

1. 🟠 **§8.4 violation** — login form uses raw `useState` + `onChange` instead of RHF + Zod with shared `loginSchema`
2. 🟡 Show/hide password toggle missing `aria-label`
3. 🟡 No "Forgot Password" link
4. 🟡 No lockout UI for failed attempts
5. 🔵 `ApiError` imported from local `lib/api-client.js` — acceptable for auth
6. 🔵 2FA "Back to login" correctly resets state

---

### 3.10 AcceptInvitePage

**File:** `features/auth/pages/AcceptInvitePage.tsx` (237 lines)
**Data Source:** ⚠️ Direct `apiClient` in `useEffect` + `handleSubmit`

| Check         | Status                           |
| :------------ | :------------------------------- |
| Loading State | ✅ Verify spinner                |
| Error State   | ✅ Invalid/expired token screen  |
| Toast         | ✅ Success/error on accept       |
| RTL           | ✅ 0 violations                  |
| React Query   | ❌ Direct apiClient              |
| Forms         | ❌ Raw `useState` — no RHF + Zod |

**Issues:**

1. 🟠 **§8.3 violation** — token verification + invite acceptance use raw `apiClient.post` in `useEffect`/handler, not React Query mutations
2. 🟠 **§8.4 violation** — password form uses manual `useState` instead of RHF + Zod
3. 🟡 Password toggle button missing `aria-label`
4. 🟡 Email `<Label>` missing `htmlFor` + `<Input>` missing `id`
5. 🔵 Could benefit from `useVerifyInviteToken(token)` + `useAcceptInvite()` hooks

---

### 3.11 PlatformUsersPage

**File:** `features/platform-users/pages/PlatformUsersPage.tsx` (685 lines)
**Data Source:** ⚠️ Mixed — hooks for list/invite/delete/resend/revoke, but **raw apiClient for suspend/activate**

| Check         | Status                                     |
| :------------ | :----------------------------------------- |
| Loading State | ✅ Via DataTable                           |
| Error State   | ❌ Missing — `isError` never destructured  |
| Empty State   | ✅ DataTable empty message                 |
| Toast         | ✅ On most mutations                       |
| RTL           | 🔴 **5 violations**                        |
| React Query   | ⚠️ Partial — suspend/activate bypass hooks |
| Forms         | ❌ Invite form uses raw `useState`         |

**Issues:**

1. 🟠 **§15 violation** — `isError` not destructured from query; no `QueryErrorBanner`
2. 🟠 **§11 RTL violations (5):** `mr-2` on RotateCcw, Ban, AlertTriangle, CheckCircle2, Trash2 icons in dropdown — all should be `me-2`
3. 🟠 **§8.3 violation** — suspend/activate use dynamic `import()` + `apiClient.patch()` + `window.location.reload()` instead of mutation hooks
4. 🟠 **§8.4 violation** — invite form uses manual `inviteForm` state
5. 🟡 MoreHorizontal icon button missing `aria-label`
6. 🟡 Search input missing label/`aria-label`
7. 🟡 Copy invite link button missing `aria-label`

---

### 3.12 BillingPage

**File:** `features/billing/pages/BillingPage.tsx` (291 lines)
**Data Source:** ✅ Real hooks — `useBillingStats`, `useInvoices`, `useSendReminder`

| Check         | Status                           |
| :------------ | :------------------------------- |
| Loading State | ⚠️ Partial — InvoicesTab only    |
| Error State   | ✅ QueryErrorBanner on both tabs |
| Empty State   | ⚠️ Partial — InvoicesTab only    |
| Toast         | ❌ `sendReminder` has no toast   |
| RTL           | ✅ 0 violations                  |

**Issues:**

1. 🟠 OverviewTab missing loading skeleton — no `isLoading` destructured
2. 🟠 OverviewTab missing empty state — blank area if `stats` is null
3. 🟠 `sendReminder.mutate(row._id)` has no `onSuccess`/`onError` toast
4. 🟡 Tab buttons use raw `<button>` — missing `role="tab"`, `aria-selected`
5. 🟡 Search input in InvoicesTab missing label/`aria-label`

---

### 3.13 SettingsPage

**File:** `features/settings/pages/SettingsPage.tsx` (82 lines)
**Data Source:** ✅ Real hook — `useAllPlatformSettings`

| Check         | Status                   |
| :------------ | :----------------------- |
| Loading State | ✅ Skeleton placeholders |
| Error State   | ✅ QueryErrorBanner      |
| Empty State   | ⚠️ No null guard         |
| RTL           | ✅ 0 violations          |

**Issues:**

1. 🔵 Minor: No null guard on `data` properties before passing to tab children — could crash on unexpected API shape

---

### 3.14 SupportPage

**File:** `features/support/pages/SupportPage.tsx` (312 lines)
**Data Source:** ✅ Real hooks — `useSupportTickets`, `useSupportTicketStats`

| Check         | Status                                  |
| :------------ | :-------------------------------------- |
| Loading State | ✅ Spinner                              |
| Error State   | ❌ Missing — `isError` not destructured |
| Empty State   | ✅ "No tickets match"                   |
| RTL           | 🔴 **6 violations**                     |

**Issues:**

1. 🟠 **§15 violation** — `isError`/`error` not destructured; no error banner
2. 🟠 **§11 RTL violations (6):** `left-3`, `pl-9`, `mr-0.5`, `mr-2`, `mr-1` (×2) — should be `start-3`, `ps-9`, `me-0.5`, `me-2`, `me-1`
3. 🟡 Search input missing label/`aria-label`
4. 🟡 View/Assign buttons on TicketCard are non-functional (no `onClick` handler)

---

### 3.15 FeatureFlagsPage

**File:** `features/feature-flags/pages/FeatureFlagsPage.tsx` (253 lines)
**Data Source:** ✅ Real hooks — `useFeatureFlags`, `useCreateFeatureFlag`, `useUpdateFeatureFlag`, `useToggleFeatureFlag`, `useDeleteFeatureFlag`

| Check         | Status                                    |
| :------------ | :---------------------------------------- |
| Loading State | ✅ Skeleton                               |
| Error State   | ✅ QueryErrorBanner                       |
| Empty State   | ✅ CTA included                           |
| Toast         | ⚠️ Partial — only `toast.error` on delete |

**Issues:**

1. 🟠 Missing `toast.success` on delete, **no toast at all** on create, update, toggle
2. 🟡 Search input missing label/`aria-label`

---

### 3.16 CustomFieldsPage

**File:** `features/custom-fields/pages/CustomFieldsPage.tsx` (307 lines)
**Data Source:** ✅ Real hooks — full CRUD + reorder

| Check         | Status                     |
| :------------ | :------------------------- |
| Loading State | ✅ Skeleton                |
| Error State   | ✅ QueryErrorBanner        |
| Empty State   | ✅ CTA + "Select a Tenant" |
| Toast         | ✅ All mutations           |

**Issues:**

1. 🟡 Field search input missing label/`aria-label`

---

### 3.17 AuditLogsPage

**File:** `features/audit-logs/pages/AuditLogsPage.tsx` (204 lines)
**Data Source:** ✅ Real hooks — `useAuditLogs`, `useAuditLogStats`

| Check         | Status                 |
| :------------ | :--------------------- |
| Loading State | ✅ Via DataTable       |
| Error State   | ✅ QueryErrorBanner    |
| Empty State   | ✅ DataTable empty msg |

**Issues:**

1. 🟡 Search input missing label/`aria-label`

---

### 3.18 UserSessionsPage

**File:** `features/user-sessions/pages/UserSessionsPage.tsx` (209 lines)
**Data Source:** ✅ Real hooks — `useUserSessions`, `useSessionStats`, `useRevokeSession`

| Check         | Status                          |
| :------------ | :------------------------------ |
| Loading State | ✅ Via DataTable                |
| Error State   | ✅ QueryErrorBanner             |
| Empty State   | ✅ DataTable empty msg          |
| Toast         | ❌ `revokeSession` has no toast |

**Issues:**

1. 🟠 `revokeSession.mutate(row._id)` has no `onSuccess`/`onError` toast
2. 🟡 Search input missing label/`aria-label`
3. 🟡 Status filter group missing `role="group"` + `aria-label`

---

### 3.19 BackupsPage

**File:** `features/backups/pages/BackupsPage.tsx` (295 lines)
**Data Source:** ✅ Real hooks — `useBackups`, `useBackupStats`, `useTriggerBackup`, `useRestoreBackup`, `useDeleteBackup`

| Check         | Status                                  |
| :------------ | :-------------------------------------- |
| Loading State | ✅ Via DataTable                        |
| Error State   | ❌ Missing — `isError` not destructured |
| Empty State   | ✅ DataTable empty msg                  |
| Toast         | ✅ All 3 mutations                      |
| RTL           | 🟠 **3 violations**                     |

**Issues:**

1. 🟠 **§15 violation** — no error state, no `QueryErrorBanner`
2. 🟠 **§11 RTL violations (3):** `mr-1.5` (Plus icon), `left-3` (Search icon), `pl-9` (search Input) — should be `me-1.5`, `start-3`, `ps-9`
3. 🟡 Download, Restore, Delete icon buttons use `title` but lack `aria-label`

---

### 3.20 DeploymentsPage

**File:** `features/deployments/pages/DeploymentsPage.tsx` (255 lines)
**Data Source:** ✅ Real hooks — `useDeployments`, `useDeploymentStats`, `useRollback`

| Check         | Status                   |
| :------------ | :----------------------- |
| Loading State | ✅ Via DataTable         |
| Error State   | ✅ QueryErrorBanner      |
| Empty State   | ✅ DataTable empty msg   |
| Toast         | ❌ Rollback has no toast |

**Issues:**

1. 🟠 `rollback.mutate(row._id)` has no `toast.success` or `toast.error` callback

---

### 3.21 DomainsPage

**File:** `features/domains/pages/DomainsPage.tsx` (177 lines)
**Data Source:** ✅ Real hook — `useDomains`

| Check         | Status                                  |
| :------------ | :-------------------------------------- |
| Loading State | ✅ Via DataTable                        |
| Error State   | ❌ Missing — `isError` not destructured |
| Empty State   | ✅ DataTable empty msg                  |
| RTL           | 🟠 **3 violations**                     |

**Issues:**

1. 🟠 **No error state** — `isError` not destructured, no error banner
2. 🟠 **§11 RTL violations (3):** `mr-1.5` (Plus), `left-3` (Search), `pl-9` (Input) — should be `me-1.5`, `start-3`, `ps-9`
3. 🟡 Stats computed from current page only — incorrect on multi-page data
4. 🟡 DNS column icons (`CheckCircle`/`AlertTriangle`) have no `aria-label` or `sr-only` text
5. 🔵 Should use dedicated stats endpoint instead of client-side `.filter()`
6. 🔵 Mutations handled in `AddDomainDialog` (separately audited)

---

### 3.22 StoragePage

**File:** `features/storage/pages/StoragePage.tsx` (82 lines)
**Data Source:** ✅ Real hook — `useStorageStats`

| Check         | Status                                              |
| :------------ | :-------------------------------------------------- |
| Loading State | ✅ Skeleton blocks                                  |
| Error State   | ✅ QueryErrorBanner                                 |
| Empty State   | ❌ Missing — renders `null` if `stats` is undefined |

**Issues:**

1. 🟡 Missing empty state — if `stats` is null, user sees blank page with only header

---

### 3.23 SystemLogsPage

**File:** `features/system-logs/pages/SystemLogsPage.tsx` (186 lines)
**Data Source:** ✅ Real hooks — `useSystemLogs`, `useSystemLogStats`

| Check         | Status                 |
| :------------ | :--------------------- |
| Loading State | ✅ Via DataTable       |
| Error State   | ✅ QueryErrorBanner    |
| Empty State   | ✅ DataTable empty msg |
| RTL           | ✅ 0 violations        |
| Accessibility | ✅ No issues           |

**Issues:** ✅ **None — Fully compliant**

---

### 3.24 MonitoringOverviewPage

**File:** `features/monitoring/pages/MonitoringPage.tsx` (88 lines)
**Data Source:** ✅ Real hook — `useMonitoringStats`

| Check         | Status                                             |
| :------------ | :------------------------------------------------- |
| Loading State | ⚠️ Stat cards show `0` during load — no skeleton   |
| Error State   | ✅ QueryErrorBanner                                |
| Empty State   | ❌ Missing — shows `0` values instead of messaging |

**Issues:**

1. 🟡 Stat cards render `0` while loading — briefly misleading before real data arrives
2. 🟡 No empty state when overview returns no data

---

### 3.25 HealthStatusPage

**File:** `features/monitoring/pages/HealthStatusPage.tsx` (110 lines)
**Data Source:** ✅ Real hook — `useHealthStatus`

| Check         | Status                                                    |
| :------------ | :-------------------------------------------------------- |
| Loading State | ✅ Skeleton cards                                         |
| Error State   | ✅ QueryErrorBanner                                       |
| Empty State   | ❌ Missing — empty `components` object renders blank grid |

**Issues:**

1. 🟡 Refresh icon button has `title` but no `aria-label`
2. 🟡 Empty `components` object renders nothing — should show empty message
3. 🔵 Uses native `<button>` instead of `@dento/ui` `<Button>` for refresh action

---

### 3.26 ErrorListPage

**File:** `features/monitoring/pages/ErrorListPage.tsx` (120 lines)
**Data Source:** ✅ Delegated to `<RecentErrorsTable>` (uses `useErrorLogs` hook)

| Check         | Status                                                    |
| :------------ | :-------------------------------------------------------- |
| Loading State | ✅ Delegated                                              |
| Error State   | ✅ Delegated                                              |
| Empty State   | ✅ Delegated                                              |
| Toast         | ❌ Resolve/unresolve in `RecentErrorsTable` have no toast |

**Issues:**

1. 🟠 `resolve.mutate()` / `unresolve.mutate()` in `RecentErrorsTable` have no success/error toasts
2. 🟡 View, Resolve, Unresolve icon buttons in `RecentErrorsTable` have `title` but no `aria-label`

---

### 3.27 ForbiddenPage

**File:** `components/ForbiddenPage.tsx` (27 lines)
**Data Source:** Static (no data fetching)

**Issues:** ✅ **None — Fully compliant** (simple static page)

---

## 4. Category Breakdowns

### 4.1 Mock Data Pages

**7 pages are entirely mock/hardcoded (cannot function without API wiring):**

| Page             | Mock Variables                                                                                                                                       | Required API Endpoints                                  |
| :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------ |
| DashboardPage    | `stats` array (`value: '—'`)                                                                                                                         | `GET /api/platform/dashboard/stats`                     |
| TenantsPage      | `mockTenants[]` (7 entries)                                                                                                                          | `GET /api/platform/tenants`                             |
| TenantDetailPage | `mockTenant`, `mockUsers`, `allModules`, `mockWorkflows`, `mockSupportSessions`, `mockCollections`, `mockDocuments`, `mockTickets`, billing invoices | `GET /api/platform/tenants/:id` + 7 sub-endpoints       |
| ApiKeysPage      | `mockApiKeys[]` (6) + `stats`                                                                                                                        | `GET /api/platform/api-keys`                            |
| PricingPage      | `mockModules[]` (8), `mockCoupons[]` (4), `mockDiscounts[]` (5) + `stats`                                                                            | `GET /api/platform/pricing/{modules,coupons,discounts}` |
| WebhooksPage     | `mockWebhooks[]` (5), `mockDeliveries[]` (7) + `stats`                                                                                               | `GET /api/platform/webhooks`, `/deliveries`             |
| ApiCatalogPage   | — (fetches real data, but inline `fetch`)                                                                                                            | Already connects to API                                 |

**Total mock data objects across the codebase: ~20**

### 4.2 RTL Violations

**Total: 24 violations across 7 files** (17 in page files, 7 in component files)

| File                      | Count | Violations                                    |
| :------------------------ | :---- | :-------------------------------------------- |
| SupportPage.tsx           | 6     | `left-3`, `pl-9`, `mr-0.5`, `mr-2`, `mr-1` ×2 |
| PlatformUsersPage.tsx     | 5     | `mr-2` ×5 (dropdown icons)                    |
| BackupsPage.tsx           | 3     | `mr-1.5`, `left-3`, `pl-9`                    |
| DomainsPage.tsx           | 3     | `mr-1.5`, `left-3`, `pl-9`                    |
| SessionsTab.tsx (support) | 2     | `left-3`, `pl-9`                              |
| DomainDetailSheet.tsx     | 2     | `mr-1.5` ×2                                   |
| BackupConfigPanel.tsx     | 3     | `mr-1.5` ×2, `mr-1`                           |

**Common pattern:** Search inputs consistently use `left-3` + `pl-9` — needs bulk fix to `start-3` + `ps-9`.

### 4.3 Missing Loading/Error/Empty States

**BUILD_RULES §15 requires all three states on every data-fetching page.**

#### Missing Error States (9 pages)

| Page              | Issue                                |
| :---------------- | :----------------------------------- |
| DashboardPage     | No data fetching at all              |
| TenantsPage       | Mock data — no query                 |
| TenantDetailPage  | Mock data — no query                 |
| ApiKeysPage       | Mock data — no query                 |
| PricingPage       | Mock data — no query                 |
| WebhooksPage      | Mock data — no query                 |
| ModulesPage       | `catch` only `console.error` — no UI |
| PlatformUsersPage | `isError` never destructured         |
| SupportPage       | `isError` never destructured         |
| BackupsPage       | `isError` never destructured         |
| DomainsPage       | `isError` never destructured         |

#### Missing Loading States (7 pages)

All 7 are mock-data pages that have no data fetching at all:
DashboardPage, TenantsPage, TenantDetailPage, ApiKeysPage, PricingPage, WebhooksPage + BillingPage OverviewTab

#### Missing Empty States (11 pages)

DashboardPage, TenantsPage, TenantDetailPage, PricingPage, StoragePage, MonitoringOverview, HealthStatusPage, BillingPage OverviewTab, SettingsPage (no guard), WebhooksPage deliveries tab, MonitoringOverview

### 4.4 Toast Feedback Gaps

**8 pages have mutations without toast notification:**

| Page             | Mutation                                 | Fix Needed                                                |
| :--------------- | :--------------------------------------- | :-------------------------------------------------------- |
| BillingPage      | `sendReminder.mutate()`                  | Add `onSuccess`/`onError` toast                           |
| FeatureFlagsPage | create, update, delete, toggle           | Add `toast.success` on all; delete only has `toast.error` |
| UserSessionsPage | `revokeSession.mutate()`                 | Add toast callbacks                                       |
| DeploymentsPage  | `rollback.mutate()`                      | Add toast callbacks                                       |
| ErrorListPage    | `resolve.mutate()`, `unresolve.mutate()` | Add toast callbacks (in `RecentErrorsTable`)              |
| TenantsPage      | Delete button                            | Non-functional — needs handler + toast                    |
| TenantDetailPage | Module toggles, settings saves           | Non-functional — needs API wiring + toast                 |
| WebhooksPage     | All action buttons                       | Non-functional — needs API wiring + toast                 |

### 4.5 Accessibility Violations

**~25 violations across 16 pages. Recurring patterns:**

#### Pattern A: Search inputs missing label (`aria-label`) — 10+ pages

Every page with a search `<Input>` lacks `<Label>` or `aria-label`:
AuditLogsPage, BackupsPage, BillingPage, CustomFieldsPage, DomainsPage, FeatureFlagsPage, PlatformUsersPage, SupportPage, UserSessionsPage

**Bulk fix:** Add `aria-label="Search"` to all search inputs.

#### Pattern B: Icon-only buttons missing `aria-label` — 6 pages

| Page              | Button                           | Fix                                               |
| :---------------- | :------------------------------- | :------------------------------------------------ |
| DevLoginPage      | Show/hide password toggle        | `aria-label="Show password"` / `"Hide password"`  |
| AcceptInvitePage  | Password toggle                  | Same as above                                     |
| PlatformUsersPage | MoreHorizontal, Copy invite link | `aria-label="User actions"`, `"Copy invite link"` |
| ModulesPage       | Refresh button                   | `aria-label="Refresh modules"`                    |
| BackupsPage       | Download, Restore, Delete        | Add `aria-label` matching action                  |
| HealthStatusPage  | Refresh button                   | `aria-label="Refresh status"`                     |

#### Pattern C: Custom tabs missing ARIA roles — BillingPage

Tab buttons use raw `<button>` without `role="tab"`, `role="tablist"`, `aria-selected`.

### 4.6 React Query Compliance

**BUILD_RULES §8.3 requires extracted hooks with query key factories.**

| Category                             | Pages | Status                                                                                                                                                                                                                                   |
| :----------------------------------- | :---- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Fully compliant (extracted hooks) | 15    | BillingPage, SettingsPage, SupportPage, FeatureFlagsPage, CustomFieldsPage, AuditLogsPage, UserSessionsPage, BackupsPage, DeploymentsPage, DomainsPage, StoragePage, SystemLogsPage, MonitoringOverview, HealthStatusPage, ErrorListPage |
| ⚠️ Partially compliant               | 1     | PlatformUsersPage (suspend/activate bypass hooks)                                                                                                                                                                                        |
| ❌ Inline `fetch()`                  | 2     | ModulesPage, ApiCatalogPage                                                                                                                                                                                                              |
| ❌ Direct `apiClient`                | 2     | DevLoginPage, AcceptInvitePage (acceptable for auth pages)                                                                                                                                                                               |
| ❌ No fetching (mock data)           | 6     | DashboardPage, TenantsPage, TenantDetailPage, ApiKeysPage, PricingPage, WebhooksPage                                                                                                                                                     |
| N/A                                  | 1     | ForbiddenPage                                                                                                                                                                                                                            |

### 4.7 Form Pattern Compliance

**BUILD_RULES §8.4 requires React Hook Form + Zod resolver + shared schema.**

| Page              | Form                            | Status                       |
| :---------------- | :------------------------------ | :--------------------------- |
| DevLoginPage      | Login form (email/password/2FA) | ❌ Raw `useState`            |
| AcceptInvitePage  | Password form                   | ❌ Raw `useState`            |
| PlatformUsersPage | Invite form                     | ❌ Raw `useState`            |
| TenantDetailPage  | Settings/Branding/Channels tabs | ❌ Raw `defaultValue` inputs |

---

## 5. Sidebar & Navigation Audit

### sidebar-config.ts

**File:** `config/sidebar-config.ts` (163 lines)

- ✅ Every nav item (except Dashboard) has `requiredPermission` field
- ✅ Uses `module.action` format (e.g., `"platform_tenants.read"`)
- ✅ Dashboard has no `requiredPermission` — correct, all users see it
- 🔵 Minor: Uses combined string `"platform_tenants.read"` vs separate `requiredModule`/`requiredAction` — functionally equivalent

### Sidebar.tsx

**File:** `layouts/Sidebar/Sidebar.tsx` (104 lines)

- ✅ **Permission filtering IS implemented** — `filterSidebarItems()` correctly filters via `hasPlatformPerm()` and removes empty sections
- ⚠️ Non-reactive: uses `useAuthStore.getState()` (not hook) — sidebar won't reactively re-render if permissions change mid-session
- ✅ RTL: uses `border-e` (correct)

**Previous concern resolved:** Sidebar permission filtering was flagged as "missing" in an earlier audit — it has since been implemented.

---

## 6. Priority Fix Order

### 🔴 P0 — Critical (Block functional readiness)

| #   | Task                                                                                | Pages                                                        | Effort |
| :-- | :---------------------------------------------------------------------------------- | :----------------------------------------------------------- | :----- |
| 1   | **Split TenantDetailPage** into ~10 sub-components                                  | TenantDetailPage                                             | L      |
| 2   | **Wire mock pages to real APIs** — replace 6 mock-data pages with React Query hooks | Dashboard, Tenants, TenantDetail, ApiKeys, Pricing, Webhooks | XL     |
| 3   | **Convert inline fetch to React Query hooks**                                       | ModulesPage, ApiCatalogPage                                  | M      |

### 🟠 P1 — High (Compliance violations)

| #   | Task                                                                                                | Pages                                                       | Effort |
| :-- | :-------------------------------------------------------------------------------------------------- | :---------------------------------------------------------- | :----- |
| 4   | **Add missing error states** (`isError` + `QueryErrorBanner`)                                       | PlatformUsers, Support, Backups, Domains, Modules           | S      |
| 5   | **Add missing toast feedback** on mutations                                                         | Billing, FeatureFlags, UserSessions, Deployments, ErrorList | S      |
| 6   | **Convert forms to RHF + Zod**                                                                      | DevLogin, AcceptInvite, PlatformUsers invite                | M      |
| 7   | **Fix PlatformUsersPage suspend/activate** — replace `window.location.reload()` with mutation hooks | PlatformUsersPage                                           | S      |

### 🟡 P2 — Medium (Standards compliance)

| #   | Task                                                                   | Pages                                                      | Effort |
| :-- | :--------------------------------------------------------------------- | :--------------------------------------------------------- | :----- |
| 8   | **Fix 24 RTL violations** — `mr-`→`me-`, `left-`→`start-`, `pl-`→`ps-` | Support, PlatformUsers, Backups, Domains + 3 components    | S      |
| 9   | **Add `aria-label` to icon-only buttons**                              | 6 pages + RecentErrorsTable                                | S      |
| 10  | **Add `aria-label` to all search inputs**                              | ~10 pages                                                  | XS     |
| 11  | **Add missing empty states**                                           | Storage, MonitoringOverview, HealthStatus, BillingOverview | S      |

### 🔵 P3 — Low (Polish)

| #   | Task                                                              | Pages              | Effort |
| :-- | :---------------------------------------------------------------- | :----------------- | :----- |
| 12  | Fix BillingPage tab accessibility (`role="tab"`, `aria-selected`) | BillingPage        | XS     |
| 13  | Add null guard on SettingsPage data props                         | SettingsPage       | XS     |
| 14  | Fix MonitoringOverview stat cards showing `0` during load         | MonitoringOverview | XS     |
| 15  | Fix Sidebar reactivity — use hook instead of `getState()`         | Sidebar.tsx        | XS     |
| 16  | Replace native `<button>` with `<Button>` in HealthStatusPage     | HealthStatusPage   | XS     |

**Effort Legend:** XS = <15min | S = 15-30min | M = 30-60min | L = 1-2h | XL = 4h+
