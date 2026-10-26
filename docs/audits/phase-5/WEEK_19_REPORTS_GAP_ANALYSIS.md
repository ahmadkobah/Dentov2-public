# Week 19 — Reports & Analytics — Gap Analysis

> **Date:** 2026-03-02 (Deep Scan Update: 2026-03-02)  
> **Source:** IMPLEMENTATION_ROADMAP.md §7 (Phase 5 — Woche 19) + DENTO_V2_MASTER_PLAN §21 + §16  
> **Scope:** 36 Reports (10 Inventory + 7 Financial + 5 Patient + 6 Appointment + 4 Clinical + 4 Operational) + Saved Reports + Scheduled Reports + Export (CSV/Excel/PDF)  
> **Cross-Referenced:** BUILD_RULES.md, SECURITY_AND_ENCRYPTION.md, TECH_REQUIREMENTS.md, V2_DATABASE.md, V2_DECISION_LOG.md, V2_STRUCTURE.md, PLATFORM_RBAC.md

---

## What EXISTS (Done)

### Backend (API)

#### Real MongoDB Aggregation Pipelines

| Service File                           | Pipelines | Methods                                                                                                                                                                                                               |
| :------------------------------------- | :-------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `report-pipeline.service.ts`           |     9     | F1: `revenueByPeriod`, F2: `revenueByDoctor`, F3: `revenueByService`, F4: `revenueByBranch`, F5: `paymentCollection`, F6: `outstandingAging`, F7: `taxReport`, O1: `commissionSummary`, O2: `dailyReconciliation`     |
| `inventory-report-pipeline.service.ts` |    10     | D1: `materialUsage`, D2: `stockValuation`, D3: `expiryReport`, D4: `consumptionForecast`, D5: `supplierPerformance`, D6: `stockMovementHistory`, D7: `poSummary`, D8: `lowStock`, D9: `deadStock`, D10: `abcAnalysis` |

**Total: 19 real pipelines implemented**

#### Route File

- `reports.route.ts` (1,079 lines) — Endpoints for all 6 categories:
  - `GET /api/reports/financial/:type`
  - `GET /api/reports/patients/:type`
  - `GET /api/reports/appointments/:type`
  - `GET /api/reports/clinical/:type`
  - `GET /api/reports/operational/:type`
  - `GET /api/reports/inventory/:type`
  - `GET /api/reports/catalog`
  - `POST /api/reports/export`
  - `GET/POST /api/reports/saved`
  - `GET/POST /api/reports/scheduled`
  - `GET /api/reports/history`

#### Models

- `report.model.ts` — `REPORT_CATALOG` with all 36 report definitions + `SavedReport`, `ReportSchedule`, `ReportHistory` Mongoose models

#### Export Service

- `report-export.service.ts` (492 lines) — BullMQ async worker with CSV (`@fast-csv`), Excel (`exceljs`), PDF generation

### Frontend (Admin)

