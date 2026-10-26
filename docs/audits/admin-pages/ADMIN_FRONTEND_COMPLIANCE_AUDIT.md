# Admin Frontend — Deep Compliance Audit Report

> **Scope**: `apps/admin/src/` — every file under the admin SPA  
> **Generated**: 2025-01-30  
> **Auditor**: Automated deep-scan (all files read + regex verification)

---

## Executive Summary

| Category                  | Verdict              | Details                                                      |
| ------------------------- | -------------------- | ------------------------------------------------------------ |
| Toast imports             | ✅ **PASS**          | 0 `sonner` imports; all 15 usages from `@dento/ui`           |
| PaginationMeta origin     | ⚠️ **1 VIOLATION**   | `useAdminSessions.ts` defines locally                        |
| Loading states            | ✅ **PASS**          | 30+ pages use `TableSkeleton`                                |
| Error states              | ✅ **PASS**          | 30+ pages use `ErrorState` with retry                        |
| Empty states              | ✅ **PASS**          | 25+ pages use `EmptyState` from `@dento/ui`                  |
| Inline physical CSS       | ✅ **PASS**          | 0 physical inline style properties                           |
| Tailwind physical classes | ❌ **79 VIOLATIONS** | `mr-`, `ml-`, `pl-`, `left-`, `text-left/right`, `border-l-` |
| Toaster position          | ⚠️ **KNOWN**         | `top-right` (physical); Sonner has no logical API            |
| Auth store persistence    | ✅ **PASS**          | Memory-only, no `persist` middleware                         |
| Sidebar logical CSS       | ✅ **PASS**          | Uses `start-0`, `border-e`                                   |
| Header logical CSS        | ✅ **PASS**          | Uses `end-1`, `start-3.5`, `ps-`, `pe-`                      |
| API client security       | ✅ **PASS**          | `credentials: 'include'`, 401 auto-refresh, `X-Tenant-Slug`  |
| Test coverage             | ⚠️ **PARTIAL**       | 13 test files covering 7 of 36 feature domains               |

---

## Table of Contents

