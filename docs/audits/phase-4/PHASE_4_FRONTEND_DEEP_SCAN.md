# Phase 4 (Financial) Frontend — Deep Compliance Scan

> **Scan Date:** 2025-01-XX  
> **Scope:** All 52 files in `apps/admin/src/features/{invoices,payments,insurance,installments,commissions,reports}`  
> **Standards:** `docs/planning/BUILD_RULES.md` §8 (Frontend Architecture), §11 (RTL/Bidirectional), §15 (Loading/Error/Empty States)

---

## Executive Summary

| Metric                   | Value                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Total files scanned      | **52**                                                                                                                   |
| Features covered         | Invoices (7), Payments (8), Insurance (9), Installments (5), Commissions (8), Reports (15)                               |
| **Critical violations**  | **6** — All form schemas defined locally instead of importing from `@dento/shared`                                       |
| **RTL violations**       | **88** instances of physical CSS properties (`mr-`, `ml-`, `pl-`, `pr-`, `left-`, `text-left`, `text-right`, `border-l`) |
| TODO/FIXME/HACK comments | **0**                                                                                                                    |
| Forms without RHF+Zod    | **3** small dialogs use `useState`                                                                                       |

### Systemic Issues (apply to ALL features except Reports)

| #   | Issue                                                                                                                                                                             | Severity    | Count         | Rule |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------- | ---- |
| S1  | Zod schemas defined locally in form components — NOT imported from `@dento/shared`                                                                                                | 🔴 Critical | 6 forms       | §8.4 |
| S2  | Physical CSS properties (`mr-`, `ml-`, `pl-`, `pr-`, `left-`, `text-left`, `text-right`) used instead of logical (`me-`, `ms-`, `ps-`, `pe-`, `start-`, `text-start`, `text-end`) | 🟡 Medium   | 88 instances  | §11  |
| S3  | Types/interfaces defined locally in hooks files — not imported from `@dento/shared`                                                                                               | 🟡 Medium   | 5 hooks files | §8.4 |
| S4  | Small dialog forms use `useState` instead of RHF                                                                                                                                  | 🟠 Low      | 3 dialogs     | §8.5 |

**Note:** `@dento/shared` already exports the needed schemas (`createInvoiceSchema`, `createPaymentSchema`, `recordInstallmentPaymentSchema`, insurance schemas, `calculateCommissionSchema`). The frontend simply doesn't import them.

---

## Per-File Compliance Matrix

### Legend

| Symbol | Meaning                          |
| ------ | -------------------------------- |
| ✅     | Compliant                        |
| ⚠️     | Partial / Minor issue            |
| ❌     | Non-compliant / Violation        |
| N/A    | Not applicable to this file type |

---

## 1. INVOICES (`features/invoices/` — 7 files)

### hooks/useInvoices.ts

| Requirement                      | Status | Notes                                                                |
| -------------------------------- | ------ | -------------------------------------------------------------------- |
| §8.3 queryKeys factory           | ✅     | `invoiceKeys` with `all/lists/list/details/detail/stats`             |
| §8.3 React Query hooks           | ✅     | `useInvoiceList`, `useInvoiceDetail`, `useInvoiceStats`, 5 mutations |
| §8.4 Types from @dento/shared    | ❌     | `InvoiceFilters`, `InvoiceLineItem`, `Invoice` defined locally       |
| §8.5 No useState for server data | ✅     | Only React Query used                                                |
| TODO/FIXME/HACK                  | ✅     | None                                                                 |

### pages/InvoiceListPage.tsx

| Requirement                      | Status | Notes                                                                       |
| -------------------------------- | ------ | --------------------------------------------------------------------------- |
| §15 Loading state                | ✅     | `TableSkeleton`                                                             |
| §15 Error state                  | ✅     | `ErrorState` with retry                                                     |
| §15 Empty state                  | ✅     | `EmptyState` with icon                                                      |
| §8.3 DataTable                   | ✅     | Column definitions, sorting                                                 |
| Filters                          | ✅     | Search, status, date range                                                  |
| CSV Export                       | ✅     | Client-side CSV generation                                                  |
| §8.5 No useState for server data | ✅     | `useState` only for filter/UI state                                         |
| §11 RTL                          | ❌     | 6× `mr-2`, 1× `left-3`, 1× `pl-9`                                           |
| Doctor filter                    | ⚠️     | Uses `Select`, not `Combobox` (should use `DoctorCombobox` for large lists) |
| TODO/FIXME/HACK                  | ✅     | None                                                                        |