| File                                 | Description                                                                                                                                                           |
| :----------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReportsHubPage.tsx`                 | Hub with 5 category cards + upgrade CTA                                                                                                                               |
| `ReportCategoryPage.tsx` (741 lines) | Parameterized page for all 5 categories — free reports with live charts, locked preview for paid                                                                      |
| `ScheduledReportsPage.tsx`           | CRUD for report schedules (create, edit, delete, run now)                                                                                                             |
| `ReportPDF.tsx`                      | `@react-pdf/renderer` component for client-side PDF generation                                                                                                        |
| `useReports.ts` (286 lines)          | All hooks: `useDashboardStats`, `useFinancialReport`, `usePatientReport`, `useAppointmentReport`, `useClinicalReport`, `useOperationalReport`, schedule CRUD, history |
| `StockValuationReportPage.tsx`       | Dedicated inventory report — branch picker, valuation method, category PieChart                                                                                       |
| `MaterialUsageReportPage.tsx`        | Dedicated inventory report — date range, branch filter, usage BarChart + table                                                                                        |
| `ExpiryDashboardPage.tsx`            | Dedicated inventory report — expiry status overview + batch table with dispose action                                                                                 |

---

## What's MISSING / INCOMPLETE

### Gap 1 — Patient/Appointment/Clinical/Operational: No Real Aggregation Pipelines

`report-pipeline.service.ts` only has pipelines for **Financial (F1–F7)** and **Operational (O1–O2)**. The route handlers for the remaining categories return **hardcoded mock data**.

| Category            |                                     Reports in Catalog                                     | Real Pipelines | Mock Only |
| :------------------ | :----------------------------------------------------------------------------------------: | :------------: | :-------: |
| **Patient** (5)     |         patient_overview, new_vs_returning, demographics, no_show, source_referral         |     **0**      |   **5**   |
| **Appointment** (6) |     summary, doctor_utilization, chair_utilization, cancellation, peak_hours, duration     |     **0**      |   **6**   |
| **Clinical** (4)    | procedures_performed, treatment_plan_acceptance, lab_order_turnaround, prescription_volume |     **0**      |   **4**   |
| **Operational** (4) |      commission_summary, daily_reconciliation, wait_time_analysis, staff_productivity      |     **2**      |   **2**   |

**Missing: 17 real MongoDB aggregation pipelines**

#### Detailed Pipeline Specs Needed

**Patient Pipelines (5):**

| #   | Pipeline                | Collections                | Aggregation Logic                                                   |
| :-- | :---------------------- | :------------------------- | :------------------------------------------------------------------ |
| P1  | `patientOverview`       | `patients`                 | Count by `isActive`, group by creation month for "new this month"   |
| P2  | `newVsReturning`        | `patients`, `appointments` | Group patients by first-visit date vs. subsequent visits per period |
| P3  | `patientDemographics`   | `patients`                 | `$group` by age bucket, gender, nationality — pie/bar data          |
| P4  | `noShowReport`          | `appointments`             | `$match` status=no_show, `$group` by doctor, dayOfWeek, hourOfDay   |
| P5  | `patientSourceReferral` | `patients`                 | `$group` by `referralSource` field, count + percentage              |

**Appointment Pipelines (6):**

| #   | Pipeline               | Collections                        | Aggregation Logic                                            |
| :-- | :--------------------- | :--------------------------------- | :----------------------------------------------------------- |
| A1  | `appointmentSummary`   | `appointments`                     | `$group` by status for given date range                      |
| A2  | `doctorUtilization`    | `appointments`, `doctor_schedules` | Booked slots vs. available slots per doctor                  |
| A3  | `chairUtilization`     | `appointments`                     | `$group` by `chairId`/`roomId`, calculate occupancy %        |
| A4  | `cancellationAnalysis` | `appointments`                     | `$match` status=cancelled, `$group` by reason, trend by week |
| A5  | `peakHoursHeatmap`     | `appointments`                     | `$group` by `{ dayOfWeek, hour }` → 7×24 heatmap matrix      |
| A6  | `avgDurationAnalysis`  | `appointments`                     | `$group` by service type + doctor, `$avg` of duration        |

**Clinical Pipelines (4):**

| #   | Pipeline                  | Collections       | Aggregation Logic                                            |
| :-- | :------------------------ | :---------------- | :----------------------------------------------------------- |
| C1  | `proceduresPerformed`     | `procedure_notes` | `$group` by procedure type, doctor, period — count + revenue |
| C2  | `treatmentPlanAcceptance` | `treatment_plans` | Count by status (created/started/completed), acceptance %    |
| C3  | `labOrderTurnaround`      | `lab_orders`      | `$subtract` completedAt - createdAt, `$avg` by lab           |
| C4  | `prescriptionVolume`      | `prescriptions`   | `$group` by medication, doctor, month — count + trend        |

**Operational Pipelines (2 missing):**

| #   | Pipeline            | Collections                | Aggregation Logic                                                 |
| :-- | :------------------ | :------------------------- | :---------------------------------------------------------------- |
| O3  | `waitTimeAnalysis`  | `appointments`             | `$subtract` actualStart - scheduledStart, `$avg` by branch/doctor |
| O4  | `staffProductivity` | `appointments`, `invoices` | Appointments + revenue per doctor per work day                    |

---

### Gap 2 — Inventory Category Missing from ReportCategoryPage

`ReportCategoryPage.tsx` only has `CATEGORY_CONFIG` for 5 categories (financial, patient, appointment, clinical, operational). **Inventory is not present** — its reports only exist as 3 standalone pages. The remaining 7 have backend pipelines but **no frontend pages**.

| #   | Inventory Report       | Backend Pipeline |           Frontend Page           |
| :-- | :--------------------- | :--------------: | :-------------------------------: |
| D1  | Material Usage         |        ✅        | ✅ `MaterialUsageReportPage.tsx`  |
| D2  | Stock Valuation        |        ✅        | ✅ `StockValuationReportPage.tsx` |
| D3  | Expiry Report          |        ✅        |   ✅ `ExpiryDashboardPage.tsx`    |
| D4  | Consumption Forecast   |        ✅        |          ❌ **MISSING**           |
| D5  | Supplier Performance   |        ✅        |          ❌ **MISSING**           |
| D6  | Stock Movement History |        ✅        |          ❌ **MISSING**           |
| D7  | PO Summary             |        ✅        |          ❌ **MISSING**           |
| D8  | Low Stock Alert        |        ✅        |          ❌ **MISSING**           |
| D9  | Dead Stock             |        ✅        |          ❌ **MISSING**           |
| D10 | ABC Analysis           |        ✅        |          ❌ **MISSING**           |

**Missing: 7 inventory report frontend pages**

---

### Gap 3 — Report Detail View Page

There is no **individual report detail page** — a full-screen component that shows:

- Date range picker + branch filter
- Full chart visualization (bar, line, pie, heatmap depending on report type)
- Data table with sorting/filtering
- Export buttons (CSV/Excel/PDF)

`ReportCategoryPage` shows a locked/preview card list. Clicking a free report does NOT navigate to a detail view.

**Missing: 1 generic `ReportDetailPage.tsx` component**

---

### Gap 4 — Export Trigger UI + Hook

Backend has `POST /api/reports/export` + BullMQ worker, but frontend:

- Has a "Download" icon on free report cards → **no handler wired**
- No `useExportReport` mutation hook
- No export format picker dialog (CSV / Excel / PDF selection)

**Missing: 1 `ExportReportDialog.tsx` + 1 `useExportReport` hook**

---

### Gap 5 — Saved Reports Page

Backend has `GET/POST /api/reports/saved` endpoints. Hook key `reportKeys.saved()` exists but no page renders the data.

**Missing: 1 `SavedReportsPage.tsx`**

---

### Gap 6 — Report History Page

Backend has `GET /api/reports/history`. Hook `useReportHistory()` exists but no page.

**Missing: 1 `ReportHistoryPage.tsx`**

---

### Gap 8 — RBAC Bug: Reports Route Uses Wrong Permission Module ⚠️ HIGH

`reports.route.ts` line 286 defines the read guard as:

```ts
const readGuard = [...preHandler, roleGuard('inventory', 'read')];
```

This gates **all report read endpoints** with the `inventory` permission module instead of `reports`. Per PLATFORM_RBAC.md and Master Plan §21, reports MUST use `roleGuard('reports', 'read')`. This means:

- Users with `reports:read` but NOT `inventory:read` are **blocked** from viewing reports
- Users with `inventory:read` but NOT `reports:read` can **bypass** report RBAC

**Fix: Change `roleGuard('inventory', 'read')` → `roleGuard('reports', 'read')`**

---

### Gap 9 — Dashboard 100% Hardcoded Mock Data ⚠️ HIGH

`DashboardPage.tsx` (436 lines) renders 8 widgets with **ALL hardcoded inline data**:

- `const stats = { totalPatients: 1247, todayAppointments: 23, ... }` — all static numbers
- `const revenueData = [{ month: 'Jan', revenue: 4000 }, ...]` — static array
- `const appointmentData`, `const treatmentData` — all static
- **No import of `useDashboardStats()`** or any TanStack Query hook
- Backend routes `/api/reports/stats` and `/api/reports/trends` also return Phase 2 shell mock data

Per Master Plan §21, the dashboard should display **live data** from 8 widgets:

1. Revenue Summary (live aggregation)
2. Appointment Overview (today's stats)
3. Patient Stats (active/new counts)
4. Treatment Pipeline (status breakdown)
5. Outstanding Balance (aging totals)
6. Low Stock Alert (inventory integration)
7. Staff Performance (appointments per doctor)
8. Waiting Room Status (real-time queue)

**Missing: Dashboard backend `/stats` + `/trends` real pipelines + frontend hook wiring**

---

### Gap 10 — Dashboard Widget Mismatch vs. Master Plan

Frontend `DashboardPage.tsx` renders these 8 widgets:

- Revenue, Appointments Today, Active Patients, Pending Treatments, Charts (Revenue/Appointments/Treatments), Quick Actions, Chair Status

Master Plan §21 specifies:

- Revenue Summary, Appointment Overview, Patient Stats, Treatment Pipeline, Outstanding Balance, **Low Stock Alert**, Staff Performance, **Waiting Room Status**

Missing widgets: **Low Stock Alert** (inventory integration) and **Waiting Room Status** (real-time queue). Present but not in spec: ChairStatus, QuickActions.

**Missing: 2 widget components + removal/replacement of 2 non-spec widgets**

---

### Gap 11 — No `report.schema.ts` in `@dento/shared` (BUILD_RULES Violation)

Per BUILD*RULES.md §7 (shared-schema pattern): *"Every entity that crosses the API boundary MUST have a Zod schema in `@dento/shared/schemas/`"\_

Currently:

- `inventory.schema.ts` ✅ (450 lines, full Zod schemas)
- `report.schema.ts` ❌ **MISSING** — Report request/response validation is done inline in `reports.route.ts`

Needed schemas:

- `reportFilterSchema` (dateRange, branch, doctor, status filters)
- `reportExportSchema` (reportType, format, filters)
- `savedReportSchema` (name, type, filters, columns)
- `reportScheduleSchema` (name, type, frequency, filters, recipients)
- `reportResponseSchema` (data, metadata, pagination)
- `reportCatalogItemSchema` (type, name, category, isFree, description)

**Missing: 1 file `packages/shared/src/schemas/report.schema.ts` with ~6 Zod schemas**

---

### Gap 12 — Missing Test Coverage ⚠️ HIGH (BUILD_RULES Violation)

Per BUILD*RULES.md §13: *"Every service MUST have a matching `.test.ts` file. Coverage target: ≥80%."\_

| File                            | Lines | Test File |
| :------------------------------ | :---: | :-------: |
| `report-pipeline.service.ts`    |  600  |  ❌ NONE  |
| `reports.route.ts`              | 1,079 |  ❌ NONE  |
| `report-export.service.ts`      |  492  |  ❌ NONE  |
| `report-scheduler.service.ts`   |  207  |  ❌ NONE  |
| `inventory-stock.route.ts`      |  255  |  ❌ NONE  |
| `inventory-categories.route.ts` |  143  |  ❌ NONE  |
| `stock-transfers.route.ts`      |  136  |  ❌ NONE  |
| `stock-counts.route.ts`         |  200  |  ❌ NONE  |

**Missing: 8 test files (~2,400 estimated lines of tests)**

---

### Gap 13 — Inventory Expired-Batch BullMQ Cron Worker Missing

Master Plan §16 specifies: _"Expiry management: BullMQ cron at 02:00 daily — processExpiredBatches()"_

Currently:

- `InventoryStockService.processExpiredBatches()` method **EXISTS** in the service file
- But **NO BullMQ repeatable job/worker** that triggers it
- Report scheduler worker exists (`report-scheduler.service.ts`) but handles only report schedules

**Missing: 1 BullMQ worker `inventory-expiry.worker.ts` with daily 02:00 cron → calls `processExpiredBatches()`**

---

### Gap 14 — Inventory Category Missing from Catalog Route Backend

`reports.route.ts` catalog handler (lines 296-310) defines `categoryNames` and `categoryIcons` maps with only 5 entries: `financial`, `patient`, `appointment`, `clinical`, `operational`.

The `REPORT_CATALOG` model object has 6 keys (including `inventory`), but when the catalog handler maps over them, the 6th category gets `undefined` for name and icon.

**Fix: Add `inventory: { en: 'Inventory Reports', ar: 'تقارير المخزون' }` to `categoryNames` and `inventory: 'Package'` to `categoryIcons`**

---

### Gap 15 — No Sidebar Links to Report Category Pages

Master Plan §21 sidebar spec defines report navigation as:

```
Reports & Analytics
  ├── Dashboard          → /reports
  ├── Financial Reports  → /reports/financial
  ├── Patient Reports    → /reports/patient
  ├── Appointment Reports → /reports/appointment
  ├── Clinical Reports   → /reports/clinical
  ├── Operational Reports → /reports/operational
  ├── Inventory Reports  → /reports/inventory
  ├── Saved Reports      → /reports/saved
  └── Scheduled Reports  → /reports/scheduled
