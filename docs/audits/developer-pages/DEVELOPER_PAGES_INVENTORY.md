# Developer Portal — Pages Inventory

> **Generated:** 2025-07-02  
> **App:** `apps/developer/`  
> **Total Pages:** 27 (26 feature pages + 1 utility page)  
> **Total Lines:** ~10,680

---

## Table of Contents

1. [Route Map](#route-map)
2. [Sidebar Navigation](#sidebar-navigation)
3. [Summary Table](#summary-table)
4. [Per-Page Details](#per-page-details)

---

## Route Map

Source: `apps/developer/src/router.tsx`

| Route Path           | Page Component    | Auth Guard                            |
| -------------------- | ----------------- | ------------------------------------- |
| `/login`             | DevLoginPage      | GuestRoute                            |
| `/invite/:token`     | AcceptInvitePage  | Public                                |
| `/`                  | DashboardPage     | ProtectedRoute                        |
| `/tenants`           | TenantsPage       | ProtectedRoute                        |
| `/tenants/:tenantId` | TenantDetailPage  | ProtectedRoute                        |
| `/monitoring`        | MonitoringPage    | ProtectedRoute                        |
| `/deployments`       | DeploymentsPage   | ProtectedRoute                        |
| `/user-sessions`     | UserSessionsPage  | ProtectedRoute                        |
| `/billing`           | BillingPage       | ProtectedRoute                        |
| `/domains`           | DomainsPage       | ProtectedRoute                        |
| `/support`           | SupportPage       | ProtectedRoute                        |
| `/modules`           | ModulesPage       | ProtectedRoute                        |
| `/pricing`           | PricingPage       | ProtectedRoute                        |
| `/flags`             | FeatureFlagsPage  | ProtectedRoute                        |
| `/fields`            | CustomFieldsPage  | ProtectedRoute                        |
| `/settings`          | SettingsPage      | ProtectedRoute                        |
| `/storage`           | StoragePage       | ProtectedRoute                        |
| `/backups`           | BackupsPage       | ProtectedRoute                        |
| `/api-keys`          | ApiKeysPage       | ProtectedRoute                        |
| `/webhooks`          | WebhooksPage      | ProtectedRoute                        |
| `/api-catalog`       | ApiCatalogPage    | ProtectedRoute                        |
| `/audit`             | AuditLogsPage     | ProtectedRoute                        |
| `/system-logs`       | SystemLogsPage    | ProtectedRoute                        |
| `/users`             | PlatformUsersPage | PlatformRoute (`platform_users.read`) |
| `*`                  | → Navigate `/`    | Fallback                              |

---

## Sidebar Navigation

Source: `apps/developer/src/config/sidebar-config.ts` — 7 sections

| Section      | Items                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview** | Dashboard `/`                                                                                                                             |
| **SaaS**     | Tenants `/tenants` · Monitoring `/monitoring` · Deployments `/deployments` · Billing `/billing` · Domains `/domains` · Support `/support` |
| **Platform** | Modules `/modules` · Pricing `/pricing` · Feature Flags `/flags` · Custom Fields `/fields`                                                |
| **Team**     | Platform Users `/users`                                                                                                                   |
| **Config**   | Settings `/settings` · Storage `/storage` · Backups `/backups`                                                                            |
| **API**      | API Catalog `/api-catalog` · API Keys `/api-keys` · Webhooks `/webhooks`                                                                  |
| **Logs**     | Audit `/audit` · System `/system-logs`                                                                                                    |

---

## Summary Table

| #   | Page              | Feature        | Lines | Data Source               | Hooks | Components | Tests |
| --- | ----------------- | -------------- | ----- | ------------------------- | ----- | ---------- | ----- |
| 1   | ApiCatalogPage    | api-catalog    | 517   | Real (inline fetch)       | —     | —          | —     |
| 2   | ApiKeysPage       | api-keys       | 451   | **Mock**                  | —     | —          | —     |
| 3   | AuditLogsPage     | audit-logs     | 260   | Real hooks                | 1     | 1          | 1     |
| 4   | DevLoginPage      | auth           | 336   | Real (apiClient)          | —     | —          | —     |
| 5   | AcceptInvitePage  | auth           | 265   | Real (apiClient)          | —     | —          | —     |
| 6   | BackupsPage       | backups        | 401   | Real hooks                | 1     | 1          | —     |
| 7   | BillingPage       | billing        | 350   | Real hooks                | 1     | 2          | 1     |
| 8   | CustomFieldsPage  | custom-fields  | 487   | Real hooks                | 1     | 3          | 1     |
| 9   | DashboardPage     | dashboard      | 50    | **Hardcoded placeholder** | —     | —          | —     |
| 10  | DeploymentsPage   | deployments    | 336   | Real hooks                | 1     | 1          | 1     |
| 11  | DomainsPage       | domains        | 225   | Real hooks                | 1     | 2          | —     |
| 12  | FeatureFlagsPage  | feature-flags  | 319   | Real hooks                | 1     | 2          | 1     |
| 13  | ModulesPage       | modules        | 494   | Real (inline fetch)       | —     | —          | —     |
| 14  | MonitoringPage    | monitoring     | 97    | Real hooks                | 4     | 4          | 4     |
| 15  | HealthStatusPage  | monitoring     | 126   | Real hooks                | ↑     | ↑          | ↑     |
| 16  | ErrorListPage     | monitoring     | 147   | Real hooks                | ↑     | ↑          | ↑     |
| 17  | PlatformUsersPage | platform-users | 685   | Real hooks + apiClient    | 1     | —          | —     |
| 18  | PricingPage       | pricing        | 628   | **Mock**                  | —     | —          | —     |
| 19  | SettingsPage      | settings       | 83    | Real hooks                | 1     | 4          | 1     |
| 20  | StoragePage       | storage        | 86    | Real hooks                | 1     | 3          | 1     |
| 21  | SupportPage       | support        | 429   | Real hooks                | 1     | 3          | —     |
| 22  | SystemLogsPage    | system-logs    | 244   | Real hooks                | 1     | —          | 1     |
| 23  | TenantsPage       | tenants        | 416   | **Mock**                  | —     | —          | —     |
| 24  | TenantDetailPage  | tenants        | 2,402 | **Mock**                  | —     | —          | —     |
| 25  | UserSessionsPage  | user-sessions  | 243   | Real hooks                | 1     | 1          | 1     |
| 26  | WebhooksPage      | webhooks       | 584   | **Mock**                  | —     | —          | —     |
| 27  | ForbiddenPage     | (utility)      | 25    | Static                    | —     | —          | —     |

---

## Per-Page Details

### 1. ApiCatalogPage

| Property       | Value                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| **Path**       | `features/api-catalog/pages/ApiCatalogPage.tsx`                         |
| **Lines**      | 517                                                                     |
| **Route**      | `/api-catalog`                                                          |
| **Data**       | Real — inline `fetch()` to `/api/openapi.json`, parses OpenAPI 3.1 spec |
| **Hooks**      | None (inline fetch)                                                     |
| **Components** | None                                                                    |
| **Tests**      | None                                                                    |
| **JSDoc**      | —                                                                       |

### 2. ApiKeysPage

| Property       | Value                                              |
| -------------- | -------------------------------------------------- |
| **Path**       | `features/api-keys/pages/ApiKeysPage.tsx`          |
| **Lines**      | 451                                                |
| **Route**      | `/api-keys`                                        |
| **Data**       | **Mock** — `mockApiKeys: ApiKey[]` hardcoded array |
| **Hooks**      | None                                               |
| **Components** | None                                               |
| **Tests**      | None                                               |
| **JSDoc**      | —                                                  |

### 3. AuditLogsPage

| Property       | Value                                         |
| -------------- | --------------------------------------------- |
| **Path**       | `features/audit-logs/pages/AuditLogsPage.tsx` |
| **Lines**      | 260                                           |
| **Route**      | `/audit`                                      |
| **Data**       | Real — `useAuditLogs`, `useAuditLogStats`     |
| **Hooks**      | `useAuditLogs.ts`                             |
| **Components** | `AuditLogDetailSheet.tsx`                     |
| **Tests**      | `useAuditLogs.test.ts`                        |
| **JSDoc**      | —                                             |

### 4. DevLoginPage

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| **Path**       | `features/auth/pages/DevLoginPage.tsx` |
| **Lines**      | 336                                    |
| **Route**      | `/login` (GuestRoute)                  |
| **Data**       | Real — `apiClient` POST `/auth/login`  |
| **Hooks**      | None                                   |
| **Components** | None                                   |
| **Tests**      | None                                   |
| **JSDoc**      | —                                      |

### 5. AcceptInvitePage

| Property       | Value                                               |
| -------------- | --------------------------------------------------- |
| **Path**       | `features/auth/pages/AcceptInvitePage.tsx`          |
| **Lines**      | 265                                                 |
| **Route**      | `/invite/:token` (Public)                           |
| **Data**       | Real — `apiClient` invite verification + acceptance |
| **Hooks**      | None                                                |
| **Components** | None                                                |
| **Tests**      | None                                                |
| **JSDoc**      | —                                                   |

### 6. BackupsPage

| Property       | Value                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------ |
| **Path**       | `features/backups/pages/BackupsPage.tsx`                                                         |
| **Lines**      | 401                                                                                              |
| **Route**      | `/backups`                                                                                       |
| **Data**       | Real — `useBackups`, `useBackupStats`, `useCreateBackup`, `useDownloadBackup`, `useDeleteBackup` |
| **Hooks**      | `useBackups.ts`                                                                                  |
| **Components** | `BackupConfigPanel.tsx`                                                                          |
| **Tests**      | None                                                                                             |
| **JSDoc**      | —                                                                                                |

### 7. BillingPage

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| **Path**       | `features/billing/pages/BillingPage.tsx`                   |
| **Lines**      | 350                                                        |
| **Route**      | `/billing`                                                 |
| **Data**       | Real — `useBillingStats`, `useInvoices`, `useSendReminder` |
| **Hooks**      | `useBilling.ts`                                            |
| **Components** | `InvoiceDetailSheet.tsx`, `RevenueChart.tsx`               |
| **Tests**      | `useBilling.test.ts`                                       |
| **JSDoc**      | —                                                          |

### 8. CustomFieldsPage

| Property       | Value                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Path**       | `features/custom-fields/pages/CustomFieldsPage.tsx`                                                                                    |
| **Lines**      | 487                                                                                                                                    |
| **Route**      | `/fields`                                                                                                                              |
| **Data**       | Real — `useCustomFields` + mutations                                                                                                   |
| **Hooks**      | `useCustomFields.ts`                                                                                                                   |
| **Components** | `CustomFieldCard.tsx`, `CustomFieldForm.tsx`, `DeveloperGuide.tsx`                                                                     |
| **Tests**      | `useCustomFields.test.ts`                                                                                                              |
| **JSDoc**      | Per PHASE_7 Step 1.3 — entity filter tabs, tenant selector, field card list, developer guide, create/edit sheet, toggle/delete actions |

### 9. DashboardPage

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| **Path**       | `features/dashboard/pages/DashboardPage.tsx`               |
| **Lines**      | 50                                                         |
| **Route**      | `/`                                                        |
| **Data**       | **Hardcoded placeholder** — static stats with `value: '—'` |
| **Hooks**      | None                                                       |
| **Components** | None                                                       |
| **Tests**      | None                                                       |
| **JSDoc**      | —                                                          |

### 10. DeploymentsPage

| Property       | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| **Path**       | `features/deployments/pages/DeploymentsPage.tsx`             |
| **Lines**      | 336                                                          |
| **Route**      | `/deployments`                                               |
| **Data**       | Real — `useDeployments`, `useDeploymentStats`, `useRollback` |
| **Hooks**      | `useDeployments.ts`                                          |
| **Components** | `DeploymentDetailSheet.tsx`                                  |
| **Tests**      | `useDeployments.test.ts`                                     |
| **JSDoc**      | —                                                            |

### 11. DomainsPage

| Property       | Value                                          |
| -------------- | ---------------------------------------------- |
| **Path**       | `features/domains/pages/DomainsPage.tsx`       |
| **Lines**      | 225                                            |
| **Route**      | `/domains`                                     |
| **Data**       | Real — `useDomains`                            |
| **Hooks**      | `useDomains.ts`                                |
| **Components** | `AddDomainDialog.tsx`, `DomainDetailSheet.tsx` |
| **Tests**      | None                                           |
| **JSDoc**      | —                                              |

### 12. FeatureFlagsPage

| Property       | Value                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Path**       | `features/feature-flags/pages/FeatureFlagsPage.tsx`                                       |
| **Lines**      | 319                                                                                       |
| **Route**      | `/flags`                                                                                  |
| **Data**       | Real — `useFeatureFlags`                                                                  |
| **Hooks**      | `useFeatureFlags.ts`                                                                      |
| **Components** | `FeatureFlagCard.tsx`, `FeatureFlagForm.tsx`                                              |
| **Tests**      | `useFeatureFlags.test.ts`                                                                 |
| **JSDoc**      | Per PHASE_7 Step 3.9 — flag list with status indicators, create/edit sheet, toggle/delete |

### 13. ModulesPage

| Property       | Value                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| **Path**       | `features/modules/pages/ModulesPage.tsx`                                |
| **Lines**      | 494                                                                     |
| **Route**      | `/modules`                                                              |
| **Data**       | Real — inline `fetch()` to `/api/platform/modules` and `/modules/stats` |
| **Hooks**      | None (inline fetch)                                                     |
| **Components** | None                                                                    |
| **Tests**      | None                                                                    |
| **JSDoc**      | —                                                                       |

### 14. MonitoringPage

| Property       | Value                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| **Path**       | `features/monitoring/pages/MonitoringPage.tsx`                                                             |
| **Lines**      | 97                                                                                                         |
| **Route**      | `/monitoring`                                                                                              |
| **Data**       | Real — `useMonitoringStats` (composes HealthStatusPage + ErrorListPage as tabs)                            |
| **Hooks**      | `useMonitoringStats.ts`, `useErrorLogs.ts`, `useHealthStatus.ts`, `useResolveError.ts`                     |
| **Components** | `ComponentStatusCard.tsx`, `ErrorDetailSheet.tsx`, `ErrorTimelineChart.tsx`, `RecentErrorsTable.tsx`       |
| **Tests**      | `useMonitoringStats.test.ts`, `useErrorLogs.test.ts`, `useHealthStatus.test.ts`, `useResolveError.test.ts` |
| **JSDoc**      | —                                                                                                          |

### 15. HealthStatusPage

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Path**       | `features/monitoring/pages/HealthStatusPage.tsx` |
| **Lines**      | 126                                              |
| **Route**      | Tab within MonitoringPage                        |
| **Data**       | Real — `useHealthStatus`                         |
| **Hooks**      | Shared with MonitoringPage (#14)                 |
| **Components** | Shared with MonitoringPage (#14)                 |
| **Tests**      | `useHealthStatus.test.ts`                        |
| **JSDoc**      | —                                                |

### 16. ErrorListPage

| Property       | Value                                               |
| -------------- | --------------------------------------------------- |
| **Path**       | `features/monitoring/pages/ErrorListPage.tsx`       |
| **Lines**      | 147                                                 |
| **Route**      | Tab within MonitoringPage                           |
| **Data**       | Real — `RecentErrorsTable` backed by `useErrorLogs` |
| **Hooks**      | Shared with MonitoringPage (#14)                    |
| **Components** | Shared with MonitoringPage (#14)                    |
| **Tests**      | `useErrorLogs.test.ts`                              |
| **JSDoc**      | —                                                   |

### 17. PlatformUsersPage

| Property       | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| **Path**       | `features/platform-users/pages/PlatformUsersPage.tsx`                       |
| **Lines**      | 685                                                                         |
| **Route**      | `/users` (PlatformRoute — requires `platform_users.read`)                   |
| **Data**       | Real — `use-platform-users.ts` + direct `apiClient` calls for invite/delete |
| **Hooks**      | `use-platform-users.ts`                                                     |
| **Components** | None                                                                        |
| **Tests**      | None                                                                        |
| **JSDoc**      | —                                                                           |

### 18. PricingPage

| Property       | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| **Path**       | `features/pricing/pages/PricingPage.tsx`                                  |
| **Lines**      | 628                                                                       |
| **Route**      | `/pricing`                                                                |
| **Data**       | **Mock** — `mockModules`, `mockCoupons`, `mockDiscounts` hardcoded arrays |
| **Hooks**      | None                                                                      |
| **Components** | None                                                                      |
| **Tests**      | None                                                                      |
| **JSDoc**      | —                                                                         |

### 19. SettingsPage

| Property       | Value                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| **Path**       | `features/settings/pages/SettingsPage.tsx`                                                     |
| **Lines**      | 83                                                                                             |
| **Route**      | `/settings`                                                                                    |
| **Data**       | Real — `useAllPlatformSettings`                                                                |
| **Hooks**      | `useSystemSettings.ts`                                                                         |
| **Components** | `GeneralSettingsTab.tsx`, `BrandingSettingsTab.tsx`, `CurrenciesTab.tsx`, `MaintenanceTab.tsx` |
| **Tests**      | `useSystemSettings.test.ts`                                                                    |
| **JSDoc**      | Per PHASE_7 Step 2.8 — tabs: General, Branding, Currencies, Maintenance                        |

### 20. StoragePage

| Property       | Value                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------- |
| **Path**       | `features/storage/pages/StoragePage.tsx`                                                           |
| **Lines**      | 86                                                                                                 |
| **Route**      | `/storage`                                                                                         |
| **Data**       | Real — `useStorageStats`                                                                           |
| **Hooks**      | `useStorageStats.ts`                                                                               |
| **Components** | `StorageOverviewCard.tsx`, `StorageUsageBar.tsx`, `TenantStorageTable.tsx`                         |
| **Tests**      | `useStorageStats.test.ts`                                                                          |
| **JSDoc**      | Per PHASE_7 Step 4.6 — read-only dashboard: platform-wide storage, S3 health, per-tenant breakdown |

### 21. SupportPage

| Property       | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| **Path**       | `features/support/pages/SupportPage.tsx`                              |
| **Lines**      | 429                                                                   |
| **Route**      | `/support`                                                            |
| **Data**       | Real — `useSupportTickets`, `useSupportTicketStats`                   |
| **Hooks**      | `useSupport.ts`                                                       |
| **Components** | `SessionDetailSheet.tsx`, `SessionsTab.tsx`, `StartSessionDialog.tsx` |
| **Tests**      | None                                                                  |
| **JSDoc**      | —                                                                     |

### 22. SystemLogsPage

| Property       | Value                                           |
| -------------- | ----------------------------------------------- |
| **Path**       | `features/system-logs/pages/SystemLogsPage.tsx` |
| **Lines**      | 244                                             |
| **Route**      | `/system-logs`                                  |
| **Data**       | Real — `useSystemLogs`, `useSystemLogStats`     |
| **Hooks**      | `useSystemLogs.ts`                              |
| **Components** | None                                            |
| **Tests**      | `useSystemLogs.test.ts`                         |
| **JSDoc**      | —                                               |

### 23. TenantsPage

| Property       | Value                                              |
| -------------- | -------------------------------------------------- |
| **Path**       | `features/tenants/pages/TenantsPage.tsx`           |
| **Lines**      | 416                                                |
| **Route**      | `/tenants`                                         |
| **Data**       | **Mock** — `mockTenants: Tenant[]` hardcoded array |
| **Hooks**      | None                                               |
| **Components** | None                                               |
| **Tests**      | None                                               |
| **JSDoc**      | —                                                  |

### 24. TenantDetailPage

| Property       | Value                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| **Path**       | `features/tenants/pages/TenantDetailPage.tsx`                                          |
| **Lines**      | 2,402                                                                                  |
| **Route**      | `/tenants/:tenantId`                                                                   |
| **Data**       | **Mock** — `mockTenant`, `mockUsers`, `mockWorkflows`, `mockSupportSessions` hardcoded |
| **Hooks**      | None                                                                                   |
| **Components** | None                                                                                   |
| **Tests**      | None                                                                                   |
| **JSDoc**      | —                                                                                      |

### 25. UserSessionsPage

| Property       | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| **Path**       | `features/user-sessions/pages/UserSessionsPage.tsx`             |
| **Lines**      | 243                                                             |
| **Route**      | `/user-sessions`                                                |
| **Data**       | Real — `useUserSessions`, `useSessionStats`, `useRevokeSession` |
| **Hooks**      | `useUserSessions.ts`                                            |
| **Components** | `SessionDetailSheet.tsx`                                        |
| **Tests**      | `useUserSessions.test.ts`                                       |
| **JSDoc**      | —                                                               |

### 26. WebhooksPage

| Property       | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| **Path**       | `features/webhooks/pages/WebhooksPage.tsx`                   |
| **Lines**      | 584                                                          |
| **Route**      | `/webhooks`                                                  |
| **Data**       | **Mock** — `mockWebhooks`, `mockDeliveries` hardcoded arrays |
| **Hooks**      | None                                                         |
| **Components** | None                                                         |
| **Tests**      | None                                                         |
| **JSDoc**      | —                                                            |

### 27. ForbiddenPage

| Property  | Value                                                                   |
| --------- | ----------------------------------------------------------------------- |
| **Path**  | `components/ForbiddenPage.tsx`                                          |
| **Lines** | 25                                                                      |
| **Route** | Rendered by `PlatformRoute` guard on permission failure                 |
| **Data**  | Static — no API calls                                                   |
| **JSDoc** | 403 Forbidden page — shown when user lacks required platform permission |