1. [Category 1 — Page Components](#1-page-components)
2. [Category 2 — Hooks](#2-hooks)
3. [Category 3 — Stores](#3-stores)
4. [Category 4 — Router](#4-router)
5. [Category 5 — Sidebar Config](#5-sidebar-config)
6. [Category 6 — App.tsx & main.tsx](#6-apptsx--maintsx)
7. [Category 7 — Layouts](#7-layouts)
8. [Category 8 — API Client](#8-api-client)
9. [Category 9 — Styles](#9-styles)
10. [Cross-Cutting: RTL / Logical CSS](#10-cross-cutting-rtl--logical-css)
11. [Cross-Cutting: Toast Imports](#11-cross-cutting-toast-imports)
12. [Cross-Cutting: Type Safety](#12-cross-cutting-type-safety)
13. [Test Inventory](#13-test-inventory)
14. [Full Violation Registry](#14-full-violation-registry)
15. [Remediation Roadmap](#15-remediation-roadmap)

---

## 1. Page Components

### 1.1 Loading States — `TableSkeleton`

Every list page checked follows the pattern:

```tsx
if (isLoading) return <TableSkeleton columns={N} rows={M} />;
```

`TableSkeleton` (`components/TableSkeleton.tsx`, 35 lines) renders a configurable skeleton grid using `<Skeleton>` from `@dento/ui`. Default: 5 columns × 5 rows.

**Grep result**: `TableSkeleton` appears in **30+ page files** across all feature domains.

### 1.2 Error States — `ErrorState`

```tsx
if (isError) return <ErrorState message="..." onRetry={() => refetch()} />;
```

`ErrorState` (`components/ErrorState.tsx`, 36 lines) shows an `AlertTriangle` icon, a message, and an optional retry `<Button>` with `RefreshCw` icon.

**Grep result**: `ErrorState` appears in **30+ page files**.

### 1.3 Empty States — `EmptyState`

```tsx
if (items.length === 0) return <EmptyState icon={X} title="..." description="..." />;
```

`EmptyState` is imported from `@dento/ui`.

**Grep result**: `EmptyState` appears in **25+ page files**.

### 1.4 Pattern Compliance Summary

All list pages consistently implement the three-state guard:

```
Loading → TableSkeleton
Error   → ErrorState (with retry)
Empty   → EmptyState (with icon + CTA)
Data    → Table / Cards
```

**Verdict**: ✅ **PASS** across all list and hub pages.

---

## 2. Hooks

### 2.1 File Inventory

36 feature hook files + 2 global hooks + 1 chat hook = **39 total hook files**.

| Domain              | Hook File                    | Lines         | Query Keys | Queries | Mutations |
| ------------------- | ---------------------------- | ------------- | ---------- | ------- | --------- |
| Appointments        | `useAppointments.ts`         | ~225          | ✅         | 4       | 4         |
| Appointment Types   | `useAppointmentTypes.ts`     | ~130          | ✅         | 2       | 3         |
| Branches            | `useBranches.ts`             | ~147          | ✅         | 2       | 4         |
| CBCT                | `useCbct.ts`                 | ~150          | ✅         | 2       | 3         |
| Commissions         | `useCommissions.ts`          | ~200          | ✅         | 4       | 4         |
| Consent Forms       | `useConsentForms.ts`         | ~135          | ✅         | 2       | 3         |
| Dashboard           | `useDashboard.ts`            | ~88           | ✅         | 4       | 0         |
| Dental Charts       | `useDentalCharts.ts`         | ~163          | ✅         | 3       | 3         |
| Doctors             | `useDoctors.ts`              | ~109          | ✅         | 2       | 3         |
| Installments        | `useInstallments.ts`         | ~190          | ✅         | 4       | 4         |
| Insurance           | `useInsurance.ts`            | ~260          | ✅         | 6       | 5         |
| Inventory (6 files) | `useInventoryItems.ts`, etc. | ~962 combined | ✅         | 14      | 18        |
| Invoices            | `useInvoices.ts`             | ~175          | ✅         | 4       | 3         |
| Lab Orders          | `useLabOrders.ts`            | ~170          | ✅         | 3       | 5         |
| Medical History     | `useMedicalHistory.ts`       | ~60           | ✅         | 1       | 1         |
| Medications         | `useMedications.ts`          | ~110          | ✅         | 2       | 3         |
| Notifications       | `useNotifications.ts`        | ~135          | ✅         | 3       | 3         |
| Online Booking      | `useOnlineBooking.ts`        | ~172          | ✅         | 3       | 4         |
| Patients            | `usePatients.ts`             | ~220          | ✅         | 4       | 2         |
| Payments            | `usePayments.ts`             | ~175          | ✅         | 4       | 3         |
| Prescriptions       | `usePrescriptions.ts`        | ~128          | ✅         | 3       | 2         |
| Procedure Notes     | `useProcedureNotes.ts`       | ~130          | ✅         | 2       | 3         |
| Recalls             | `useRecalls.ts`              | ~150          | ✅         | 3       | 4         |
| Reports             | `useReports.ts`              | ~265          | ✅         | 8       | 3         |
| Roles               | `useRoles.ts`                | ~105          | ✅         | 2       | 3         |
| Settings            | `useSettings.ts`             | ~86           | ✅         | 2       | 2         |
| Settings — Sessions | `useAdminSessions.ts`        | ~90           | ⚠️         | 1       | 2         |
| Treatment Plans     | `useTreatmentPlans.ts`       | ~135          | ✅         | 3       | 3         |
| Users               | `useUsers.ts`                | ~140          | ✅         | 2       | 5         |
| Waitlist            | `useWaitlist.ts`             | ~130          | ✅         | 2       | 4         |
| Working Hours       | `useWorkingHours.ts`         | ~170          | ✅         | 5       | 3         |
| X-rays              | `useXrays.ts`                | ~145          | ✅         | 2       | 3         |
| **Global**          | `useBrandingTheme.ts`        | ~80           | ✅         | 1       | 0         |
| **Global**          | `useSupportSession.ts`       | ~40           | ✅         | 1       | 0         |
| **Chat**            | `useChat.ts`                 | 270           | ✅         | 3       | 5         |

### 2.2 Envelope Typing

All hooks use typed generics on `apiClient` calls:

```ts
apiClient.get<ResponseType>('/api/route', { params });
```

Every hook defines explicit response interfaces (e.g., `InvoiceListResponse`, `PatientResponse`) and uses `select` to unwrap the envelope at the query layer, exposing clean data to components.

**Verdict**: ✅ **PASS** — consistent `apiClient.get<T>()` envelope typing across all 39 hook files.

### 2.3 PaginationMeta Import

**Rule**: `PaginationMeta` must be imported from `@/lib/types.js`, never defined locally.

**Grep result** (`import.*PaginationMeta`): 61 matches — all import from `@/lib/types.js`.

**Exception found**: `features/settings/hooks/useAdminSessions.ts` line 16:

```ts
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

This is a **local redefinition** instead of `import type { PaginationMeta } from '@/lib/types.js'`.

**Verdict**: ⚠️ **1 VIOLATION** — `useAdminSessions.ts` must delete the local interface and add the import.

### 2.4 Query Key Factory Pattern

All hooks follow the query-key-factory pattern:

```ts
export const entityKeys = {
  all: ['entity'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  list: (filters) => [...entityKeys.lists(), filters] as const,
  details: () => [...entityKeys.all, 'detail'] as const,
  detail: (id) => [...entityKeys.details(), id] as const,
};
```

**Verdict**: ✅ **PASS** — 100% consistent adoption.

---

## 3. Stores

### 3.1 File Inventory (7 stores)

| Store                | File                  | Persistence              | Size       |
| -------------------- | --------------------- | ------------------------ | ---------- |
| `useAuthStore`       | `auth.store.ts`       | **None (memory)** ✅     | ~58 lines  |
| `useBrandingStore`   | `branding.store.ts`   | `persist` → localStorage | ~51 lines  |
| `useChatStore`       | `chat.store.ts`       | **None (memory)**        | ~43 lines  |
| `useLocaleStore`     | `locale.store.ts`     | `persist` → localStorage | ~125 lines |
| `useOnboardingStore` | `onboarding.store.ts` | **None (memory)**        | ~50 lines  |
| `useSidebarStore`    | `sidebar.store.ts`    | **None (memory)**        | ~30 lines  |
| `useThemeStore`      | `theme.store.ts`      | `persist` → localStorage | ~28 lines  |

### 3.2 Auth Store — Security

- **Memory-only**: No `persist` middleware, no localStorage. ✅
- Stores: `user`, `accessToken`, `isAuthenticated`, `tenantSlug`
- Actions: `login()`, `logout()`, `setAccessToken()`, `setTenantSlug()`
- `logout()` clears all state to `null`/`false`. ✅

### 3.3 Locale Store — i18n

- Exposes `t(key, params?)` function for translations
- `loadTranslations()` dynamically imports JSON bundles
- Sets `document.documentElement.dir` to `'rtl'`/`'ltr'` on locale change ✅
- Sets `document.documentElement.lang` to `'ar'`/`'en'` ✅

### 3.4 Branding Store

- Stores: `logoUrl`, `logoDarkUrl`, `clinicName`, `primaryColor`
- Used by `useBrandingTheme` hook to inject `--color-brand-*` CSS vars dynamically

**Verdict**: ✅ **PASS** — all stores are well-structured, auth is security-compliant.

---

## 4. Router

### 4.1 Structure

`router.tsx` (~230 lines) uses `createBrowserRouter` from React Router v6.

```
/ (root)
├── GuestRoute → AuthLayout
│   ├── /login
│   ├── /forgot-password
│   └── /reset-password
├── ProtectedRoute → DashboardLayout
│   ├── / (Dashboard)
│   ├── /patients, /patients/:id, /patients/new
│   ├── /appointments, /appointments/:id
│   ├── /appointment-types, /appointment-types/new, /appointment-types/:id
│   ├── /waitlist
│   ├── /treatments, /treatments/:id
│   ├── /dental-chart/:patientId
│   ├── /prescriptions, /prescriptions/:id
│   ├── /medications
│   ├── /cbct, /cbct/:id
│   ├── /xrays, /xrays/:id
│   ├── /procedure-notes, /procedure-notes/:id
│   ├── /consent-forms, /consent-forms/:id
│   ├── /lab, /lab/:id, /lab/new
│   ├── /billing (invoices, payments, installments, commissions, insurance)
│   ├── /inventory (items, stock, purchase-orders, suppliers, transfers, counts, expiry)
│   ├── /reports (hub, financial, saved, scheduled)
│   ├── /notifications
│   ├── /recalls
│   ├── /online-booking
│   ├── /settings (general, users, roles, branches, hours, sessions)
│   └── /onboarding
└── * → Navigate to /
```

### 4.2 Route Guards

- **`ProtectedRoute`** (`components/ProtectedRoute.tsx`): checks `isAuthenticated` from `useAuthStore`, redirects to `/login` with `location` state for post-login redirect. ✅
- **`GuestRoute`**: redirects authenticated users to `/`. ✅

### 4.3 Fallback

`path: '*'` → `<Navigate to="/" replace />` ✅

**Verdict**: ✅ **PASS** — 80+ routes, proper guards, comprehensive fallback.

---

## 5. Sidebar Config

### 5.1 Sidebar Items

`layouts/Sidebar/sidebar-config.ts` (322 lines) defines **40+ sidebar items** across 6 groups:

| Group          | Items                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview       | Dashboard                                                                                                                                                                               |
| Clinical       | Patients, Appointments, Appt Types, Waitlist, Treatments, Dental Chart, Prescriptions, Medications, Imaging (CBCT, X-rays), Procedure Notes, Consent Forms, Lab Orders, Medical History |
| Financial      | Invoices, Payments, Commissions, Installments                                                                                                                                           |
| Insurance      | Companies, Claims                                                                                                                                                                       |
| Inventory      | Items, Stock Levels, Purchase Orders, Suppliers, Stock Transfers, Stock Counts, Expiry                                                                                                  |
| Operations     | Reports, Notifications, Recalls, Online Booking                                                                                                                                         |
| Administration | Settings, Users, Roles, Branches, Working Hours, Sessions                                                                                                                               |

### 5.2 RBAC Filtering

`sidebar-permissions.ts` (155 lines) defines `ROLE_VISIBLE_MODULES` for **8 roles**:

- `super_admin` — all modules
- `owner` — all modules
- `branch_manager` — clinical + financial + inventory + operations
- `dentist` — clinical only
- `hygienist` — clinical subset
- `assistant` — clinical subset
- `receptionist` — appointments, patients, billing
- `accountant` — financial + reports

The sidebar dynamically filters items based on the user's role.

**Verdict**: ✅ **PASS** — comprehensive RBAC-filtered navigation.

---

## 6. App.tsx & main.tsx

### 6.1 App.tsx (49 lines)

```tsx
<QueryClientProvider client={queryClient}>
  <Sentry.ErrorBoundary fallback={ErrorFallback}>
    <RouterProvider router={router} />
    <Toaster richColors position="top-right" />
  </Sentry.ErrorBoundary>
</QueryClientProvider>
```

- **QueryClient config**: `staleTime: 5 * 60 * 1000` (5 min), `retry: 1`, `refetchOnWindowFocus: false`
- **Sentry ErrorBoundary**: wraps entire router ✅
- **Toaster**: imported from `@dento/ui` ✅

**Known limitation**: `position="top-right"` is physical. A TODO comment notes Sonner has no logical position API (`top-end`).

### 6.2 main.tsx (14 lines)

```tsx
initSentry(); // Initializes Sentry BEFORE React renders ✅
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**Verdict**: ✅ **PASS** — proper initialization order, error boundary, strict mode.

---

## 7. Layouts

### 7.1 DashboardLayout

Structure:

```
SidebarProvider
├── AppSidebar
├── main
│   ├── AppHeader
│   ├── SupportSessionBanner
│   └── Outlet (page content)
└── ChatPanel
```

Calls `useBrandingTheme()` to inject tenant color vars. ✅

### 7.2 AuthLayout

Simple `<Outlet />` pass-through. ✅

### 7.3 Header (`AppHeader.tsx`, 256 lines)

- Search input uses `start-3.5`, `ps-10`, `pe-4` (logical) ✅
- Notification badge uses `end-1.5` (logical) ✅
- Dropdown uses `end-0` (logical) ✅
- User menu uses `ps-1.5`, `pe-3`, `text-start` (logical) ✅

### 7.4 Sidebar (`AppSidebar.tsx`, 270 lines)

- Uses `start-0`, `border-e` (logical) ✅
- Uses `text-start` (logical) ✅
- Uses `ps-11` for submenu indent (logical) ✅
- `translate-x-full` / `-translate-x-full` for mobile animation — **known Tailwind limitation** (no logical `translate` API exists)

### 7.5 ChatPanel (129 lines)

- Uses `end-0`, `border-s`, `end-2` (logical) ✅
- Proper data flow: ChannelList → ChatView + ChatInput
- Marks channel read on selection ✅

### 7.6 SupportSessionBanner

Yellow warning banner when a support engineer is assisting. Uses standard utility classes. ✅

### 7.7 Shared Components

| Component         | Lines | Purpose                     | Compliance       |
| ----------------- | ----- | --------------------------- | ---------------- |
| `ErrorState`      | 36    | Error display + retry       | ✅ No violations |
| `TableSkeleton`   | 35    | Loading skeleton grid       | ✅ No violations |
| `ProtectedRoute`  | 34    | Auth guard + guest redirect | ✅ No violations |
| `T`               | 63    | Translation `<T k="..." />` | ✅ No violations |
| `LocaleToggle`    | 53    | EN/AR switch, uses `-end-1` | ✅ Logical CSS   |
| `PatientCombobox` | 56    | Patient selector            | ✅ No violations |
| `BranchCombobox`  | 53    | Branch selector             | ✅ No violations |
| `InvoiceCombobox` | 52    | Invoice selector            | ✅ No violations |

**Verdict**: ✅ **PASS** — all layout files and shared components use logical CSS properties.

---

## 8. API Client

### 8.1 `lib/api-client.ts` (175 lines)

```ts
class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  // Every request includes:
  headers['X-Tenant-Slug']         // Multi-tenant identification
  credentials: 'include'           // HttpOnly refresh-token cookie

  // Methods — all generic <T>:
  get<T>(url, options?)
  post<T>(url, body?, options?)
  put<T>(url, body?, options?)
  patch<T>(url, body?, options?)
  delete<T>(url, options?)
}
```

### 8.2 Security Features

| Feature                   | Status                                                               |
| ------------------------- | -------------------------------------------------------------------- |
| `credentials: 'include'`  | ✅ Refresh-token cookie                                              |
| `X-Tenant-Slug` header    | ✅ Multi-tenant isolation                                            |
| 401 auto-refresh          | ✅ With deduplication via `isRefreshing` flag                        |
| Token refresh endpoint    | ✅ `POST /api/auth/refresh`                                          |
| Logout on refresh failure | ✅ Calls `useAuthStore.getState().logout()`                          |
| `ApiError` class          | ✅ Structured error with `statusCode`, `error`, `message`, `details` |

### 8.3 Type Support

`lib/types.ts` (24 lines):

```ts
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}
```

**Verdict**: ✅ **PASS** — secure, type-safe, multi-tenant-aware API client.

---

## 9. Styles

### 9.1 `styles/globals.css`

```css
@import '@dento/ui/globals.css';

@theme {
  --color-brand-50: oklch(0.97 0.014 155);
  --color-brand-100: oklch(0.94 0.035 155);
  /* ... full 50–950 scale in Oklch ... */
  --color-brand-950: oklch(0.17 0.04 155);
}
```

- Imports `@dento/ui` base styles ✅
- Uses Tailwind CSS v4 `@theme` directive ✅
- Green brand color scale in Oklch color space ✅
- Colors are overridden at runtime by `useBrandingTheme` per tenant ✅

**Verdict**: ✅ **PASS**.

---

## 10. Cross-Cutting: RTL / Logical CSS

### 10.1 Methodology

Two grep passes were performed:

1. **Inline styles**: `margin-left|margin-right|padding-left|padding-right|text-align:\s*(left|right)|float:\s*(left|right)` → **0 matches** ✅
2. **Tailwind classes**: `mr-|ml-|pl-|pr-|left-|right-|text-left|text-right|border-l-|border-r-|rounded-l-|rounded-r-` → **79 matches**

### 10.2 Violation Breakdown

| Class Pattern               | Count | Files                                                                                                                                                                                                                                     |
| --------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mr-` (icon spacing)        | ~35   | CbctListPage, XrayListPage, PrescriptionListPage, TreatmentPlanDetailPage, DentalChartPage, MedicationListPage, ProcedureNotesPage, BulkNotificationModal, ImagingLinker, ImagingTimeline, SessionsTab, TreatmentPlanPDF, PrescriptionPDF |
| `ml-` (badge spacing)       | ~6    | ImagingTimeline, ImagingLinker, FileUploader, ProcedureNotesPage                                                                                                                                                                          |
| `pl-` (input/list indent)   | ~6    | CbctListPage, XrayListPage, PrescriptionListPage, MedicationListPage, ConsentFormTemplate, ImagingTimeline                                                                                                                                |
| `left-` (icon positioning)  | ~5    | CbctListPage, XrayListPage, PrescriptionListPage, MedicationListPage, ImagingTimeline                                                                                                                                                     |
| `text-left` / `text-right`  | ~15   | PrescriptionTemplate, TreatmentPlanTemplate, InvoiceTemplate, ConsentFormTemplate, LabOrderTemplate, BulkNotificationModal                                                                                                                |
| `border-l-`                 | ~2    | ImagingTimeline                                                                                                                                                                                                                           |
| `rounded-l-` / `rounded-r-` | 0     | —                                                                                                                                                                                                                                         |
| `border-r-`                 | 0     | —                                                                                                                                                                                                                                         |

### 10.3 Mitigation Notes

- **Document templates** (InvoiceTemplate, PrescriptionTemplate, TreatmentPlanTemplate, ConsentFormTemplate, LabOrderTemplate) account for **~20 of the 79 violations**. These are print/PDF templates that may intentionally use physical properties for fixed-layout documents.
- **`translate-x-full`** in Sidebar.tsx and AppSidebar.tsx (2 occurrences) has no logical CSS equivalent in Tailwind — this is a framework limitation.
- **Toaster `position="top-right"`** — Sonner library limitation; no `top-end` option exists.

### 10.4 Required Fixes (Auto-replaceable)

| Physical Class | Logical Replacement |
| -------------- | ------------------- |
| `mr-N`         | `me-N`              |
| `ml-N`         | `ms-N`              |
| `pl-N`         | `ps-N`              |
| `pr-N`         | `pe-N`              |
| `left-N`       | `start-N`           |
| `right-N`      | `end-N`             |
| `text-left`    | `text-start`        |
| `text-right`   | `text-end`          |
| `border-l-N`   | `border-s-N`        |
| `border-r-N`   | `border-e-N`        |

**Verdict**: ❌ **79 VIOLATIONS** requiring remediation (minus ~20 intentional print-template exceptions = **~59 actionable**).

---

## 11. Cross-Cutting: Toast Imports

### 11.1 Rule

All toast usage must import from `@dento/ui`, never directly from `sonner`.

### 11.2 Results

| Search                              | Matches   |
| ----------------------------------- | --------- |
| `from 'sonner'`                     | **0** ✅  |
| `import.*toast.*from` → `@dento/ui` | **15** ✅ |

### 11.3 Files Using Toast

| File                           | Usage                   |
| ------------------------------ | ----------------------- |
| `App.tsx`                      | `<Toaster>` component   |
| `useAdminSessions.ts`          | Success/error on revoke |
| `MedicalHistoryForm.tsx`       | Save success/error      |
| `SavedReportsPage.tsx`         | Delete success          |
| `ExportReportDialog.tsx`       | Export success          |
| `RecordPaymentPage.tsx`        | Record success          |
| `InvoiceFormPage.tsx`          | Create/update success   |
| `InventoryFormPage.tsx`        | Save success            |
| `InsuranceCompanyFormPage.tsx` | Save success            |
| `PurchaseOrderFormPage.tsx`    | Save success            |
| `StockCountFormPage.tsx`       | Save success            |
| `StockTransferFormPage.tsx`    | Save success            |
| `SupplierFormPage.tsx`         | Save success            |
| `CreateClaimPage.tsx`          | Submit success          |
| `ExpiryDashboard.tsx`          | Action success          |

**Verdict**: ✅ **PASS** — zero violations.

---

## 12. Cross-Cutting: Type Safety

### 12.1 PaginationMeta

**Canonical definition**: `lib/types.ts` line 11

```ts
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

**Violation**: `features/settings/hooks/useAdminSessions.ts` line 16 redefines an identical interface locally.

**Fix**:

```diff
+ import type { PaginationMeta } from '@/lib/types.js';
- interface PaginationMeta { ... }
```

### 12.2 ApiSuccessResponse / PaginatedData

Both are exported from `lib/types.ts` and used across multiple hooks. No violations found.

**Verdict**: ⚠️ **1 VIOLATION** — `useAdminSessions.ts` local PaginationMeta.

---

## 13. Test Inventory

### 13.1 Test Infrastructure

| File                             | Purpose                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| `test/setup.ts` (8 lines)        | Imports `@testing-library/jest-dom/vitest`, auto cleanup                   |
| `test/test-utils.tsx` (54 lines) | `createWrapper()`, `renderWithProviders()` with QueryClient + MemoryRouter |
| `vitest.config.ts`               | Vitest configuration                                                       |

### 13.2 Test Files (13 total)

#### Hook Tests (7 files)

| File                       | Lines | Tests                                                                                                               | What's Covered |
| -------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------- | -------------- |
| `useCommissions.test.ts`   | 178   | Query keys, list/summary/detail queries, approve/bulk-approve mutations, payout queries/mutations                   |
| `useInstallments.test.ts`  | 160   | Query keys, list/detail queries, overdue query, create/record-payment/cancel/waive mutations                        |
| `useInsurance.test.ts`     | 197   | Company + claim query keys, list/detail queries, create/deactivate company, create claim/update status/aging report |
| `useInvoices.test.ts`      | 158   | Query keys, list/detail/stats queries, create/issue/cancel mutations                                                |
| `usePayments.test.ts`      | 160   | Payment + reconciliation query keys, list/detail queries, create/refund mutations, open reconciliation              |
| `useReports.test.ts`       | 235   | Query keys, dashboard stats/trends, financial report, schedule CRUD, report history, saved reports, export          |
| `useAdminSessions.test.ts` | 120   | Session list query, revoke single, revoke all; mocks `toast` from `@dento/ui`                                       |

#### Page Tests (6 files)

All page tests follow an identical 4-assertion pattern:

| File                           | Tests                                                                |
| ------------------------------ | -------------------------------------------------------------------- |
| `CommissionsPage.test.tsx`     | Loading skeleton, error state, empty state, data rendering           |
| `InstallmentListPage.test.tsx` | Loading skeleton, error state, empty state, data rendering           |
| `InsuranceClaimsPage.test.tsx` | Loading skeleton, error state, empty state, data rendering           |
| `InvoiceListPage.test.tsx`     | Loading skeleton, error state, empty state, data rendering           |
| `PaymentsPage.test.tsx`        | Loading skeleton, error state, empty state, data rendering           |
| `ReportsHubPage.test.tsx`      | Loading state, report category cards, fallback when data unavailable |

### 13.3 Coverage Gaps

Features **without tests** (29 of 36 feature domains):

```
appointments, appointment-types, branches, cbct, consent-forms, dashboard,
dental-charts, doctors, imaging, inventory (all 6 sub-domains), lab,
medical-history, medications, notifications, online-booking, patients,
prescriptions, procedure-notes, recalls, roles, settings (general),
treatment-plans, users, waitlist, working-hours, xrays
```

**Verdict**: ⚠️ **PARTIAL** — 7 of 36 feature domains have tests (19% coverage by domain). All existing tests are well-structured and follow consistent patterns.

---

## 14. Full Violation Registry

### 14.1 Must-Fix

| #   | File                                          | Line | Violation                        | Fix                          |
| --- | --------------------------------------------- | ---- | -------------------------------- | ---------------------------- |
| 1   | `features/settings/hooks/useAdminSessions.ts` | 16   | Local `PaginationMeta` interface | Import from `@/lib/types.js` |

### 14.2 RTL Physical Class Violations (79 total)

> **Note**: ~20 are in print/PDF templates and may be intentional. The remaining ~59 are in interactive pages and must be fixed.

| File                          | Approx. Violations | Classes Used                                   |
| ----------------------------- | ------------------ | ---------------------------------------------- |
| `CbctListPage.tsx`            | 4                  | `mr-2`, `pl-10`, `left-3`                      |
| `XrayListPage.tsx`            | 4                  | `mr-2`, `pl-10`, `left-3`                      |
| `PrescriptionListPage.tsx`    | 4                  | `mr-2`, `pl-10`, `left-3`                      |
| `MedicationListPage.tsx`      | 4                  | `mr-2`, `pl-10`, `left-3`                      |
| `TreatmentPlanDetailPage.tsx` | 3                  | `mr-2`                                         |
| `DentalChartPage.tsx`         | 4                  | `mr-2`, `mr-1`                                 |
| `ProcedureNotesPage.tsx`      | 4                  | `mr-2`, `ml-2`                                 |
| `BulkNotificationModal.tsx`   | 3                  | `mr-2`, `text-left`                            |
| `ImagingLinker.tsx`           | 4                  | `mr-2`, `ml-1`                                 |
| `ImagingTimeline.tsx`         | 8                  | `mr-2`, `ml-4`, `pl-4`, `border-l-2`, `left-0` |
| `SessionsTab.tsx`             | 2                  | `mr-2`                                         |
| `TreatmentPlanPDF.tsx`        | 3                  | `mr-2`, `text-right`                           |
| `PrescriptionPDF.tsx`         | 3                  | `mr-2`, `text-right`                           |
| `FileUploader.tsx`            | 2                  | `ml-2`                                         |
| `PrescriptionTemplate.tsx`    | ~5                 | `text-left`, `text-right`                      |
| `TreatmentPlanTemplate.tsx`   | ~4                 | `text-left`, `text-right`                      |
| `InvoiceTemplate.tsx`         | ~5                 | `text-left`, `text-right`                      |
| `ConsentFormTemplate.tsx`     | ~4                 | `text-left`, `pl-6`                            |
| `LabOrderTemplate.tsx`        | ~3                 | `text-left`, `text-right`                      |

### 14.3 Known Limitations (No Fix Available)

| Item                                                  | Reason                                       |
| ----------------------------------------------------- | -------------------------------------------- |
| `Toaster position="top-right"` in `App.tsx`           | Sonner library has no `top-end` option       |
| `translate-x-full` in `Sidebar.tsx`, `AppSidebar.tsx` | Tailwind has no logical `translateX` utility |

---

## 15. Remediation Roadmap

### Priority 1 — Immediate (1 line change)

- [ ] **`useAdminSessions.ts`**: Replace local `PaginationMeta` with import from `@/lib/types.js`

### Priority 2 — Short Term (RTL compliance)

- [ ] Batch-replace ~59 physical Tailwind classes in interactive page components:
  - `mr-N` → `me-N`
  - `ml-N` → `ms-N`
  - `pl-N` → `ps-N`
  - `left-N` → `start-N`
  - `text-left` → `text-start`
  - `text-right` → `text-end`
  - `border-l-N` → `border-s-N`

### Priority 3 — Medium Term

- [ ] Review print/PDF template files — decide if physical properties are intentional for fixed-layout documents or should also be replaced
- [ ] Expand test coverage from 7/36 domains to at minimum cover all financial and clinical domains
- [ ] Add ESLint rule (or Tailwind plugin) to flag physical classes in CI

### Priority 4 — Long Term / Upstream

- [ ] Open Sonner GitHub issue requesting logical position values (`top-start`, `top-end`)
- [ ] Monitor Tailwind for logical `translate` utilities

---

## Appendix A — Component Architecture

```
App.tsx
├── QueryClientProvider (TanStack Query)
├── Sentry.ErrorBoundary
├── RouterProvider
│   ├── GuestRoute → AuthLayout → [Login, ForgotPassword, ResetPassword]
│   └── ProtectedRoute → DashboardLayout
│       ├── AppSidebar (RBAC-filtered, 40+ items)
│       ├── AppHeader (search, dark mode, notifications, user menu)
│       ├── SupportSessionBanner (conditional)
│       ├── ChatPanel (channels + messages)
│       └── Outlet → [80+ page routes]
└── Toaster (from @dento/ui)
```

## Appendix B — Technology Stack

| Layer          | Technology                                  |
| -------------- | ------------------------------------------- |
| Framework      | React 18 + Vite                             |
| Routing        | React Router v6 (`createBrowserRouter`)     |
| State (server) | TanStack React Query v5                     |
| State (client) | Zustand (7 stores)                          |
| UI Library     | `@dento/ui` (internal monorepo package)     |
| Shared Types   | `@dento/shared` (internal monorepo package) |
| CSS            | Tailwind CSS v4 (`@theme` directive, Oklch) |
| Error Tracking | `@sentry/react`                             |
| Testing        | Vitest + @testing-library/react             |
| Icons          | `lucide-react`                              |
| Monorepo       | pnpm workspaces + Turborepo                 |

## Appendix C — File Counts

| Category                      | Count |
| ----------------------------- | ----- |
| Feature domains               | 36    |
| Hook files                    | 39    |
| Store files                   | 7     |
| Page + component TSX files    | ~130  |
| Test files                    | 13    |
| Layout files                  | 10    |
| Shared component files        | 12    |
| Total `apps/admin/src/` files | ~210+ |