```

Currently users can ONLY access categories by clicking cards on ReportsHubPage. No sidebar sub-navigation for direct access.

**Missing: sidebar-config.ts report section with 9 sub-items + router entries**

---

## Summary

| #   | Gap                                                               | Layer    |        Count        | Effort  | Priority |
| :-- | :---------------------------------------------------------------- | :------- | :-----------------: | :------ | :------- |
| 1   | Real MongoDB pipelines (Patient/Appointment/Clinical/Operational) | Backend  |    17 pipelines     | High    | P0       |
| 2   | Inventory report frontend pages (D4–D10)                          | Frontend |       7 pages       | Medium  | P1       |
| 3   | Generic Report Detail Page (chart + table + filters + export)     | Frontend |     1 component     | Medium  | P0       |
| 4   | Export trigger UI + hook                                          | Frontend |  1 dialog + 1 hook  | Low     | P1       |
| 5   | Saved Reports Page                                                | Frontend |       1 page        | Low     | P1       |
| 6   | Report History Page                                               | Frontend |       1 page        | Low     | P1       |
| 7   | Inventory category in `ReportCategoryPage` CATEGORY_CONFIG        | Frontend |   Config addition   | Trivial | P1       |
| 8   | **RBAC BUG — wrong permission module in reports route**           | Backend  |     1 line fix      | Trivial | P0 🔴    |
| 9   | **Dashboard live data (backend + frontend wiring)**               | Full     | 2 pipelines + hooks | High    | P0       |
| 10  | **Dashboard widget mismatch (Low Stock + Waiting Room)**          | Frontend |    2 components     | Medium  | P1       |
| 11  | **`report.schema.ts` in `@dento/shared`**                         | Shared   |     ~6 schemas      | Medium  | P0       |
| 12  | **Missing test files (8 files)**                                  | Tests    |    8 test files     | High    | P0       |
| 13  | **Inventory expired-batch BullMQ cron worker**                    | Backend  |      1 worker       | Low     | P1       |
| 14  | **Inventory category in catalog route backend**                   | Backend  |   Config addition   | Trivial | P0       |
| 15  | **Sidebar links for report categories**                           | Frontend |  Config + routing   | Low     | P1       |

**Total: ~50+ deliverables across backend, frontend, shared, and tests**

---

## Dependency Order

```
PHASE A — Critical Fixes (No dependencies, do FIRST)
├── Gap 8:  RBAC bug fix (1 line change)
├── Gap 14: Inventory category in catalog route (config addition)
└── Gap 11: report.schema.ts in @dento/shared (foundation for all validation)