### pages/InvoiceFormPage.tsx

| Requirement     | Status | Notes                                              |
| --------------- | ------ | -------------------------------------------------- |
| Architecture    | ✅     | Thin wrapper delegating to `InvoiceForm` component |
| TODO/FIXME/HACK | ✅     | None                                               |

### pages/InvoiceDetailPage.tsx

| Requirement        | Status | Notes                                      |
| ------------------ | ------ | ------------------------------------------ |
| §15 Loading state  | ✅     | Inline skeleton (animate-pulse)            |
| §15 Error state    | ✅     | `ErrorState`                               |
| §8.3 React Query   | ✅     | `useInvoiceDetail`                         |
| §11 RTL            | ❌     | 7× `mr-2`, 1× `text-left`, 4× `text-right` |
| Locale-aware dates | ✅     | Uses `formatDate` with locale              |
| TODO/FIXME/HACK    | ✅     | None                                       |

### components/InvoiceForm.tsx

| Requirement                      | Status | Notes                                                                                   |
| -------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| §8.4 RHF + Zod resolver          | ✅     | `useForm` + `zodResolver`                                                               |
| §8.4 Schema from @dento/shared   | ❌     | **`invoiceFormSchema` defined locally** — `@dento/shared` exports `createInvoiceSchema` |
| §8.4 useFieldArray               | ✅     | Dynamic line items                                                                      |
| Combobox for entities            | ✅     | `PatientCombobox`, `BranchCombobox`                                                     |
| Validation messages              | ✅     | `{errors.field?.message}` pattern                                                       |
| §8.5 No useState for server data | ✅     | All form state in RHF                                                                   |
| §11 RTL                          | ❌     | 1× `mr-1`, 3× `text-right`, 1× `mr-2`                                                   |
| TODO/FIXME/HACK                  | ✅     | None                                                                                    |

### components/InvoiceStatusBadge.tsx

| Requirement     | Status | Notes                  |
| --------------- | ------ | ---------------------- |
| Architecture    | ✅     | Clean Badge component  |
| §11 RTL         | ✅     | No physical properties |
| TODO/FIXME/HACK | ✅     | None                   |

### components/InvoicePDF.tsx

| Requirement     | Status | Notes                                                                                                |
| --------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| Architecture    | ✅     | `@react-pdf/renderer` PDFDownloadLink                                                                |
| §11 RTL         | ⚠️     | 1× `mr-2` on download button; PDF styles use physical properties (acceptable — react-pdf limitation) |
| TODO/FIXME/HACK | ✅     | None                                                                                                 |

---

## 2. PAYMENTS (`features/payments/` — 8 files)

### hooks/usePayments.ts

| Requirement                   | Status | Notes                                                              |
| ----------------------------- | ------ | ------------------------------------------------------------------ |
| §8.3 queryKeys factory        | ✅     | `paymentKeys` + `reconciliationKeys`                               |
| §8.3 React Query hooks        | ✅     | 6 hooks, cross-invalidates invoices on payment/refund              |
| §8.4 Types from @dento/shared | ❌     | `Payment`, `PaymentFilters`, `ReconciliationEntry` defined locally |
| TODO/FIXME/HACK               | ✅     | None                                                               |

### pages/PaymentsPage.tsx

| Requirement         | Status | Notes                              |
| ------------------- | ------ | ---------------------------------- |
| §15 Loading         | ✅     | `TableSkeleton`                    |
| §15 Error           | ✅     | `ErrorState`                       |
| §15 Empty           | ✅     | `EmptyState`                       |
| DataTable + Filters | ✅     | Search, status, method, date range |
| Summary cards       | ✅     | Payment totals by status           |
| §11 RTL             | ❌     | 3× `mr-2`, 1× `left-3`, 1× `pl-9`  |
| TODO/FIXME/HACK     | ✅     | None                               |

### pages/RecordPaymentPage.tsx

| Requirement     | Status | Notes        |
| --------------- | ------ | ------------ |
| Architecture    | ✅     | Thin wrapper |
| TODO/FIXME/HACK | ✅     | None         |

### pages/PaymentDetailPage.tsx

| Requirement     | Status | Notes                                              |
| --------------- | ------ | -------------------------------------------------- |
| §15 Loading     | ✅     | Skeleton                                           |
| §15 Error       | ✅     | `ErrorState`                                       |
| §8.5 useState   | ⚠️     | `useState` for refund reason (small inline dialog) |
| §11 RTL         | ❌     | 2× `mr-2`                                          |
| TODO/FIXME/HACK | ✅     | None                                               |

