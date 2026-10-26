# Week 19 — Reports & Analytics: Comprehensive Requirements Extraction

> **Generated from:** 10 planning documents, fully read  
> **Total lines scanned:** ~24,000+  
> **Purpose:** Single source of truth for Phase 5 / Week 19 implementation

---

## Table of Contents

1. [Document Authority Hierarchy](#1-document-authority-hierarchy)
2. [MASTER PLAN §21 — Reports & Analytics System](#2-master-plan-21--reports--analytics-system)
3. [V2_DATABASE — Collection Schemas](#3-v2_database--collection-schemas)
4. [BUILD_RULES — Coding Standards](#4-build_rules--coding-standards)
5. [V2_DECISION_LOG — Cross-Document Decisions](#5-v2_decision_log--cross-document-decisions)
6. [V2_STRUCTURE — File Layout](#6-v2_structure--file-layout)
7. [SECURITY_AND_ENCRYPTION — Security Rules](#7-security_and_encryption--security-rules)
8. [TECH_REQUIREMENTS — Stack & Libraries](#8-tech_requirements--stack--libraries)
9. [IMPLEMENTATION_ROADMAP — Phase Timing](#9-implementation_roadmap--phase-timing)
10. [PLATFORM_RBAC — Guard Middleware](#10-platform_rbac--guard-middleware)
11. [GAP ANALYSIS — Current Gaps & Implementation Plan](#11-gap-analysis--current-gaps--implementation-plan)
12. [Consolidated Checklists](#12-consolidated-checklists)

---

## 1. Document Authority Hierarchy

> **Source:** BUILD_RULES.md §1 (Lines 1–30)

When documents conflict, follow this priority (highest → lowest):

| Priority | Document                | Scope                    |
| -------- | ----------------------- | ------------------------ |
| 1st      | V2_DECISION_LOG         | Cross-document decisions |
| 2nd      | V2_DATABASE             | Schema definitions       |
| 3rd      | SECURITY_AND_ENCRYPTION | Security & encryption    |
| 4th      | IMPLEMENTATION_ROADMAP  | Phase timing             |
| 5th      | TECH_REQUIREMENTS       | Technology stack         |
| 6th      | V2_STRUCTURE            | File/folder layout       |
| 7th–8th  | Screen docs             | UI specifications        |
| 9th      | DENTO_V2_MASTER_PLAN    | Feature specifications   |

---

## 2. MASTER PLAN §21 — Reports & Analytics System

> **Source:** DENTO_V2_MASTER_PLAN.md Lines 4457–4900

### 2.1 Module Pricing Model

| Module              | Slug                 | Price   | Content                                                                         |
| ------------------- | -------------------- | ------- | ------------------------------------------------------------------------------- |
| Dashboard & Reports | `dashboard-reports`  | Free    | Dashboard widgets, basic reports (current period only)                          |
| Advanced Analytics  | `advanced-analytics` | $199/Mo | All reports, custom date ranges, charts, drill-down, exports, scheduled reports |

### 2.2 Complete Report Catalog (36 Reports)

#### Financial Reports (7) — Lines 4530–4545

| #   | Report             | Aggregation Source                              | Module                              |
| --- | ------------------ | ----------------------------------------------- | ----------------------------------- |
| F1  | Revenue Summary    | `invoices` → `$group` by period                 | Free (current month), Adv (history) |
| F2  | Revenue by Doctor  | `invoices` → `$lookup` appointments → `$group`  | Advanced                            |
| F3  | Revenue by Service | `invoices.items` → `$unwind` → `$group`         | Advanced                            |
| F4  | Revenue by Branch  | `invoices` → `$group` by branchId               | Advanced (Multi-Branch)             |
| F5  | Payment Collection | `payments` → `$group` by method                 | Advanced                            |
| F6  | Outstanding/Aging  | `invoices` WHERE status≠paid → `$bucket` by age | Advanced                            |
| F7  | Tax Report         | `invoices` → `$group` by period, `$sum` tax     | Advanced                            |

#### Patient Reports (5) — Lines 4548–4558

| #   | Report            | Aggregation Source                                   | Module   |
| --- | ----------------- | ---------------------------------------------------- | -------- |
| P1  | Patient Overview  | `patients` → `$facet` (total, new, active, inactive) | Free     |
| P2  | New vs. Returning | `appointments` → `$lookup` patients → `$group`       | Advanced |
| P3  | Demographics      | `patients` → `$bucket` age, `$group` by gender       | Advanced |
| P4  | No-Show Report    | `appointments` WHERE status=no_show → `$group`       | Advanced |
| P5  | Patient Source    | `patients` → `$group` by referralSource              | Advanced |

#### Appointment Reports (6) — Lines 4561–4575

| #   | Report                | Aggregation Source                                  | Module                      |
| --- | --------------------- | --------------------------------------------------- | --------------------------- |
| A1  | Appointment Summary   | `appointments` → `$group` by status, period         | Free (today), Adv (history) |
| A2  | Doctor Utilization    | `appointments` + `doctor_schedules` → %             | Advanced                    |
| A3  | Chair Utilization     | `appointments` WHERE chairId → `$group` → %         | Advanced                    |
| A4  | Cancellation Analysis | `appointments` WHERE cancelled → `$group` by reason | Advanced                    |
| A5  | Peak Hours Heatmap    | `appointments` → `$group` by dayOfWeek × hour       | Advanced                    |
| A6  | Avg Duration Analysis | `appointments` → `$avg` duration by service+doctor  | Advanced                    |

#### Clinical Reports (4) — Lines 4578–4588

| #   | Report                    | Aggregation Source                                 | Module   |
| --- | ------------------------- | -------------------------------------------------- | -------- |
| C1  | Procedures Performed      | `procedure_notes` → `$group` by procedureType      | Advanced |
| C2  | Treatment Plan Acceptance | `treatment_plans` → `$facet` by status             | Advanced |
| C3  | Lab Order Turnaround      | `lab_orders` → `$subtract` completedAt - createdAt | Advanced |
| C4  | Prescription Volume       | `prescriptions.items` → `$unwind` → `$group`       | Advanced |

#### Operational Reports (4) — Lines 4591–4601

| #   | Report               | Aggregation Source                                   | Module   |
| --- | -------------------- | ---------------------------------------------------- | -------- |
| O1  | Commission Summary   | `doctor_commissions` → `$group` by doctorId, status  | Advanced |
| O2  | Daily Reconciliation | `reconciliation` → by date, branch                   | Advanced |
| O3  | Wait Time Analysis   | `appointments` → `$subtract` startedAt - arrivedAt   | Advanced |
| O4  | Staff Productivity   | `appointments` + `invoices` → `$group` by doctor,day | Advanced |

#### Inventory Reports (10) — Defined in MASTER_PLAN §16 (Lines 2087–2156)

Material Usage, Stock Valuation, Expiry, Consumption Forecast, Supplier Performance, Stock Movement History, PO Summary, Low Stock, Dead Stock, ABC Analysis. These belong to `inventory-management` module ($29/Mo), NOT Advanced Analytics.

### 2.3 Dashboard Widgets (8 Widgets — Free Tier)

> **Source:** Lines 4664–4680

| Widget                | Data                                              | Visualization         |
| --------------------- | ------------------------------------------------- | --------------------- |
| Today's Overview      | Appointments (booked/confirmed/completed/no-show) | Stat-Cards + Donut    |
| Revenue This Month    | Current month revenue + trend vs. previous month  | Stat-Card + Sparkline |
| Patients This Month   | New patients + total visits + trend               | Stat-Card + Sparkline |
| Upcoming Appointments | Next 5 appointments with patient, doctor, time    | Mini-Table            |
| Recent Patients       | Last 5 registered/visited patients                | Mini-Table            |
| Low Stock Alert       | Top 5 items below reorder level                   | Alert-Cards           |
| Quick Actions         | New Appointment, Add Patient, View Queue          | Button Group          |
| Waiting Room          | Live waiting room occupancy                       | Badge + Counter       |

### 2.4 API Endpoints (16 Routes)

> **Source:** Lines 4824–4850

| #   | Method | Route                             | Module   |
| --- | ------ | --------------------------------- | -------- |
| 1   | GET    | `/api/dashboard/stats`            | Free     |
| 2   | GET    | `/api/dashboard/trends`           | Free     |
| 3   | GET    | `/api/reports/financial/:type`    | Advanced |
| 4   | GET    | `/api/reports/patients/:type`     | Advanced |
| 5   | GET    | `/api/reports/appointments/:type` | Advanced |
| 6   | GET    | `/api/reports/clinical/:type`     | Advanced |
| 7   | GET    | `/api/reports/operational/:type`  | Advanced |
| 8   | POST   | `/api/reports/export`             | Advanced |
| 9   | GET    | `/api/reports/saved`              | Advanced |
| 10  | POST   | `/api/reports/saved`              | Advanced |
| 11  | DELETE | `/api/reports/saved/:id`          | Advanced |
| 12  | GET    | `/api/reports/scheduled`          | Advanced |
| 13  | POST   | `/api/reports/scheduled`          | Advanced |
| 14  | PATCH  | `/api/reports/scheduled/:id`      | Advanced |
| 15  | DELETE | `/api/reports/scheduled/:id`      | Advanced |
| 16  | POST   | `/api/reports/scheduled/:id/run`  | Advanced |

**All report endpoints accept query parameters:**

- `from`, `to` — Date Range (ISO 8601)
- `branchId` — Branch filter (optional, Multi-Branch module)
- `doctorId` — Doctor filter (optional)
- `format` — Response format: `json` (default) | `csv` | `excel` | `pdf`

### 2.5 RBAC Permissions (Reports)

> **Source:** Lines 4858–4870

| Permission                 | Roles                                     |
| -------------------------- | ----------------------------------------- |
| `reports.dashboard.view`   | All Staff (Free)                          |
| `reports.basic.view`       | admin, manager, doctor, accountant (Free) |
| `reports.advanced.view`    | admin, manager, accountant (Advanced)     |
| `reports.financial.view`   | admin, manager, accountant (Advanced)     |
| `reports.export`           | admin, manager, accountant (Advanced)     |
| `reports.schedules.manage` | admin, manager (Advanced)                 |
| `reports.saved.manage`     | admin, manager, accountant (Advanced)     |

**Doctor role restriction:** "Doctor sees only their own stats, admin sees all" — V2_DECISION_LOG §5

### 2.6 UI Pages (9 Pages)

> **Source:** Lines 4792–4806

| #   | Page                | Route                         | Module   |
| --- | ------------------- | ----------------------------- | -------- |
| 1   | Dashboard           | `/`                           | Free     |
| 2   | Reports Hub         | `/reports`                    | Free     |
| 3   | Financial Reports   | `/reports/financial/:type`    | Advanced |
| 4   | Patient Reports     | `/reports/patients/:type`     | Advanced |
| 5   | Appointment Reports | `/reports/appointments/:type` | Advanced |
| 6   | Clinical Reports    | `/reports/clinical/:type`     | Advanced |
| 7   | Operational Reports | `/reports/operational/:type`  | Advanced |
| 8   | Saved Reports       | `/reports/saved`              | Advanced |
| 9   | Scheduled Reports   | `/reports/scheduled`          | Advanced |

### 2.7 Report Page Standard Layout

> **Source:** Lines 4808–4830

```
┌────────────────────────────────────────────────────┐
│  ← Back to Reports    [Title]          ⬇ Export    │
├────────────────────────────────────────────────────┤
│  📅 Date Range  🏥 Branch  👨‍⚕️ Doctor               │
│  [Apply Filters]  [Save as Report]  [Schedule]     │
├────────────────────────────────────────────────────┤
│  [ Summary Stat Cards (4) ]                        │
├────────────────────────────────────────────────────┤
│  📊 [Chart Type Toggle: Bar/Line/Pie]              │
│  [ Recharts Visualization ]                        │
├────────────────────────────────────────────────────┤
│  📋 Detail Table (TanStack Table — sortable)       │
└────────────────────────────────────────────────────┘
```

### 2.8 Sidebar Integration

```
📊 Reports
  ├── Dashboard               ← Free (dashboard-reports)
  ├── Reports Hub             ← Free (overview, locked reports marked)
  ├── Financial               ← Advanced Analytics 🔒
  ├── Patient                 ← Advanced Analytics 🔒
  ├── Appointment             ← Advanced Analytics 🔒
  ├── Clinical                ← Advanced Analytics 🔒
  └── Operational             ← Advanced Analytics 🔒
```

Locked reports show preview with blur + "Upgrade to Advanced Analytics" CTA.

### 2.9 Scheduled Reports (BullMQ)

> **Source:** Lines 4698–4738

- **Collection:** `report_schedules` in Tenant DB
- **Fields:** reportType, reportParams (filters), frequency (daily/weekly/monthly), timezone, deliveryMethod (email/in_app/both), recipients, emailAddresses, format (pdf/csv/excel)
- **BullMQ Cron:** `report-scheduler` runs daily at 00:05 UTC
  1. Find all schedules WHERE `nextRunAt ≤ NOW AND isActive = true`
  2. Enqueue job in `report-generation` queue
  3. Update `nextRunAt` based on frequency
- **Worker:** `report-generation`
  1. `useDb(tenantDbName)`
  2. Run aggregation pipeline
  3. Generate PDF/CSV/Excel
  4. Upload to S3/R2
  5. Deliver: Email → Resend, In-App → Notification
  6. Log in `report_history`

### 2.10 Export System

> **Source:** Lines 4745–4770

| Format | Library               | Usage                                |
| ------ | --------------------- | ------------------------------------ |
| CSV    | `@fast-csv/format`    | Tabular data, fast, small            |
| Excel  | `exceljs`             | Multi-sheet, formatting, charts      |
| PDF    | `@react-pdf/renderer` | React components → PDF (server-side) |

**Export Flow:** `POST /api/reports/export` → Run pipeline → Switch format → Stream response with `Content-Disposition: attachment`

### 2.11 Aggregation Pipeline Examples

> **Source:** Lines 4688–4745

Three complete pipeline examples are provided:

1. **Revenue Summary (F1):** `$match` status=paid → `$group` by month → `$sum` totalAmount → `$sort` → `$project`
2. **Peak Hours Heatmap (A5):** `$match` by date range + status → `$group` by dayOfWeek × hour → 7×12 matrix
3. **Outstanding Aging (F6):** `$match` status∈[sent,overdue,partially_paid] → `$addFields` ageDays → `$bucket` [0,31,61,91,∞]

### 2.12 Webhook Events (Reports)

> **Source:** Lines 4872–4880

```javascript
const REPORT_EVENTS = [
  'report.generated',
  'report.generation_failed',
  'report.exported',
  'report.schedule.created',
  'report.schedule.deleted',
];
```

---

## 3. V2_DATABASE — Collection Schemas

> **Source:** V2_DATABASE.md (3618 lines, fully read)

### 3.1 Collections Used by Report Pipelines

| Collection            | DB Section | Key Fields for Aggregation                                                                      |
| --------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `invoices`            | §7.1       | status, totalAmount, balanceDue, items[], issueDate, paidAt, branchId                           |
| `payments`            | §7.2       | amount, paymentMethod, status, receivedAt                                                       |
| `patients`            | §5.1       | dateOfBirth, gender, source, howDidYouHear, isActive, createdAt                                 |
| `appointments`        | §6.1       | date, status, doctorId, branchId, serviceId, arrivedAt, startedAt, completedAt, durationMinutes |
| `doctor_schedules`    | §6.3       | doctorId, branchId, dayOfWeek, startTime, endTime                                               |
| `procedure_notes`     | §5.5       | procedureName, doctorId, patientId, createdAt                                                   |
| `treatment_plans`     | §5.4       | status (draft/proposed/accepted/in_progress/completed/cancelled), items[]                       |
| `lab_orders`          | §5.12      | status, createdAt, completedAt (actualDeliveryDate)                                             |
| `prescriptions`       | §5.7       | items[].medicationName, doctorId, createdAt                                                     |
| `doctor_commissions`  | §7.3       | doctorId, commissionAmount, status (pending/approved/paid)                                      |
| `reconciliation`      | §7.6       | branchId, reconciliationDate, cashReceived, cardReceived, discrepancy                           |
| `walk_in_queue`       | §6.4       | branchId, status, checkInTime, calledAt, startedAt                                              |
| `inventory_items`     | §8.1       | sku, categoryId, purchasePrice, sellingPrice, expiryTracking                                    |
| `inventory_stock`     | §8.2       | itemId, branchId, currentQuantity, batches[].expiryDate                                         |
| `inventory_movements` | §8.3       | itemId, type, quantity, referenceType, createdAt                                                |
| `purchase_orders`     | §8.6       | items[], totalAmount, status, supplierId                                                        |
| `suppliers`           | §8.5       | name, rating                                                                                    |
| `stock_transfers`     | §8.7       | sourceBranchId, destinationBranchId, items[], status                                            |
| `stock_counts`        | §8.8       | items[].discrepancy, branchId                                                                   |
| `report_schedules`    | §11.5      | reportType, schedule, filters, format, recipients, isActive                                     |

### 3.2 Key Indexes for Report Performance

> **Source:** V2_DATABASE.md §12 (Lines 3255–3330)

| Collection        | Index                                   | Purpose                      |
| ----------------- | --------------------------------------- | ---------------------------- |
| `appointments`    | `{ date, doctorId, startTime }`         | Calendar day view per doctor |
| `appointments`    | `{ branchId, date, status }`            | Branch dashboard             |
| `invoices`        | `{ status, dueDate }`                   | Overdue invoices (Aging F6)  |
| `procedure_notes` | `{ patientId, createdAt: -1 }`          | Treatment history            |
| `inventory_stock` | `{ itemId, branchId }` unique           | Stock lookup                 |
| `inventory_stock` | `{ batches.expiryDate: 1 }`             | Expiry warnings              |
| `audit_logs`      | `{ tenantId, action, performedAt: -1 }` | Audit search                 |

### 3.3 Financial Schema Details (Decision Log §32)

> **Source:** V2_DECISION_LOG.md Lines 1890–1960

**IMPORTANT:** Invoices and payments use **status-based lifecycle**, NOT `isActive` soft-delete:

- Invoices: `draft | issued | paid | partially_paid | overdue | cancelled | refunded`
- Payments: `pending | completed | failed | refunded`
- Reconciliation: `open | closed | reviewed`

This is an explicit override of the standard `isActive` pattern per Decision Log §32.

---

## 4. BUILD_RULES — Coding Standards

> **Source:** BUILD_RULES.md (2027 lines, fully read)

### 4.1 API Response Format

> **Source:** BUILD_RULES.md §4 (Lines 85–130)

**Success:**

```typescript
{
  success: true,
  data: T,
  message: string,
  meta?: { page, limit, total, totalPages }
}
```

**Error:**

```typescript
{
  statusCode: number,
  error: string,        // HTTP status name
  message: string,
  details: string[],    // Zod validation errors
  requestId: string,
  timestamp: string     // ISO 8601
}
```

Use `apiResponse()` and `apiError()` helpers — NEVER construct response objects manually.

### 4.2 API Route Conventions

> **Source:** BUILD_RULES.md §3 (Lines 60–84)

- No version prefix: `/api/{plural-noun}` (Decision Log §33 overrides §21's `/api/v1/`)
- kebab-case routes: `/api/reports/financial/revenue-summary`
- Tenant identification: `X-Tenant-Slug` header (NOT URL segment)
- Route file max: **150 lines** per file

### 4.3 Middleware Chain (Tenant Routes)

> **Source:** BUILD_RULES.md §5 (Lines 131–200)

```typescript
// EVERY tenant route MUST have this 3-stage chain:
authGuard → tenantDbMiddleware → roleGuard('module', 'permission')
```

- `authGuard`: Validates JWT access token, extracts userId
- `tenantDbMiddleware`: Resolves `X-Tenant-Slug` → `mongoose.connection.useDb('tenant_{slug}')`
- `roleGuard('reports', 'read')`: Checks if user's role has the required permission

### 4.4 Backend Service Pattern

> **Source:** BUILD_RULES.md §5 (Lines 160–200)

```typescript
// Model Factory Pattern
export function getReportScheduleModel(connection: Connection) {
  return (
    connection.models.ReportSchedule || connection.model('ReportSchedule', reportScheduleSchema)
  );
}

// Service Class Pattern
export class ReportService {
  constructor(private connection: Connection) {}

  async getRevenueSummary(params: RevenueQuerySchema) {
    const Invoice = getInvoiceModel(this.connection);
    return Invoice.aggregate(pipeline);
  }
}

// Route Handler Pattern (thin)
async function handler(request: FastifyRequest, reply: FastifyReply) {
  const db = getTenantDb(request);
  const userId = getUserId(request);
  const service = new ReportService(db);
  const data = await service.getRevenueSummary(request.query);
  return apiResponse(reply, data);
}
```

### 4.5 Shared Package / Zod Schemas

> **Source:** BUILD_RULES.md §7 (Lines 230–270)

- **All schemas** live in `packages/shared/src/schemas/`
- `.strict()` on ALL create/update schemas (no extra fields allowed)
- `.coerce` for URL query parameters (dates, numbers from strings)
- Export from `schemas/index.ts` barrel file
- **Schema file max:** 100 lines per file

```typescript
// Example: packages/shared/src/schemas/report.schema.ts
import { z } from 'zod';

export const reportQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    branchId: z.string().optional(),
    doctorId: z.string().optional(),
    format: z.enum(['json', 'csv', 'excel', 'pdf']).default('json'),
  })
  .strict();

export type ReportQuery = z.infer<typeof reportQuerySchema>;
```

### 4.6 Frontend Patterns

> **Source:** BUILD_RULES.md §8 (Lines 270–380)

#### Feature Folder Structure

```
features/reports/
  ├── pages/
  │   ├── DashboardPage.tsx       (max 150 lines)
  │   ├── ReportsHubPage.tsx
  │   ├── ReportDetailPage.tsx    (generic chart+table+filters)
  │   ├── SavedReportsPage.tsx
  │   └── ReportHistoryPage.tsx
  ├── components/
  │   ├── ReportCard.tsx          (max 200 lines)
  │   ├── ChartWrapper.tsx
  │   ├── DateRangePicker.tsx
  │   └── ExportButtons.tsx
  └── hooks/
      └── useReports.ts           (max 100 lines)
```

#### React Query Pattern

```typescript
// Query Keys Factory
export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (filters: ReportQuery) => [...reportKeys.lists(), filters] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (category: string, type: string) => [...reportKeys.details(), category, type] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
};

// Hook Pattern
export function useReportData(category: string, type: string, filters: ReportQuery) {
  return useQuery({
    queryKey: reportKeys.detail(category, type),
    queryFn: () => reportApi.getReport(category, type, filters),
    staleTime: 5 * 60 * 1000, // 5 min cache (matches Redis)
  });
}
```

#### Form Pattern

```typescript
const form = useForm<SavedReportSchema>({
  resolver: zodResolver(savedReportCreateSchema),  // from @dento/shared
  defaultValues: { ... },
});
```

#### State Management Rules

| State Type      | Tool            | Example                        |
| --------------- | --------------- | ------------------------------ |
| Server state    | TanStack Query  | Report data, dashboard stats   |
| Client UI state | Zustand         | Sidebar open, selected filters |
| Form state      | React Hook Form | Report filters form            |
| URL state       | useSearchParams | Date range, category, type     |

### 4.7 UI Components

> **Source:** BUILD_RULES.md §9 (Lines 380–430)

- **Component library:** Shadcn/ui primitives
- **Icons:** Lucide React
- **Charts:** Recharts 2.x (composable, responsive, RTL-compatible)
- **Tables:** TanStack Table 8.x with `manualPagination`
- **Calendar:** FullCalendar (free tier)

**DataTable Pattern:**

```typescript
<DataTable
  columns={columns}
  data={data}
  manualPagination
  pageCount={meta.totalPages}
  onPaginationChange={setPagination}
  onSortingChange={setSorting}
/>
```

### 4.8 RTL Rules

> **Source:** BUILD_RULES.md §11 (Lines 460–520)

**NEVER use left/right — ALWAYS use logical properties:**

| ❌ Forbidden | ✅ Required  |
| ------------ | ------------ |
| `ml-4`       | `ms-4`       |
| `mr-4`       | `me-4`       |
| `pl-4`       | `ps-4`       |
| `pr-4`       | `pe-4`       |
| `left-0`     | `start-0`    |
| `right-0`    | `end-0`      |
| `text-left`  | `text-start` |
| `text-right` | `text-end`   |
| `border-l`   | `border-s`   |
| `border-r`   | `border-e`   |
| `rounded-l`  | `rounded-s`  |
| `rounded-r`  | `rounded-e`  |

- **Arabic font:** IBM Plex Sans Arabic
- **Numbers:** Always Western (0-9), never Eastern Arabic
- **Dates:** DD/MM/YYYY format, Gregorian primary
- **Chevrons in RTL:** `<ChevronRight className="rtl:rotate-180" />`
- **Recharts RTL:** Use `reversed` props for RTL axes

### 4.9 Responsive Design

> **Source:** BUILD_RULES.md §12 (Lines 520–560)

| Breakpoint | Name    | Width  | Tailwind |
| ---------- | ------- | ------ | -------- |
| Mobile     | default | 0px    | —        |
| Tablet     | md      | 768px  | `md:`    |
| Desktop    | lg      | 1024px | `lg:`    |
| Wide       | xl      | 1440px | `xl:`    |

- **Mobile-first** approach
- Tables → cards on mobile
- Sidebar: hidden (mobile) → collapsed (tablet) → expanded (desktop)
- Forms: single column → 2-column on desktop
- Report charts: full-width on mobile, 2-col grid on desktop

### 4.10 Accessibility (WCAG 2.1 AA)

> **Source:** BUILD_RULES.md §13 (Lines 560–600)

- Color contrast ≥ **4.5:1**
- Focus ring: `ring-2 ring-offset-2 ring-brand-500`
- Keyboard navigation on all interactive elements
- `aria-label` on icon-only buttons (e.g., Export button)
- `aria-describedby` for form validation errors
- Skip-nav link at top of page
- ESLint `jsx-a11y` plugin **MUST NOT** be disabled
- Charts must have `aria-label` describing the data

### 4.11 Dark Mode

> **Source:** BUILD_RULES.md §10 (Lines 430–460)

- Class-based via `dark:` prefix, toggled by ThemeProvider
- **Every component MUST support dark mode**
- Brand colors via CSS custom properties: `--color-brand-*`
- `useBrandingTheme()` called in DashboardLayout ONLY — generates 25 shades (50–950)
- Fallback brand color: green `#16a34a`

### 4.12 Animation Standards

> **Source:** BUILD_RULES.md §14 (Lines 600–640)

| Element        | Duration |
| -------------- | -------- |
| Sidebar        | 200ms    |
| Modal          | 150ms    |
| Toast          | 200ms    |
| Skeleton pulse | 1500ms   |

- `transform` and `opacity` ONLY (no layout-triggering properties)
- `prefers-reduced-motion` MUST be respected (disables all animations)
- **NO page transitions**

### 4.13 Loading / Error / Empty States

> **Source:** BUILD_RULES.md §15 (Lines 640–700)

**Three standard components — used in EVERY data-fetching page:**

```typescript
// Loading
<TableSkeleton columns={5} rows={10} />

// Error
<ErrorState
  title="Failed to load report"
  message={error.message}
  onRetry={refetch}
/>

// Empty
<EmptyState
  icon={BarChart3}
  title="No data for this period"
  description="Try adjusting your date range or filters"
  action={{ label: "Clear Filters", onClick: clearFilters }}
/>
```

**Standard query pattern:**

```typescript
if (isLoading) return <TableSkeleton />;
if (isError) return <ErrorState onRetry={refetch} />;
if (!data?.length) return <EmptyState />;
return <ReportContent data={data} />;
```

### 4.14 Toast Notifications

> **Source:** BUILD_RULES.md §24 (Lines 1500–1560)

**Every mutation MUST show a toast notification:**

| Action           | Toast Type | Message Pattern                 |
| ---------------- | ---------- | ------------------------------- |
| Export started   | info       | "Generating {format} export..." |
| Export completed | success    | "Report exported successfully"  |
| Report saved     | success    | "Report configuration saved"    |
| Schedule created | success    | "Report schedule created"       |
| Schedule deleted | success    | "Schedule deleted"              |
| API error        | error      | Server error message            |
| Validation error | warning    | First validation error detail   |

### 4.15 Security Rules for Reports

> **Source:** BUILD_RULES.md §16 (Lines 700–900)

- **PII fields encrypted with AES-256-GCM:** nationalId, policyNumber, medicalHistory.notes (if reports include these, decryption needed)
- **Three validation layers:** Frontend Zod → Backend Zod → Mongoose
- **Rate limiting:** 1000/min for API key routes, 100/min for authenticated routes
- **Audit logging:** Append-only, 365-day TTL, NEVER log PII in audit entries
- **Tenant isolation:** 8 layers (JWT claim → middleware → useDb → no cross-references)
- **`dangerouslySetInnerHTML`:** FORBIDDEN
- **Frontend:** Access token in memory only (no localStorage/sessionStorage for tokens)

### 4.16 Testing Standards (Phase 5+)

> **Source:** BUILD_RULES.md §18 (Lines 950–1050)

#### Coverage Targets

| Metric     | Phase 3 | Phase 4 | **Phase 5+** |
| ---------- | ------- | ------- | ------------ |
| Statements | 60%     | 65%     | **70%**      |
| Branches   | 50%     | 55%     | **60%**      |
| Functions  | 60%     | 65%     | **70%**      |
| Lines      | 60%     | 65%     | **70%**      |

#### Test File Naming

```
report-pipeline.service.test.ts    (backend service)
reports.route.test.ts              (backend route)
report-export.service.test.ts      (export service)
report-scheduler.service.test.ts   (scheduler)
inventory-reports.route.test.ts    (inventory routes)
DashboardPage.test.tsx             (frontend page)
ReportDetailPage.test.tsx          (frontend page)
useReports.test.ts                 (frontend hook)
```

#### What to Test per Layer

| Layer   | Test Focus                                                  |
| ------- | ----------------------------------------------------------- |
| Service | Aggregation pipeline results, edge cases, empty data        |
| Route   | Status codes, auth guards, validation, response format      |
| Page    | Renders loading/error/empty/data states, filter interaction |
| Hook    | Query key correctness, cache invalidation, error handling   |

#### Test Infrastructure

- **Vitest 2.x** — test runner
- **mongodb-memory-server** — in-memory MongoDB for integration tests
- **MSW 2.x** — API mocking for frontend tests
- **supertest** — HTTP assertion for route tests
- **@testing-library/react** — component rendering

### 4.17 Build Verification Checklist

> **Source:** BUILD_RULES.md §19 (Lines 1050–1100)

**After EVERY implementation session, run these 6 steps:**

1. `turbo build` — 0 TS errors
2. `turbo lint` — 0 new ESLint errors
3. `tsc --noEmit` — type-check passes
4. Verify new files exist at correct paths
5. `turbo test` — all tests pass
6. Cross-layer integration check (frontend calls → backend routes → database)

### 4.18 Post-Implementation Compliance Scan

> **Source:** BUILD_RULES.md §28 (Lines 1900–2027)

**Mandatory after EVERY feature implementation.** Scan against all 6 core planning docs:

1. V2_DECISION_LOG
2. V2_DATABASE
3. SECURITY_AND_ENCRYPTION
4. IMPLEMENTATION_ROADMAP
5. TECH_REQUIREMENTS
6. V2_STRUCTURE

**Failure Policy:**

- **Critical:** Fix before proceeding
- **Moderate:** Fix same session
- **Info:** Document and defer

### 4.19 Integration & Connectivity Rules

> **Source:** BUILD_RULES.md §24 (Lines 1500–1560)

- Every sidebar link → real page (no dead links)
- Every button → working handler
- Frontend ↔ Backend contract verification chain
- **Form field names must exactly match API field names end-to-end**
- Toast notifications for every mutation

---

## 5. V2_DECISION_LOG — Cross-Document Decisions

> **Source:** V2_DECISION_LOG.md (2160 lines, 33 decisions)

### Decisions Affecting Reports:

| #   | Decision            | Ruling                                                                                                 | Lines     |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------ | --------- |
| §1  | Auth Hash           | Argon2id (NOT bcrypt — overrides MASTER_PLAN)                                                          | 1–80      |
| §2  | API Format          | `apiResponse()` / `apiError()` helpers, standard envelope                                              | 80–160    |
| §3  | OpenAPI             | Auto-generated via `@fastify/swagger` at `/docs`                                                       | 160–220   |
| §5  | Aggregation/Cache   | Redis cache 5min, key `report:{tenantSlug}:{reportType}:{hash}`. Doctor sees own stats, admin sees all | 300–400   |
| §10 | Test Infrastructure | Vitest + mongodb-memory-server + MSW + supertest                                                       | 600–700   |
| §12 | Accessibility       | WCAG 2.1 AA, jsx-a11y enforced                                                                         | 750–820   |
| §13 | Loading States      | Three components: TableSkeleton, ErrorState, EmptyState                                                | 820–880   |
| §14 | Responsive          | 4 breakpoints, mobile-first                                                                            | 880–940   |
| §15 | Animation           | Minimal, no page transitions, prefers-reduced-motion                                                   | 940–980   |
| §28 | Structured Logging  | Pino JSON, redaction, correlation ID, Axiom aggregation                                                | 1600–1760 |
| §30 | Socket.io           | Redis Adapter, room architecture (may be needed for live dashboard)                                    | 1780–1850 |
| §32 | Financial isActive  | Invoices/payments use status-based lifecycle, NOT isActive                                             | 1890–1960 |
| §33 | Route Prefix        | `/api/` (NO version prefix, NO `/tenant-api/`)                                                         | 1960–2000 |

### 5.1 Report Caching Strategy (Decision §5)

```typescript
// Redis cache for report data
const cacheKey = `report:${tenantSlug}:${reportType}:${hash}`;
const TTL = 5 * 60; // 5 minutes

// Check cache first
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Run aggregation
const result = await collection.aggregate(pipeline);

// Store in cache
await redis.set(cacheKey, JSON.stringify(result), 'EX', TTL);
```

### 5.2 Structured Logging (Decision §28)

> **Source:** Lines 1600–1760

```typescript
// Pino 9.x configuration
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'password',
    'nationalId',
    'policyNumber',
  ],
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      requestId: req.id,
    }),
  },
});
```

**Log Levels:**

| Level | Usage                                              |
| ----- | -------------------------------------------------- |
| fatal | App crash, DB connection lost                      |
| error | Unhandled errors, failed aggregations              |
| warn  | Slow queries (>3s), cache miss, retry              |
| info  | Request/response, report generated, export started |
| debug | Pipeline details, cache hit/miss, query params     |
| trace | Full aggregation result (dev only)                 |

**Correlation ID:** `X-Request-Id` header propagated: Fastify → Service → BullMQ → Response header → Frontend

---

## 6. V2_STRUCTURE — File Layout

> **Source:** V2_STRUCTURE.md (1559 lines, fully read)

### 6.1 Backend Reports Files

```
apps/api/src/
  tenant/
    routes/
      reports/
        reports.route.ts         (max 150 lines per file)
        reports.test.ts
        pipelines/
          financial/
            revenue-summary.pipeline.ts
            revenue-by-doctor.pipeline.ts
            revenue-by-service.pipeline.ts
            revenue-by-branch.pipeline.ts
            payment-collection.pipeline.ts
            outstanding-aging.pipeline.ts
            tax-report.pipeline.ts
          patient/
            patient-overview.pipeline.ts
            new-vs-returning.pipeline.ts
            demographics.pipeline.ts
            no-show.pipeline.ts
            patient-source.pipeline.ts
          appointment/
            appointment-summary.pipeline.ts
            doctor-utilization.pipeline.ts
            chair-utilization.pipeline.ts
            cancellation-analysis.pipeline.ts
            peak-hours.pipeline.ts
            avg-duration.pipeline.ts
          clinical/
            procedures-performed.pipeline.ts
            treatment-acceptance.pipeline.ts
            lab-turnaround.pipeline.ts
            prescription-volume.pipeline.ts
          operational/
            commission-summary.pipeline.ts
            daily-reconciliation.pipeline.ts
            wait-time.pipeline.ts
            staff-productivity.pipeline.ts
          inventory/
            (10 pipeline files)
    models/
      report.model.ts
    services/
      report-pipeline.service.ts
      report-export.service.ts
  jobs/
    workers/
      report.worker.ts
```

### 6.2 Frontend Reports Files

```
apps/admin/src/
  features/
    reports/
      pages/
        DashboardPage.tsx
        ReportsHubPage.tsx
        PatientReportsPage.tsx
        AppointmentReportsPage.tsx
        FinancialReportsPage.tsx
        ClinicalReportsPage.tsx
        InventoryReportsPage.tsx
        OperationalReportsPage.tsx
        SavedReportsPage.tsx
        ReportHistoryPage.tsx
      components/
        ReportCard.tsx
        ChartWrapper.tsx
        DateRangePicker.tsx
        ExportButtons.tsx
      hooks/
        useReports.ts
```

### 6.3 Shared Package

```
packages/shared/src/
  schemas/
    report.schema.ts          ← MISSING (Gap #3)
    index.ts                  ← Must export report schemas
```

### 6.4 File Size Limits

> **Source:** V2_STRUCTURE.md §14 (Lines 1450–1500)

| File Type       | Max Lines |
| --------------- | --------- |
| React Component | 200       |
| Page            | 150       |
| Hook            | 100       |
| Service         | 300       |
| Route           | 150       |
| Model           | 150       |
| Schema          | 100       |
| Test            | 300       |
| Pipeline        | N/A       |

### 6.5 Naming Conventions

> **Source:** V2_STRUCTURE.md §12 (Lines 1380–1440)

- **Folders:** kebab-case (`report-pipelines/`)
- **React components:** PascalCase.tsx (`ReportCard.tsx`)
- **Hooks:** camelCase with `use` prefix (`useReports.ts`)
- **Stores:** `.store.ts` suffix (`reports.store.ts`)
- **Schemas:** `.schema.ts` suffix (`report.schema.ts`)
- **Models:** `.model.ts` suffix (`report.model.ts`)
- **Routes:** `.route.ts` suffix (`reports.route.ts`)
- **Services:** `.service.ts` suffix (`report-pipeline.service.ts`)
- **Tests:** `.test.ts` / `.test.tsx` suffix
- **Pipelines:** `.pipeline.ts` suffix
- **Workers:** `.worker.ts` suffix
- **Crons:** `.cron.ts` suffix
- **MongoDB collections:** snake_case (`report_schedules`)
- **API routes:** kebab-case (`/api/reports/financial/revenue-summary`)
- **Env vars:** SCREAMING_SNAKE (`REDIS_URL`)

### 6.6 Import Rules

> **Source:** V2_STRUCTURE.md §13 (Lines 1440–1460)

- `@dento/shared` importable by ALL packages and apps
- `@dento/ui` only importable by `admin` and `developer` apps
- Apps NEVER cross-import from each other
- Frontend NEVER imports backend code directly

---

## 7. SECURITY_AND_ENCRYPTION — Security Rules

> **Source:** SECURITY_AND_ENCRYPTION.md (1108 lines, fully read)

### 7.1 Tenant Isolation (8 Layers)

1. JWT contains `tenantSlug` claim
2. `tenantDbMiddleware` extracts and validates slug
3. `mongoose.connection.useDb('tenant_{slug}')` — separate DB per tenant
4. No cross-tenant ObjectId references possible
5. Aggregation pipelines run on tenant-scoped connection only
6. Redis cache keys namespaced: `report:{tenantSlug}:...`
7. BullMQ jobs include tenantSlug in job data
8. File uploads namespaced by tenantSlug in S3/R2

### 7.2 PII in Reports

If any report pipeline outputs PII-encrypted fields, they must be decrypted at the service layer:

| Field                               | Encryption  | Notes                                  |
| ----------------------------------- | ----------- | -------------------------------------- |
| `patients.nationalId`               | AES-256-GCM | Never include in report exports        |
| `patients.insurance[].policyNumber` | AES-256-GCM | Mask in reports: `***1234`             |
| `patients.medicalHistory.notes`     | AES-256-GCM | Only in clinical reports if authorized |

### 7.3 Export File Security

- Exported files (PDF/CSV/Excel) contain tenant data — treat as sensitive
- Upload to S3/R2 with SSE-S3 encryption
- Pre-signed URLs with 1-hour expiry for download
- Audit log entry for every export: `action: 'export'`

### 7.4 Auth Chain for Reports

```
Request → authGuard (validate JWT)
        → tenantDbMiddleware (resolve tenant DB)
        → roleGuard('reports', 'read') (check RBAC)
        → moduleGuard('dashboard-reports' | 'advanced-analytics') (check module license)
        → handler
```

---

## 8. TECH_REQUIREMENTS — Stack & Libraries

> **Source:** TECH_REQUIREMENTS.md (1004 lines, fully read)

### Libraries Required for Reports

| Library             | Version | Purpose                       |
| ------------------- | ------- | ----------------------------- |
| Recharts            | 2.x     | Chart rendering               |
| @react-pdf/renderer | 3.x     | PDF generation (server-side)  |
| @fast-csv/format    | 5.x     | CSV generation                |
| exceljs             | 4.x     | Excel generation              |
| BullMQ              | 5.x     | Job queue (report scheduling) |
| Redis (ioredis)     | 5.x     | Cache + BullMQ backend        |
| TanStack Table      | 8.x     | Report detail tables          |
| TanStack Query      | 5.x     | Server state management       |
| Zod                 | 3.x     | Schema validation             |
| Pino                | 9.x     | Structured logging            |
| date-fns            | 3.x     | Date manipulation             |

### MongoDB Driver Requirements

- `mongoose` 8.x
- `mongoose.connection.useDb()` with `{ useCache: true }`
- `maxPoolSize: 50`

---

## 9. IMPLEMENTATION_ROADMAP — Phase Timing

> **Source:** IMPLEMENTATION_ROADMAP.md (797 lines, fully read)

### Phase 5 / Week 19 Scope

- **Week 19:** Reports & Analytics
- **Dependencies:** Phase 4 Financial (invoices, payments) must be complete
- **Deliverables:** Dashboard widgets, all 36 report pipelines, export system, scheduled reports, full test coverage

### Phase 5+ Coverage Targets

As defined in BUILD_RULES §18.2: **70% statements, 60% branches, 70% functions, 70% lines**

---

## 10. PLATFORM_RBAC — Guard Middleware

> **Source:** PLATFORM_RBAC.md (1268 lines, fully read)

### Relevant to Reports:

The `platformGuard` middleware is for the Developer Portal (platform-level routes), NOT for tenant-level report routes. However, the pattern is the same:

```typescript
// Tenant-level (for reports)
app.get(
  '/api/reports/financial/:type',
  { preHandler: [authGuard, tenantDbMiddleware, roleGuard('reports', 'read')] },
  handler,
);

// Platform-level (for SaaS analytics in dev portal)
app.get(
  '/api/platform/analytics',
  { preHandler: [authGuard, platformGuard('analytics', 'read')] },
  handler,
);
```

### RBAC Role Hierarchy (8 roles)

> **Source:** BUILD_RULES.md §17 (Lines 900–950)

```
owner > admin > manager > doctor > accountant > nurse > receptionist > lab_tech
```

Report access per role:

| Role         | Dashboard | Basic Reports | Financial | Export | Schedules |
| ------------ | --------- | ------------- | --------- | ------ | --------- |
| owner        | ✅        | ✅            | ✅        | ✅     | ✅        |
| admin        | ✅        | ✅            | ✅        | ✅     | ✅        |
| manager      | ✅        | ✅            | ✅        | ✅     | ✅        |
| doctor       | ✅        | ✅ (own data) | ❌        | ❌     | ❌        |
| accountant   | ✅        | ✅            | ✅        | ✅     | ❌        |
| nurse        | ✅        | ❌            | ❌        | ❌     | ❌        |
| receptionist | ✅        | ❌            | ❌        | ❌     | ❌        |
| lab_tech     | ✅        | ❌            | ❌        | ❌     | ❌        |

---

## 11. GAP ANALYSIS — Current Gaps & Implementation Plan

> **Source:** WEEK_19_REPORTS_GAP_ANALYSIS.md (1060 lines, fully read)

### 11.1 Current State

| Category    | Exists                    | Missing                    |
| ----------- | ------------------------- | -------------------------- |
| Financial   | 9 pipelines ✅            | 0                          |
| Patient     | 0                         | 5                          |
| Appointment | 0                         | 6                          |
| Clinical    | 0                         | 4                          |
| Operational | 2 pipelines ✅            | 2                          |
| Inventory   | 10 pipelines ✅ (backend) | 7 frontend pages           |
| **Total**   | **19 real + 2 partial**   | **17 pipelines + 7 pages** |

### 11.2 Critical Gaps (P0)

| Gap # | Issue                         | Location                         | Fix                                                             |
| ----- | ----------------------------- | -------------------------------- | --------------------------------------------------------------- |
| 1     | **RBAC BUG** — wrong module   | reports.route.ts L286            | `roleGuard('inventory','read')` → `roleGuard('reports','read')` |
| 2     | **Catalog missing inventory** | reports.route.ts catalog handler | Add inventory to categoryNames/categoryIcons                    |
| 3     | **report.schema.ts MISSING**  | @dento/shared                    | Create Zod schemas                                              |
| 4     | **Dashboard 100% hardcoded**  | DashboardPage.tsx (436 lines)    | Wire to live API hooks                                          |
| 12    | **0% test coverage**          | All report files                 | Create 8 test files                                             |

### 11.3 Missing Pipelines (17)

| Category        | Pipelines to Build                                                                    | Hours |
| --------------- | ------------------------------------------------------------------------------------- | ----- |
| Patient (5)     | P1–P5: overview, new-vs-returning, demographics, no-show, source                      | 4h    |
| Appointment (6) | A1–A6: summary, Dr utilization, chair utilization, cancellation, peak hours, duration | 5h    |
| Clinical (4)    | C1–C4: procedures, treatment acceptance, lab turnaround, prescriptions                | 3h    |
| Operational (2) | O3–O4: wait time, staff productivity                                                  | 2h    |
| Dashboard       | Live data for 8 widgets                                                               | 2h    |

### 11.4 Missing Frontend Pages (10)

| Page              | Description                             | Hours |
| ----------------- | --------------------------------------- | ----- |
| ReportDetailPage  | Generic chart+table+filters+export view | 4h    |
| 7 Inventory pages | D4–D10 backend exists, no UI            | 5h    |
| SavedReportsPage  | List of saved report configs            | 1.5h  |
| ReportHistoryPage | History of generated reports            | 1.5h  |

### 11.5 Implementation Plan (6 Phases)

> **Source:** Lines 500–1000

#### Phase A — Critical Fixes (Day 1, ~2h)

1. Fix RBAC bug: `roleGuard('inventory','read')` → `roleGuard('reports','read')` — 5 min
2. Fix catalog: Add inventory category to `categoryNames`/`categoryIcons` — 15 min
3. Create `report.schema.ts` in `@dento/shared` — 1.5h

#### Phase B — Backend Pipelines (Days 1–3, ~16h)

1. Patient pipelines (5): P1–P5 — 4h
2. Appointment pipelines (6): A1–A6 — 5h
3. Clinical pipelines (4): C1–C4 — 3h
4. Operational pipelines (2): O3, O4 — 2h
5. Dashboard live data (stats, trends, widgets) — 2h

#### Phase C — Core Frontend (Days 3–4, ~10h)

1. ReportDetailPage (generic) — 4h
2. Add inventory to CATEGORY_CONFIG — 30 min
3. Dashboard wiring + widgets (replace hardcoded) — 3h
4. Sidebar report navigation links — 1h
5. Export dialog + trigger hook — 1.5h

#### Phase D — Additional Pages (Days 4–5, ~8h)

1. 7 Inventory report pages — 5h
2. SavedReportsPage — 1.5h
3. ReportHistoryPage — 1.5h

#### Phase E — Background Jobs (Day 5, ~1.5h)

1. Expired-batch BullMQ cron worker

#### Phase F — Tests (Days 2–6, parallel, ~16h)

1. `report-pipeline.service.test.ts` — 5h (~20 tests)
2. `reports.route.test.ts` — 4h (~16 tests)
3. `report-export.service.test.ts` — 2h (~8 tests)
4. `report-scheduler.service.test.ts` — 1.5h (~6 tests)
5. 4 inventory route test files — 3.5h (~14 tests per pair)
6. `DashboardPage.test.tsx` — TBD
7. `ReportDetailPage.test.tsx` — TBD
8. `useReports.test.ts` — TBD

**Total: ~53.5 hours / 6–7 working days**

---

## 12. Consolidated Checklists

### 12.1 Pre-Implementation Checklist

- [ ] Read this entire document
- [ ] Verify Phase 4 financial modules are complete (invoices, payments, reconciliation)
- [ ] Confirm `@dento/shared` builds cleanly
- [ ] Confirm Redis is running for caching + BullMQ
- [ ] Confirm all 19 existing pipelines are working

### 12.2 Per-Feature Implementation Checklist

For EACH report/feature implemented:

- [ ] Zod schema in `@dento/shared/src/schemas/report.schema.ts` (`.strict()` for create/update, `.coerce` for query params)
- [ ] Pipeline file at correct path per V2_STRUCTURE
- [ ] Route handler with 3-stage middleware: `authGuard → tenantDbMiddleware → roleGuard('reports', 'read')`
- [ ] Redis cache: 5min TTL, key `report:{tenantSlug}:{type}:{hash}`
- [ ] `apiResponse()` helper for success response
- [ ] `apiError()` helper for error response
- [ ] Error handling: try/catch with Pino logging
- [ ] Frontend hook: `useQuery` with `reportKeys` factory
- [ ] Loading state: `<TableSkeleton />`
- [ ] Error state: `<ErrorState onRetry={refetch} />`
- [ ] Empty state: `<EmptyState icon={...} />`
- [ ] Dark mode: `dark:` classes on all elements
- [ ] RTL: Logical properties only (ms/me/ps/pe/start/end)
- [ ] Accessibility: `aria-label` on charts and buttons, 4.5:1 contrast
- [ ] Responsive: Mobile cards, desktop tables/charts
- [ ] Toast notification on every mutation
- [ ] Doctor role: filter to own data only
- [ ] File size limits: Page ≤ 150, Component ≤ 200, Hook ≤ 100, Service ≤ 300, Route ≤ 150
- [ ] Test file with Phase 5+ coverage targets (70/60/70/70)

### 12.3 Post-Implementation Verification

> **Source:** BUILD_RULES.md §19 + GAP_ANALYSIS verification section

1. `turbo build` — 0 TypeScript errors
2. `turbo lint` — 0 new ESLint errors
3. `tsc --noEmit` — type-check passes
4. Verify all new files exist at paths per V2_STRUCTURE
5. `turbo test` — all tests pass, coverage ≥ 70/60/70/70
6. Cross-layer integration: Frontend filter → API call → Aggregation → Response → Chart rendered
7. Every sidebar link navigates to a real page
8. Every Export button triggers actual download
9. Dashboard shows live data, no hardcoded values
10. Report pages show loading → data → empty states correctly
11. RTL layout verified (Arabic direction)
12. Dark mode toggle verified on all report pages
13. Mobile responsive layout verified (tables → cards)
14. RBAC verified: doctor sees only own data, receptionist sees dashboard only
15. Redis cache working: first request slow, second fast
16. Compliance scan against 6 core docs (BUILD_RULES §28)

### 12.4 Dependency Order

```
Phase A (critical fixes)
    ↓
Phase B (backend pipelines) ←→ Phase F (tests, parallel)
    ↓
Phase C (core frontend)
    ↓
Phase D (additional pages)
    ↓
Phase E (background jobs)
    ↓
Final Verification
```

---

> **Document Version:** 1.0  
> **Generated:** Week 19 implementation preparation  
> **Source Documents:** DENTO_V2_MASTER_PLAN §21, V2_DATABASE §5-§11.5, BUILD_RULES §1-§28, V2_DECISION_LOG §1-§33, V2_STRUCTURE §1-§14, SECURITY_AND_ENCRYPTION §1-§13, TECH_REQUIREMENTS, IMPLEMENTATION_ROADMAP, PLATFORM_RBAC §1-§16, WEEK_19_REPORTS_GAP_ANALYSIS  
> **Total Lines Scanned:** ~24,000