PHASE B — Backend Pipelines (Unblocks frontend)
├── Gap 1:  17 MongoDB aggregation pipelines
│   ├── Patient (5 pipelines: P1-P5)
│   ├── Appointment (6 pipelines: A1-A6)
│   ├── Clinical (4 pipelines: C1-C4)
│   └── Operational (2 pipelines: O3-O4)
└── Gap 9:  Dashboard /stats + /trends real pipeline data

PHASE C — Core Frontend (Needs Phase B)
├── Gap 3:  Generic ReportDetailPage (chart + table + filters + export)
├── Gap 7:  Inventory category in ReportCategoryPage CATEGORY_CONFIG
├── Gap 10: Dashboard widgets (Low Stock Alert + Waiting Room)
├── Gap 9:  Dashboard frontend hook wiring (useDashboardStats integration)
└── Gap 15: Sidebar links for report categories + routing

PHASE D — Feature Pages (Needs Phase C)
├── Gap 2:  7 inventory report pages (D4-D10)
├── Gap 4:  Export dialog + useExportReport hook
├── Gap 5:  SavedReportsPage
└── Gap 6:  ReportHistoryPage

PHASE E — Background Workers
└── Gap 13: Inventory expired-batch BullMQ cron worker

PHASE F — Test Coverage (Can run in parallel with Phases B-E)
└── Gap 12: 8 test files
    ├── report-pipeline.service.test.ts
    ├── reports.route.test.ts
    ├── report-export.service.test.ts
    ├── report-scheduler.service.test.ts
    ├── inventory-stock.route.test.ts
    ├── inventory-categories.route.test.ts
    ├── stock-transfers.route.test.ts
    └── stock-counts.route.test.ts