### pages/ReconciliationPage.tsx

| Requirement             | Status | Notes            |
| ----------------------- | ------ | ---------------- |
| §15 Loading/Error/Empty | ✅     | All three states |
| Combobox                | ✅     | `BranchCombobox` |
| §11 RTL                 | ❌     | 3× `mr-2`        |
| TODO/FIXME/HACK         | ✅     | None             |

### components/PaymentForm.tsx

| Requirement                    | Status | Notes                                                                                   |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------- |
| §8.4 RHF + Zod                 | ✅     | `useForm` + `zodResolver`                                                               |
| §8.4 Schema from @dento/shared | ❌     | **`paymentFormSchema` defined locally** — `@dento/shared` exports `createPaymentSchema` |
| Combobox                       | ✅     | `InvoiceCombobox`                                                                       |
| PaymentMethodSelector          | ✅     | Custom selector component                                                               |
| Validation messages            | ✅     | Error messages displayed                                                                |
| §11 RTL                        | ❌     | 1× `mr-2`                                                                               |
| TODO/FIXME/HACK                | ✅     | None                                                                                    |

### components/PaymentMethodSelector.tsx

| Requirement     | Status | Notes                              |
| --------------- | ------ | ---------------------------------- |
| Architecture    | ✅     | Clean Select component with config |
| §11 RTL         | ✅     | No physical properties             |
| TODO/FIXME/HACK | ✅     | None                               |

### components/PaymentReceipt.tsx

| Requirement     | Status | Notes                         |
| --------------- | ------ | ----------------------------- |
| Architecture    | ✅     | `@react-pdf/renderer` receipt |
| §11 RTL         | ⚠️     | 1× `mr-2` on download button  |
| TODO/FIXME/HACK | ✅     | None                          |

---

## 3. INSURANCE (`features/insurance/` — 9 files)

### hooks/useInsurance.ts

| Requirement                   | Status | Notes                                                              |
| ----------------------------- | ------ | ------------------------------------------------------------------ |
| §8.3 queryKeys factory        | ✅     | `insuranceCompanyKeys` + `insuranceClaimKeys` (includes `aging()`) |
| §8.3 React Query hooks        | ✅     | Full CRUD + file upload/remove mutations                           |
| §8.4 Types from @dento/shared | ❌     | Types defined locally                                              |
| TODO/FIXME/HACK               | ✅     | None                                                               |

### pages/InsuranceClaimsPage.tsx

| Requirement             | Status | Notes                      |
| ----------------------- | ------ | -------------------------- |
| §15 Loading/Error/Empty | ✅     | All three states           |
| DataTable + Filters     | ✅     | Search, status, date range |
| CSV Export              | ✅     | Client-side                |
| §11 RTL                 | ❌     | 3× `mr-2`                  |
| TODO/FIXME/HACK         | ✅     | None                       |

### pages/InsuranceClaimDetailPage.tsx

| Requirement       | Status | Notes                               |
| ----------------- | ------ | ----------------------------------- |
| §15 Loading/Error | ✅     | Both states                         |
| Status workflow   | ✅     | Transition buttons per claim status |
| ClaimTimeline     | ✅     | Visual stepper                      |
| §11 RTL           | ❌     | 2× `mr-2`                           |
| TODO/FIXME/HACK   | ✅     | None                                |

### pages/CreateClaimPage.tsx

| Requirement                    | Status | Notes                                                                             |
| ------------------------------ | ------ | --------------------------------------------------------------------------------- |
| §8.4 RHF + Zod                 | ✅     | `useForm` + `zodResolver`                                                         |
| §8.4 Schema from @dento/shared | ❌     | **`claimFormSchema` defined locally** — `@dento/shared` exports insurance schemas |
| Combobox                       | ✅     | `PatientCombobox`, `InvoiceCombobox`                                              |
| Validation messages            | ✅     | Error messages displayed                                                          |
| §11 RTL                        | ❌     | 1× `mr-2`                                                                         |
| TODO/FIXME/HACK                | ✅     | None                                                                              |

### pages/InsuranceCompaniesPage.tsx

| Requirement             | Status | Notes                                        |
| ----------------------- | ------ | -------------------------------------------- |
| §15 Loading/Error/Empty | ✅     | All three states                             |
| DataTable               | ✅     | With search                                  |
| CSV Export              | ✅     | Client-side                                  |
| RTL awareness           | ✅     | `dir="rtl"` on Arabic name span              |
| §11 RTL                 | ❌     | 1× `ml-2`, 4× `mr-2`, 1× `left-3`, 1× `pl-9` |
| TODO/FIXME/HACK         | ✅     | None                                         |

### pages/InsuranceCompanyDetailPage.tsx

| Requirement       | Status | Notes                      |
| ----------------- | ------ | -------------------------- |
| §15 Loading/Error | ✅     | Both states                |
| RTL awareness     | ✅     | `dir="rtl"` on Arabic name |
| §11 RTL           | ❌     | 2× `mr-2`                  |
| TODO/FIXME/HACK   | ✅     | None                       |

### pages/InsuranceCompanyFormPage.tsx

| Requirement                    | Status | Notes                                   |
| ------------------------------ | ------ | --------------------------------------- |
| §8.4 RHF + Zod                 | ✅     | `useForm` + `zodResolver`               |
| §8.4 Schema from @dento/shared | ❌     | **`companyFormSchema` defined locally** |
| Bilingual fields               | ✅     | `name.en` + `name.ar` inputs            |
| RTL awareness                  | ✅     | `dir="rtl"` on Arabic input             |
| Validation messages            | ✅     | Error messages displayed                |
| §11 RTL                        | ❌     | 1× `mr-2`                               |
| TODO/FIXME/HACK                | ✅     | None                                    |

### components/ClaimTimeline.tsx

| Requirement     | Status | Notes                  |
| --------------- | ------ | ---------------------- |
| Architecture    | ✅     | Clean visual stepper   |
| §11 RTL         | ✅     | No physical properties |
| TODO/FIXME/HACK | ✅     | None                   |

### components/ClaimStatusBadge.tsx

| Requirement     | Status | Notes                  |
| --------------- | ------ | ---------------------- |
| Architecture    | ✅     | Clean Badge component  |
| §11 RTL         | ✅     | No physical properties |
| TODO/FIXME/HACK | ✅     | None                   |

---

## 4. INSTALLMENTS (`features/installments/` — 5 files)

### hooks/useInstallments.ts

| Requirement                   | Status | Notes                                    |
| ----------------------------- | ------ | ---------------------------------------- |
| §8.3 queryKeys factory        | ✅     | `installmentKeys` (includes `overdue()`) |
| §8.3 React Query hooks        | ✅     | record, cancel, waive, overdue           |
| §8.4 Types from @dento/shared | ❌     | Types defined locally                    |
| TODO/FIXME/HACK               | ✅     | None                                     |

### pages/InstallmentListPage.tsx

| Requirement             | Status | Notes                             |
| ----------------------- | ------ | --------------------------------- |
| §15 Loading/Error/Empty | ✅     | All three states                  |
| DataTable + Filters     | ✅     | Search, status, date range        |
| CSV Export              | ✅     | Client-side                       |
| §11 RTL                 | ❌     | 3× `mr-2`, 1× `left-3`, 1× `pl-9` |
| TODO/FIXME/HACK         | ✅     | None                              |

### pages/InstallmentFormPage.tsx

| Requirement                    | Status | Notes                                                                                                  |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------ |
| §8.4 RHF + Zod                 | ✅     | `useForm` + `zodResolver`                                                                              |
| §8.4 Schema from @dento/shared | ❌     | **`installmentFormSchema` defined locally** — `@dento/shared` exports `recordInstallmentPaymentSchema` |
| Combobox                       | ✅     | `PatientCombobox`, `InvoiceCombobox`                                                                   |
| Live calculation               | ✅     | Installment amount auto-calculated                                                                     |
| Validation messages            | ✅     | Error messages displayed                                                                               |
| §11 RTL                        | ❌     | 1× `mr-2`                                                                                              |
| TODO/FIXME/HACK                | ✅     | None                                                                                                   |

### pages/InstallmentDetailPage.tsx

| Requirement            | Status | Notes                                           |
| ---------------------- | ------ | ----------------------------------------------- |
| §15 Loading/Error      | ✅     | Both states                                     |
| Payment schedule table | ✅     | With status badges                              |
| Record/waive actions   | ✅     | Via `RecordInstallmentPaymentDialog`            |
| Progress bar           | ✅     | Visual payment progress                         |
| §11 RTL                | ❌     | 2× `mr-2`, 1× `text-left`, 5× `pr-4`, 2× `mr-1` |
| TODO/FIXME/HACK        | ✅     | None                                            |