```

---

# Implementation Plan

> **Estimated Total Effort:** 6–8 working days  
> **Phases:** A → F (sequential with F running in parallel)  
> **Convention:** All code follows BUILD_RULES.md — bilingual `{ en, ar }`, `apiResponse()` wrappers, Zod validation, co-located tests, TanStack Query hooks.

---

## Phase A — Critical Fixes (Day 1, ~2 hours)

### A1. RBAC Bug Fix (Gap 8) — 5 min

**File:** `apps/api/src/tenant/routes/reports/reports.route.ts` line 286

```diff
- const readGuard = [...preHandler, roleGuard('inventory', 'read')];
+ const readGuard = [...preHandler, roleGuard('reports', 'read')];
```

**Verify:** Run existing auth tests; confirm `/api/reports/*` endpoints require `reports:read` permission.

---

### A2. Inventory Category in Catalog Route (Gap 14) — 15 min

**File:** `apps/api/src/tenant/routes/reports/reports.route.ts` (~line 297)

Add to `categoryNames`:

```ts
inventory: { en: 'Inventory Reports', ar: 'تقارير المخزون' },
```

Add to `categoryIcons`:

```ts
inventory: 'Package',
```

**Verify:** `GET /api/reports/catalog` returns 6 categories (not 5).

---

### A3. Create `report.schema.ts` (Gap 11) — 1.5 hours

**File:** `packages/shared/src/schemas/report.schema.ts` (NEW)

```ts
import { z } from 'zod';

// ── Enums ───────────────────────────────────────────────────
export const reportCategoryEnum = z.enum([
  'financial',
  'patient',
  'appointment',
  'clinical',
  'operational',
  'inventory',
]);
export const reportFormatEnum = z.enum(['json', 'csv', 'excel', 'pdf']);
export const reportPeriodEnum = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
export const scheduleFrequencyEnum = z.enum(['daily', 'weekly', 'monthly']);

// ── Filter Schema ───────────────────────────────────────────
export const reportFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  branchId: z.string().optional(),
  doctorId: z.string().optional(),
  period: reportPeriodEnum.optional(),
  format: reportFormatEnum.optional(),
});

// ── Export Schema ───────────────────────────────────────────
export const reportExportSchema = z.object({
  reportType: z.string().min(1),
  category: reportCategoryEnum,
  format: reportFormatEnum,
  params: z.record(z.unknown()).optional(),
});

// ── Saved Report Schema ─────────────────────────────────────
export const savedReportSchema = z.object({
  name: z.string().min(1).max(100),
  reportType: z.string().min(1),
  category: reportCategoryEnum,
  filters: reportFilterSchema.optional(),
  columns: z.array(z.string()).optional(),
});

// ── Schedule Schema ─────────────────────────────────────────
export const reportScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  reportType: z.string().min(1),
  category: reportCategoryEnum,
  frequency: scheduleFrequencyEnum,
  format: reportFormatEnum,
  recipients: z.array(z.string().email()).min(1),
  reportParams: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

// ── Catalog Item Schema ─────────────────────────────────────
export const reportCatalogItemSchema = z.object({
  type: z.string(),
  name: z.object({ en: z.string(), ar: z.string() }),
  description: z.object({ en: z.string(), ar: z.string() }),
  isFree: z.boolean(),
  icon: z.string(),
});

// ── Type Exports ────────────────────────────────────────────
export type ReportFilter = z.infer<typeof reportFilterSchema>;
export type ReportExport = z.infer<typeof reportExportSchema>;
export type SavedReport = z.infer<typeof savedReportSchema>;
export type ReportSchedule = z.infer<typeof reportScheduleSchema>;
export type ReportCatalogItem = z.infer<typeof reportCatalogItemSchema>;
```

**Post-Steps:**

1. Export from `packages/shared/src/schemas/index.ts`
2. Replace inline Zod schemas in `reports.route.ts` with imports from `@dento/shared`
3. Run `pnpm build --filter @dento/shared`

---

## Phase B — Backend Pipelines (Days 1–3, ~16 hours)

### B1. Patient Pipelines (Gap 1) — 4 hours

**File:** `apps/api/src/tenant/services/report-pipeline.service.ts`

Add 5 methods to `ReportPipelineService` class:

| Method                          | Collection                  | Key Aggregation                                            |
| :------------------------------ | :-------------------------- | :--------------------------------------------------------- |
| `patientOverview(params)`       | `patients`                  | `$facet` → activeCount, newThisMonth, totalByStatus        |
| `newVsReturning(params)`        | `patients` + `appointments` | `$lookup` first-visit, `$group` by period                  |
| `patientDemographics(params)`   | `patients`                  | `$bucket` age, `$group` gender + nationality               |
| `noShowReport(params)`          | `appointments`              | `$match` status=no_show, `$group` by doctor/dayOfWeek/hour |
| `patientSourceReferral(params)` | `patients`                  | `$group` by referralSource, `$project` count + percentage  |

**Update `getReport()` switch:**

```ts
case 'patient_overview':     return this.patientOverview(params);
case 'new_vs_returning':     return this.newVsReturning(params);
case 'demographics':         return this.patientDemographics(params);
case 'no_show':              return this.noShowReport(params);
case 'source_referral':      return this.patientSourceReferral(params);
```

**Pattern:** Follow existing `revenueByPeriod()` pattern — `const collection = this.tenantDb.collection('patients')`, `collection.aggregate([...]).toArray()`, result wrapped as `{ summary, chart, table }`.

---

### B2. Appointment Pipelines (Gap 1) — 5 hours

Same file. Add 6 methods:

| Method                         | Collection                          | Key Aggregation                                   |
| :----------------------------- | :---------------------------------- | :------------------------------------------------ |
| `appointmentSummary(params)`   | `appointments`                      | `$group` by status for date range                 |
| `doctorUtilization(params)`    | `appointments` + `doctor_schedules` | `$lookup`, booked/available ratio                 |
| `chairUtilization(params)`     | `appointments`                      | `$group` by chairId, occupancy %                  |
| `cancellationAnalysis(params)` | `appointments`                      | `$match` cancelled, `$group` by reason + week     |
| `peakHoursHeatmap(params)`     | `appointments`                      | `$group` `{ $dayOfWeek, $hour }` → 7×24 matrix    |
| `avgDurationAnalysis(params)`  | `appointments`                      | `$group` by serviceType + doctor, `$avg` duration |

**Update `getReport()` switch** with 6 new cases.

---

### B3. Clinical Pipelines (Gap 1) — 3 hours

Same file. Add 4 methods:

| Method                            | Collection        | Key Aggregation                              |
| :-------------------------------- | :---------------- | :------------------------------------------- |
| `proceduresPerformed(params)`     | `procedure_notes` | `$group` by type + doctor, count + revenue   |
| `treatmentPlanAcceptance(params)` | `treatment_plans` | Count by status, acceptance rate             |
| `labOrderTurnaround(params)`      | `lab_orders`      | `$subtract` completed-created, `$avg` by lab |
| `prescriptionVolume(params)`      | `prescriptions`   | `$group` by medication + doctor + month      |

---

### B4. Operational Pipelines — O3 + O4 (Gap 1) — 2 hours

Same file. Add 2 methods:

| Method                      | Key Aggregation                                                                     |
| :-------------------------- | :---------------------------------------------------------------------------------- |
| `waitTimeAnalysis(params)`  | `$subtract` actualStart - scheduledStart, `$avg` by branch/doctor                   |
| `staffProductivity(params)` | `appointments` + `invoices` `$lookup`, appointments/revenue per doctor per work day |

---

### B5. Dashboard Live Data Backend (Gap 9) — 2 hours

**File:** `apps/api/src/tenant/routes/reports/reports.route.ts`

Replace mock data in `GET /stats` and `GET /trends` handlers with real aggregation:

**`/stats` pipeline:**

```ts
const [patientStats, appointmentStats, revenueStats, treatmentStats, balanceStats, lowStock] = await Promise.all([
  tenantDb.collection('patients').aggregate([{ $facet: { total: [{ $count: 'n' }], newThisMonth: [...] } }]).toArray(),
  tenantDb.collection('appointments').aggregate([{ $match: { date: today } }, { $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
  tenantDb.collection('invoices').aggregate([{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]).toArray(),
  tenantDb.collection('treatment_plans').aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
  tenantDb.collection('invoices').aggregate([{ $match: { 'balance.remaining': { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$balance.remaining' } } }]).toArray(),
  tenantDb.collection('inventory_items').aggregate([{ $match: { $expr: { $lte: ['$currentStock', '$reorderLevel'] } } }, { $count: 'count' }]).toArray(),
]);
```

**`/trends` pipeline:**

- Revenue: `$group` by month for last 12 months
- Appointments: `$group` by month
- Patients: `$group` by creation month

---

## Phase C — Core Frontend (Days 3–4, ~10 hours)

### C1. ReportDetailPage Component (Gap 3) — 4 hours

**File:** `apps/admin/src/features/reports/pages/ReportDetailPage.tsx` (NEW)

Structure:

```tsx
export default function ReportDetailPage() {
  const { category, type } = useParams();
  const navigate = useNavigate();

  // ── Filter State ──────────────────────────────────
  const [dateRange, setDateRange] = useState({ from, to });
  const [branchId, setBranchId] = useState('');
  const [doctorId, setDoctorId] = useState('');

  // ── Data Hook (category-based) ────────────────────
  const reportHook = useReportByCategory(category!, type!, { ...dateRange, branchId, doctorId });

  return (
    <div className="space-y-6">
      {/* Header: Back button + Report name + Export buttons */}
      <ReportFilterBar ... />

      {/* Chart Section: switches on chartType (bar/line/pie/heatmap) */}
      <ReportChart data={reportHook.data?.chart} chartType={...} />

      {/* Data Table: sortable columns from report data */}
      <ReportDataTable data={reportHook.data?.table} columns={...} />
    </div>
  );
}
```

**Sub-Components (same folder):**

- `ReportFilterBar.tsx` — Date pickers, branch select, doctor select, period toggle
- `ReportChart.tsx` — Recharts wrapper that renders Bar/Line/Pie/Heatmap based on report type
- `ReportDataTable.tsx` — Generic table with sorting, pagination, column visibility

**Router entry:** `{ path: '/reports/:category/:type', element: <ReportDetailPage /> }`

---

### C2. Inventory Category in CATEGORY_CONFIG (Gap 7) — 30 min

**File:** `apps/admin/src/features/reports/pages/ReportCategoryPage.tsx`

Add to `CATEGORY_CONFIG`:

```ts
inventory: {
  name: { en: 'Inventory Reports', ar: 'تقارير المخزون' },
  icon: Package,
  color: 'text-orange-600',
  bg: 'bg-orange-50',
  reports: [
    { type: 'material_usage', name: { en: 'Material Usage', ar: 'استهلاك المواد' }, ... },
    { type: 'stock_valuation', ... },
    { type: 'expiry_report', ... },
    { type: 'consumption_forecast', ... },
    { type: 'supplier_performance', ... },
    { type: 'stock_movement_history', ... },
    { type: 'po_summary', ... },
    { type: 'low_stock_alert', ... },
    { type: 'dead_stock', ... },
    { type: 'abc_analysis', ... },
  ],
},
```

Add `Package` import from `lucide-react`.

---

### C3. Dashboard Live Data + Widget Fix (Gaps 9 + 10) — 3 hours

**File:** `apps/admin/src/features/dashboard/pages/DashboardPage.tsx`

**Step 1:** Import and call `useDashboardStats()`:

```tsx
import { useDashboardStats } from '../../reports/hooks/useReports.js';