### components/RecordInstallmentPaymentDialog.tsx

| Requirement          | Status | Notes                                        |
| -------------------- | ------ | -------------------------------------------- |
| §8.4 RHF + Zod       | ❌     | Uses `useState` for amount + notes (not RHF) |
| §8.5 Form validation | ⚠️     | Manual `canSubmit` boolean instead of Zod    |
| Quick amount buttons | ✅     | Full/Half amount shortcuts                   |
| §11 RTL              | ❌     | 1× `mr-2`                                    |
| TODO/FIXME/HACK      | ✅     | None                                         |

---

## 5. COMMISSIONS (`features/commissions/` — 8 files)

### hooks/useCommissions.ts

| Requirement                   | Status | Notes                                                                    |
| ----------------------------- | ------ | ------------------------------------------------------------------------ |
| §8.3 queryKeys factory        | ✅     | `commissionKeys` + `payoutKeys` with full hierarchy                      |
| §8.3 React Query hooks        | ✅     | list, detail, approve, bulkApprove, payouts, createPayout, processPayout |
| §8.4 Types from @dento/shared | ❌     | `DoctorCommission`, `CommissionPayout`, etc. defined locally             |
| Invalidation patterns         | ✅     | Cross-invalidates commissions ↔ payouts ↔ summary                        |
| TODO/FIXME/HACK               | ✅     | None                                                                     |

### pages/CommissionsPage.tsx

| Requirement            | Status | Notes                                            |
| ---------------------- | ------ | ------------------------------------------------ |
| §15 Loading            | ✅     | `TableSkeleton` for both tabs                    |
| §15 Error              | ✅     | `ErrorState` for both tabs                       |
| §15 Empty              | ✅     | `EmptyState` for both tabs                       |
| DataTable              | ✅     | Commissions + Payouts tab                        |
| Status filter          | ✅     | Select (correct for enum filters)                |
| CSV Export             | ✅     | Client-side                                      |
| Bulk approve           | ✅     | Approve all pending                              |
| CreatePayoutDialog     | ✅     | Payout creation                                  |
| CommissionApprovalForm | ✅     | Approval with notes                              |
| §8.5 useState          | ⚠️     | `payoutForm` object in `useState` instead of RHF |
| §11 RTL                | ❌     | 2× `mr-2`                                        |
| TODO/FIXME/HACK        | ✅     | None                                             |

### pages/CommissionDetailPage.tsx

| Requirement        | Status | Notes                                 |
| ------------------ | ------ | ------------------------------------- |
| §15 Loading        | ✅     | Inline skeleton                       |
| §15 Error          | ✅     | `ErrorState`                          |
| Locale-aware dates | ✅     | `locale === 'ar' ? 'ar-EG' : 'en-US'` |
| §11 RTL            | ❌     | 2× `mr-2`                             |
| TODO/FIXME/HACK    | ✅     | None                                  |

### components/commission-columns.tsx

| Requirement        | Status | Notes                        |
| ------------------ | ------ | ---------------------------- |
| Architecture       | ✅     | Extracted column definitions |
| Locale-aware dates | ✅     | Uses locale prop             |
| §11 RTL            | ❌     | 2× `mr-2`                    |
| TODO/FIXME/HACK    | ✅     | None                         |

### components/CreatePayoutDialog.tsx

| Requirement     | Status | Notes                                        |
| --------------- | ------ | -------------------------------------------- |
| §8.4 RHF + Zod  | ❌     | No validation — uses parent `useState` state |
| §11 RTL         | ❌     | 1× `mr-2`                                    |
| TODO/FIXME/HACK | ✅     | None                                         |

### components/CommissionSummaryCards.tsx

| Requirement     | Status | Notes                  |
| --------------- | ------ | ---------------------- |
| Architecture    | ✅     | Clean summary cards    |
| §11 RTL         | ✅     | No physical properties |
| TODO/FIXME/HACK | ✅     | None                   |

### components/CommissionApprovalForm.tsx

| Requirement     | Status | Notes                           |
| --------------- | ------ | ------------------------------- |
| §8.4 RHF + Zod  | ❌     | Uses `useState` for notes field |
| §11 RTL         | ❌     | 1× `ml-2`, 1× `mr-2`            |
| TODO/FIXME/HACK | ✅     | None                            |

### utils/commission.utils.ts

| Requirement          | Status | Notes                            |
| -------------------- | ------ | -------------------------------- |
| Architecture         | ✅     | Clean utility extraction         |
| Centralized currency | ✅     | Delegates to `@/lib/currency.js` |
| TODO/FIXME/HACK      | ✅     | None                             |

---

## 6. REPORTS (`features/reports/` — 15 files)

### hooks/useReports.ts

| Requirement                   | Status | Notes                                                                                                       |
| ----------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| §8.3 queryKeys factory        | ✅     | `reportKeys` with 11 key variants                                                                           |
| §8.3 React Query hooks        | ✅     | 15+ hooks across dashboard, categories, saved, scheduled, history, export                                   |
| §8.4 Types from @dento/shared | ✅     | **Imports `ReportQueryParams`, `IDashboardStats`, `IDashboardTrends`, `IReportSchedule`, `IReportHistory`** |
| Dynamic dispatch              | ✅     | `useReport()` dispatches to correct category hook                                                           |
| TODO/FIXME/HACK               | ✅     | None                                                                                                        |

### config/report-catalog.config.ts

| Requirement       | Status | Notes                                      |
| ----------------- | ------ | ------------------------------------------ |
| Bilingual content | ✅     | All `name`/`description` have `{ en, ar }` |
| Free/paid gating  | ✅     | `isFree` flag per report                   |
| Architecture      | ✅     | 6 categories, 32 report types              |
| TODO/FIXME/HACK   | ✅     | None                                       |

### pages/ReportsHubPage.tsx

| Requirement         | Status | Notes                       |
| ------------------- | ------ | --------------------------- |
| §15 Loading         | ✅     | `Loader2` spinner           |
| §15 Error           | ✅     | `AlertCircle` card          |
| Dashboard stats     | ✅     | Live from API with fallback |
| Category navigation | ✅     | 6 category cards            |
| Upgrade CTA         | ✅     | Advanced analytics upsell   |
| §11 RTL             | ✅     | **No physical properties**  |
| TODO/FIXME/HACK     | ✅     | None                        |

### pages/ReportDetailPage.tsx

| Requirement        | Status | Notes                                           |
| ------------------ | ------ | ----------------------------------------------- |
| §15 Loading        | ✅     | `Loader2` with `ms-3` text                      |
| §15 Error          | ✅     | Card with retry, `ms-auto`                      |
| Locked/paid gating | ✅     | Shows upgrade CTA for locked reports            |
| Filter bar         | ✅     | `ReportFilterBar`                               |
| Chart              | ✅     | `ReportChart`                                   |
| Data table         | ✅     | `ReportDataTable`                               |
| Export             | ✅     | `ExportReportDialog` + `ReportPDFDownload`      |
| §11 RTL            | ✅     | **Uses `ms-3`, `ms-auto` (logical properties)** |
| TODO/FIXME/HACK    | ✅     | None                                            |

### pages/ReportCategoryPage.tsx

| Requirement          | Status | Notes                            |
| -------------------- | ------ | -------------------------------- |
| Not-found state      | ✅     | Category not found fallback      |
| Free/paid separation | ✅     | LiveReportCard vs locked preview |
| Upgrade CTA          | ✅     | Per-category upsell              |
| §11 RTL              | ✅     | **Uses `me-2` (logical)**        |
| TODO/FIXME/HACK      | ✅     | None                             |

### pages/ReportHistoryPage.tsx

| Requirement     | Status | Notes                                       |
| --------------- | ------ | ------------------------------------------- |
| §15 Loading     | ✅     | `Loader2` spinner                           |
| §15 Error       | ✅     | Destructive card                            |
| §15 Empty       | ✅     | History empty state                         |
| Manual table    | ✅     | Custom HTML table (not DataTable)           |
| §11 RTL         | ✅     | **Uses `text-start`, `text-end` (logical)** |
| TODO/FIXME/HACK | ✅     | None                                        |

### pages/ScheduledReportsPage.tsx

| Requirement     | Status | Notes                                |
| --------------- | ------ | ------------------------------------ |
| §15 Loading     | ✅     | `TableSkeleton`                      |
| §15 Error       | ✅     | `ErrorState`                         |
| §15 Empty       | ✅     | `EmptyState` for both tabs           |
| DataTable       | ✅     | Schedules + History tables           |
| Summary cards   | ✅     | Active, total, completed, failed     |
| CRUD            | ✅     | Pause/resume, run now, delete        |
| ConfirmDialog   | ✅     | Destructive delete confirmation      |
| §11 RTL         | ✅     | **Uses `me-2`, `ms-auto` (logical)** |
| TODO/FIXME/HACK | ✅     | None                                 |