export default function DashboardPage() {
  const { data: statsData, isLoading } = useDashboardStats();
  // Replace all hardcoded const stats/revenueData/appointmentData with statsData?.xxx
}
```

**Step 2:** Replace ChairStatus widget with LowStockAlertWidget:

```tsx
function LowStockAlertWidget({ lowStockCount }: { lowStockCount: number }) {
  // Show count + link to /inventory?filter=low_stock
}
```

**Step 3:** Replace QuickActions widget with WaitingRoomWidget:

```tsx
function WaitingRoomWidget({ waitingPatients }: { waitingPatients: number }) {
  // Show count + avg wait time from /stats response
}
```

**Step 4:** Add loading skeletons for all 8 cards while `isLoading`.

---

### C4. Sidebar Report Links (Gap 15) — 1 hour

**File:** `apps/admin/src/layouts/Sidebar/sidebar-config.ts`

Replace single Reports entry with:

```ts
// Reports & Analytics
{ label: 'Reports', icon: BarChart, path: '/reports', group: 'Reports', module: 'reports' },
{ label: 'Financial', icon: DollarSign, path: '/reports/financial', group: 'Reports', module: 'reports' },
{ label: 'Patient', icon: Users, path: '/reports/patient', group: 'Reports', module: 'reports' },
{ label: 'Appointments', icon: CalendarDays, path: '/reports/appointment', group: 'Reports', module: 'reports' },
{ label: 'Clinical', icon: Stethoscope, path: '/reports/clinical', group: 'Reports', module: 'reports' },
{ label: 'Operational', icon: Settings, path: '/reports/operational', group: 'Reports', module: 'reports' },
{ label: 'Inventory', icon: Package, path: '/reports/inventory', group: 'Reports', module: 'reports' },
{ label: 'Saved', icon: Bookmark, path: '/reports/saved', group: 'Reports', module: 'reports' },
{ label: 'Scheduled', icon: CalendarClock, path: '/reports/scheduled', group: 'Reports', module: 'reports' },
{ label: 'History', icon: History, path: '/reports/history', group: 'Reports', module: 'reports' },
```

Remove the old `{ label: 'Reports', ... }` and `{ label: 'Scheduled', ... }` entries from the System group.

**Router updates:** Add routes for `/reports/saved` and `/reports/history`.

---

### C5. Export Dialog + Hook (Gap 4) — 1.5 hours

**File:** `apps/admin/src/features/reports/components/ExportReportDialog.tsx` (NEW)

```tsx
// Modal with: format picker (CSV/Excel/PDF), confirm button
// Calls useExportReport mutation hook
```

**File:** `apps/admin/src/features/reports/hooks/useReports.ts`

Add:

```ts
export function useExportReport() {
  return useMutation({
    mutationFn: (data: ReportExport) => apiClient.post('/api/reports/export', data),
    onSuccess: () => toast.success('Export queued. You will be notified.'),
  });
}
```

Wire into ReportDetailPage export buttons.

---

## Phase D — Feature Pages (Days 4–5, ~8 hours)

### D1. 7 Inventory Report Pages (Gap 2) — 5 hours

**Folder:** `apps/admin/src/features/inventory/pages/reports/` (NEW subfolder)

Each page follows the pattern of existing `StockValuationReportPage.tsx`:

| File                           | Pipeline | Chart Type                           |
| :----------------------------- | :------- | :----------------------------------- |
| `ConsumptionForecastPage.tsx`  | D4       | Line chart (projected vs. actual)    |
| `SupplierPerformancePage.tsx`  | D5       | Bar chart (on-time %, quality score) |
| `StockMovementHistoryPage.tsx` | D6       | Table with timeline                  |
| `POSummaryPage.tsx`            | D7       | Bar chart (PO count/value by month)  |
| `LowStockAlertPage.tsx`        | D8       | Table with alert badges              |
| `DeadStockPage.tsx`            | D9       | Table + PieChart                     |
| `ABCAnalysisPage.tsx`          | D10      | Stacked bar + table                  |

**Each page structure:**

```tsx
export default function ConsumptionForecastPage() {
  const [branchId, setBranchId] = useState('');
  const [dateRange, setDateRange] = useState({ from, to });
  const { data, isLoading } = useInventoryReport('consumption_forecast', {
    branchId,
    ...dateRange,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={{ en: 'Consumption Forecast', ar: 'توقع الاستهلاك' }} />
      <FilterBar
        branchId={branchId}
        onBranchChange={setBranchId}
        dateRange={dateRange}
        onDateChange={setDateRange}
      />
      <ConsumptionForecastChart data={data?.chart} />
      <ConsumptionForecastTable data={data?.table} />
    </div>
  );
}
```

**Hook (new):** Add `useInventoryReport(type, params)` to inventory hooks file.

**Router entries:** 7 routes under `/inventory/reports/:type` or individual paths.

---

### D2. SavedReportsPage (Gap 5) — 1.5 hours

**File:** `apps/admin/src/features/reports/pages/SavedReportsPage.tsx` (NEW)

```tsx
// Lists saved reports with: name, type, category, savedAt, actions (load, delete)
// Uses useSavedReports() and useDeleteSavedReport() hooks (already defined in useReports.ts)
// Click row → navigate to ReportDetailPage with saved filters pre-loaded
```

**Router entry:** `{ path: '/reports/saved', element: <SavedReportsPage /> }`

---

### D3. ReportHistoryPage (Gap 6) — 1.5 hours

**File:** `apps/admin/src/features/reports/pages/ReportHistoryPage.tsx` (NEW)

```tsx
// Lists report generation history: reportType, format, status, generatedAt, downloadUrl
// Uses useReportHistory() hook (already defined)
// Status badges: pending (yellow), completed (green), failed (red)
// Download button for completed exports
```

**Router entry:** `{ path: '/reports/history', element: <ReportHistoryPage /> }`

---

## Phase E — Background Workers (Day 5, ~1.5 hours)

### E1. Inventory Expired-Batch Cron (Gap 13) — 1.5 hours

**File:** `apps/api/src/services/inventory-expiry.worker.ts` (NEW)

```ts
import { Worker, Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { getAllTenantConnections } from '../config/database.js';
import { InventoryStockService } from '../tenant/services/inventory-stock.service.js';
import { logger } from '../utils/logger.js';

const QUEUE_NAME = 'inventory-expiry';
const connection = getRedisConnection();
const queue = new Queue(QUEUE_NAME, { connection });

// Add repeatable job: every day at 02:00
await queue.add(
  'process-expired-batches',
  {},
  {
    repeat: { pattern: '0 2 * * *' }, // Daily at 02:00
  },
);

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    logger.info({ jobId: job.id }, 'Processing expired batches');
    const tenantConnections = await getAllTenantConnections();

    for (const { tenantDb, tenantId } of tenantConnections) {
      try {
        const stockService = new InventoryStockService(tenantDb, tenantId);
        const result = await stockService.processExpiredBatches();
        logger.info({ tenantId, ...result }, 'Expired batches processed');
      } catch (error) {
        logger.error({ tenantId, error }, 'Failed to process expired batches');
      }
    }
  },
  { connection, concurrency: 1 },
);