### pages/SavedReportsPage.tsx

| Requirement     | Status | Notes                  |
| --------------- | ------ | ---------------------- |
| §15 Loading     | ✅     | `TableSkeleton`        |
| §15 Error       | ✅     | `ErrorState`           |
| §15 Empty       | ✅     | Bookmark empty state   |
| Delete action   | ✅     | With toast feedback    |
| §11 RTL         | ✅     | No physical properties |
| TODO/FIXME/HACK | ✅     | None                   |

### pages/index.ts

| Requirement  | Status | Notes            |
| ------------ | ------ | ---------------- |
| Architecture | ✅     | Clean re-exports |

### components/ReportFilterBar.tsx

| Requirement           | Status | Notes                                                        |
| --------------------- | ------ | ------------------------------------------------------------ |
| Date range            | ✅     | From/to date inputs                                          |
| Period toggle         | ✅     | Daily/weekly/monthly/quarterly/yearly                        |
| Branch/Doctor filters | ⚠️     | Plain `Input` — should use `BranchCombobox`/`DoctorCombobox` |
| §11 RTL               | ✅     | **Uses `ms-auto` (logical)**                                 |
| TODO/FIXME/HACK       | ✅     | None                                                         |

### components/ReportChart.tsx

| Requirement     | Status | Notes                             |
| --------------- | ------ | --------------------------------- |
| Recharts        | ✅     | Bar, Line, Pie                    |
| Auto-detection  | ✅     | Infers chart type from data shape |
| Empty state     | ✅     | "No chart data available"         |
| §11 RTL         | ✅     | No physical properties            |
| TODO/FIXME/HACK | ✅     | None                              |

### components/LiveReportCard.tsx

| Requirement       | Status | Notes                              |
| ----------------- | ------ | ---------------------------------- |
| Live data         | ✅     | Fetches from API via `useReport()` |
| Loading indicator | ✅     | `Loader2`                          |
| Error indicator   | ✅     | Falls back to preview              |
| Chart renderers   | ✅     | Bar + Pie                          |
| §11 RTL           | ✅     | No physical properties             |
| TODO/FIXME/HACK   | ✅     | None                               |

### components/ExportReportDialog.tsx

| Requirement      | Status | Notes                                               |
| ---------------- | ------ | --------------------------------------------------- |
| Format selection | ✅     | CSV, Excel, PDF                                     |
| Loading state    | ✅     | `Loader2` on button                                 |
| Error display    | ✅     | Error message                                       |
| Architecture     | ⚠️     | Custom overlay instead of `Dialog` from `@dento/ui` |
| §11 RTL          | ✅     | No physical properties                              |
| TODO/FIXME/HACK  | ✅     | None                                                |

### components/ReportDataTable.tsx

| Requirement          | Status | Notes                     |
| -------------------- | ------ | ------------------------- |
| Sortable columns     | ✅     | Asc/desc toggle           |
| Pagination           | ✅     | Client-side, 15 rows/page |
| Auto-derived columns | ✅     | From first row keys       |
| Empty state          | ✅     | "No table data available" |
| §11 RTL              | ✅     | No physical properties    |
| TODO/FIXME/HACK      | ✅     | None                      |

### components/ReportPDF.tsx

| Requirement         | Status | Notes                                        |
| ------------------- | ------ | -------------------------------------------- |
| @react-pdf/renderer | ✅     | Full analytics report PDF                    |
| Summary KPIs        | ✅     | In PDF                                       |
| Data table          | ✅     | In PDF                                       |
| Page numbers        | ✅     | Footer with page/total                       |
| §11 RTL             | ✅     | **Uses `me-2` (logical) on download button** |
| TODO/FIXME/HACK     | ✅     | None                                         |

---

## RTL Violation Summary by Feature

| Feature      | `mr-`/`ml-` | `pl-`/`pr-` | `left-`/`right-` | `text-left`/`text-right` | Total  | Files affected |
| ------------ | ----------- | ----------- | ---------------- | ------------------------ | ------ | -------------- |
| Invoices     | 17          | 1           | 1                | 8                        | **27** | 4              |
| Payments     | 12          | 1           | 1                | 0                        | **14** | 6              |
| Insurance    | 14          | 1           | 1                | 0                        | **16** | 6              |
| Installments | 10          | 6           | 1                | 1                        | **18** | 4              |
| Commissions  | 10          | 0           | 0                | 0                        | **10** | 5              |
| Reports      | 0           | 0           | 0                | 0                        | **0**  | 0              |
| **Total**    | **63**      | **9**       | **4**            | **9**                    | **85** | **25 files**   |