export { worker as inventoryExpiryWorker, queue as inventoryExpiryQueue };
```

**Register:** Import and start in `server.ts` alongside existing workers.

---

## Phase F — Test Coverage (Days 2–6, ~16 hours — runs in parallel)

### F1. `report-pipeline.service.test.ts` — 5 hours

**File:** `apps/api/src/tenant/services/report-pipeline.service.test.ts` (NEW)

**Coverage:** All 19+17=36 pipeline methods. Pattern from existing tests:

```ts
describe('ReportPipelineService', () => {
  let service: ReportPipelineService;
  let mockDb: Connection;

  beforeEach(() => {
    mockDb = createMockConnection();  // Mock MongoDB collections with aggregate()
    service = new ReportPipelineService(mockDb, 'tenant-1');
  });

  describe('Financial Pipelines', () => {
    it('revenueByPeriod returns summary + chart + table', async () => { ... });
    // F1-F7 tests
  });

  describe('Patient Pipelines', () => {
    it('patientOverview returns active/new/total counts', async () => { ... });
    // P1-P5 tests
  });

  // Same for Appointment (A1-A6), Clinical (C1-C4), Operational (O1-O4)
});
```

**Min tests:** 36 (one per pipeline) + 5 edge cases (empty data, invalid params, Redis cache hit/miss)

---

### F2. `reports.route.test.ts` — 4 hours

**File:** `apps/api/src/tenant/routes/reports/reports.route.test.ts` (NEW)

**Pattern:** Follow `inventory-items.route.test.ts` — `Fastify().register(reportRoutes)` + `app.inject()`:

```ts
vi.mock('../../services/report-pipeline.service.js', () => ({ ... }));
vi.mock('../../services/inventory-report-pipeline.service.js', () => ({ ... }));
vi.mock('../../middleware/index.js', () => ({ authGuard, tenantDbMiddleware, roleGuard: ... }));

describe('Reports Routes', () => {
  describe('GET /catalog', () => { ... });
  describe('GET /financial/:type', () => {
    it('returns real data for free report', async () => { ... });
    it('returns locked preview for paid report', async () => { ... });
    it('returns 404 for invalid type', async () => { ... });
  });
  // Same for patient, appointment, clinical, operational, inventory
  describe('POST /export', () => { ... });
  describe('CRUD /saved', () => { ... });
  describe('CRUD /scheduled', () => { ... });
  describe('GET /history', () => { ... });
});
```

**Min tests:** 30 (2 per category × 6 + catalog + export + saved CRUD + schedule CRUD + history)

---

### F3. `report-export.service.test.ts` — 2 hours

**File:** `apps/api/src/services/report-export.service.test.ts` (NEW)

Test: queue creation, CSV generation, Excel generation, PDF fallback, email sending, error handling.

**Min tests:** 10

---

### F4. `report-scheduler.service.test.ts` — 1.5 hours

**File:** `apps/api/src/services/report-scheduler.service.test.ts` (NEW)

Test: repeatable job setup, due schedule detection, report generation trigger, next-run calculation.

**Min tests:** 8

---

### F5. Inventory Route Tests (4 files) — 3.5 hours

| File                                 | Min Tests             |
| :----------------------------------- | :-------------------- |
| `inventory-stock.route.test.ts`      | 11 (one per endpoint) |
| `inventory-categories.route.test.ts` | 6                     |
| `stock-transfers.route.test.ts`      | 4                     |
| `stock-counts.route.test.ts`         | 7                     |

**Total Min Tests:** 28

Follow `inventory-items.route.test.ts` pattern exactly.

---

## Execution Timeline

| Day | Phase | Deliverables                                        | Est. Hours |
| :-: | :---: | :-------------------------------------------------- | :--------: |
|  1  |   A   | RBAC fix, catalog fix, report.schema.ts             |     2      |
| 1–2 | B1-B2 | Patient (5) + Appointment (6) pipelines             |     9      |
| 2–3 | B3-B5 | Clinical (4) + Operational (2) + Dashboard backend  |     7      |
| 3–4 | C1-C2 | ReportDetailPage + Inventory CATEGORY_CONFIG        |    4.5     |
|  4  | C3-C5 | Dashboard frontend wiring + Sidebar + Export dialog |    5.5     |
| 4–5 | D1-D3 | 7 inventory pages + SavedReports + History          |     8      |
|  5  |  E1   | Expired-batch BullMQ cron                           |    1.5     |
| 2–6 | F1-F5 | 8 test files (~112 tests)                           |     16     |

**Total: ~53.5 hours (6–7 working days)**

---

## Verification Checklist

After all phases complete, run this checklist:

- [ ] `pnpm build` — zero errors across all packages
- [ ] `pnpm test` — all tests pass (existing 235 + ~112 new = ~347 total)
- [ ] `GET /api/reports/catalog` returns 6 categories with correct names/icons
- [ ] `GET /api/reports/financial/revenue_summary` returns real pipeline data (not mock)
- [ ] `GET /api/reports/patient/patient_overview` returns real pipeline data
- [ ] `GET /api/reports/appointment/summary` returns real pipeline data
- [ ] `GET /api/reports/clinical/procedures_performed` returns real pipeline data
- [ ] `GET /api/reports/operational/wait_time_analysis` returns real pipeline data
- [ ] `GET /api/reports/inventory/material_usage` returns real pipeline data
- [ ] `POST /api/reports/export` queues BullMQ job successfully
- [ ] Dashboard page loads with live API data (no hardcoded values)
- [ ] Dashboard shows Low Stock Alert + Waiting Room widgets
- [ ] Sidebar shows all 10 report sub-links
- [ ] ReportDetailPage renders chart + table + export buttons
- [ ] 7 inventory report pages accessible and rendering charts
- [ ] SavedReportsPage lists and loads saved reports
- [ ] ReportHistoryPage shows generation history with download
- [ ] Report RBAC uses `reports:read` permission (not `inventory:read`)
- [ ] Inventory expired-batch cron fires at 02:00 daily
- [ ] All `@dento/shared` report schemas validate correctly