> **Reports module is fully RTL-compliant** — uses `me-`, `ms-`, `text-start`, `text-end` throughout.
> All other features use physical properties and need migration.

---

## Schema Violation Detail

| Form Component                 | Local Schema            | Shared Schema Available                                        | Fix                                     |
| ------------------------------ | ----------------------- | -------------------------------------------------------------- | --------------------------------------- |
| `InvoiceForm.tsx`              | `invoiceFormSchema`     | `createInvoiceSchema` / `updateInvoiceSchema`                  | Import from `@dento/shared`             |
| `PaymentForm.tsx`              | `paymentFormSchema`     | `createPaymentSchema`                                          | Import from `@dento/shared`             |
| `CreateClaimPage.tsx`          | `claimFormSchema`       | Insurance schemas in `insurance.schema.ts`                     | Import from `@dento/shared`             |
| `InsuranceCompanyFormPage.tsx` | `companyFormSchema`     | Insurance company schemas in `insurance.schema.ts`             | Import from `@dento/shared`             |
| `InstallmentFormPage.tsx`      | `installmentFormSchema` | `recordInstallmentPaymentSchema` + installment creation schema | Import from `@dento/shared`             |
| `CreatePayoutDialog.tsx`       | (none — no validation)  | `calculateCommissionSchema`                                    | Add Zod validation from `@dento/shared` |

---

## Remediation Priority

### P0 — Critical (blocks §8.4 compliance)

1. **Import Zod schemas from `@dento/shared`** in all 6 form components listed above. Remove local schema definitions. This is a single-line import change per file. Estimated effort: **~2 hours**.

### P1 — Medium (§11 RTL compliance)

2. **Replace 85 physical CSS properties** with logical equivalents across 25 files:
   - `mr-` → `me-` (margin-end)
   - `ml-` → `ms-` (margin-start)
   - `pl-` → `ps-` (padding-start)
   - `pr-` → `pe-` (padding-end)
   - `left-` → `start-`
   - `right-` → `end-`
   - `text-left` → `text-start`
   - `text-right` → `text-end`
   - `border-l-` → `border-s-` (applies to `commission.utils.ts`)

   Use the Reports module as the reference pattern. Estimated effort: **~3 hours** (find-and-replace with review).

### P2 — Low (polish)

3. **Convert 3 small dialog forms** to RHF + Zod:
   - `RecordInstallmentPaymentDialog.tsx` — amount/notes fields
   - `CommissionApprovalForm.tsx` — notes field
   - `CreatePayoutDialog.tsx` — doctorId/paymentMethod/reference/notes (currently no validation)

4. **Use Combobox instead of plain Input** in `ReportFilterBar.tsx` for Branch/Doctor filters.

5. **Use `DoctorCombobox` instead of `Select`** for doctor filter in `InvoiceListPage.tsx`.

6. **Use `Dialog` from `@dento/ui`** in `ExportReportDialog.tsx` instead of custom overlay.

7. **Import types from `@dento/shared`** in hooks files (5 files) where types are defined locally.

---

## What's Working Well

- ✅ **All hooks use proper queryKeys factory pattern** (§8.3)
- ✅ **All list pages have Loading/Error/Empty states** (§15)
- ✅ **All detail pages have Loading/Error states** (§15)
- ✅ **All major forms use RHF + zodResolver** (§8.4 pattern correct)
- ✅ **Entity references consistently use Combobox** (PatientCombobox, BranchCombobox, InvoiceCombobox)
- ✅ **CSV export available on all list pages**
- ✅ **Locale-aware date formatting** across features
- ✅ **Reports module is exemplary** — fully RTL-compliant, imports types from `@dento/shared`, proper Loading/Error/Empty states everywhere
- ✅ **Zero TODO/FIXME/HACK comments** across all 52 files
- ✅ **Clean component extraction** (columns, badges, utils in separate files)
- ✅ **Cross-query invalidation** (payments invalidate invoices, payouts invalidate commissions)
- ✅ **Bilingual support** in insurance company forms and all report configurations
