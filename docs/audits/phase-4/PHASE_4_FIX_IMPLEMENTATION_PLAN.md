# Phase 4 — Fix Implementation Plan

> **Based on:** PHASE_4_INDEPENDENT_VERIFICATION.md (31 findings)  
> **Date:** 2026-03-02  
> **Total Estimated Effort:** ~20 hours  
> **Batches:** 6 sequential batches (dependency-ordered)

---

## ✅ Implementation Status — ALL 31 FINDINGS RESOLVED

| Batch       | Description                                                 | Status      | Tests                                        |
| ----------- | ----------------------------------------------------------- | ----------- | -------------------------------------------- |
| **Batch 1** | Models: Collection Names + Audit Fields                     | ✅ Complete | N/A (model changes)                          |
| **Batch 2** | Shared Schemas + Constants                                  | ✅ Complete | N/A (schema changes)                         |
| **Batch 3** | Backend Routes (rate limits, roleGuard, dashboard refactor) | ✅ Complete | N/A (route changes)                          |
| **Batch 4** | Backend Services (webhooks, cron jobs)                      | ✅ Complete | N/A (service changes)                        |
| **Batch 5** | Frontend (@dento/shared imports, RTL CSS, dialog forms)     | ✅ Complete | N/A (frontend changes)                       |
| **Batch 6** | Tests (dashboard service + frontend test suite)             | ✅ Complete | **97 tests pass** (14 backend + 83 frontend) |

### Test Summary

- **Backend:** `dashboard.service.test.ts` — 14/14 pass (DashboardService.getStats 9 tests + getTrends 5 tests)
- **Frontend:** 12 test files — 83/83 pass
  - 6 hook test files: useInvoices (10), usePayments (9), useInsurance (10), useInstallments (10), useCommissions (11), useReports (14)
  - 6 page test files: InvoiceListPage (4), PaymentsPage (4), InsuranceClaimsPage (4), InstallmentListPage (4), CommissionsPage (4), ReportsHubPage (3)
- **Frontend test infrastructure created:** `vitest.config.ts`, `src/test/setup.ts`, `src/test/test-utils.tsx`

### Files Created

- `apps/api/src/tenant/services/dashboard.service.test.ts`
- `apps/admin/vitest.config.ts`
- `apps/admin/src/test/setup.ts`
- `apps/admin/src/test/test-utils.tsx`
- `apps/admin/src/features/invoices/hooks/useInvoices.test.ts`
- `apps/admin/src/features/payments/hooks/usePayments.test.ts`
- `apps/admin/src/features/insurance/hooks/useInsurance.test.ts`
- `apps/admin/src/features/installments/hooks/useInstallments.test.ts`
- `apps/admin/src/features/commissions/hooks/useCommissions.test.ts`
- `apps/admin/src/features/reports/hooks/useReports.test.ts`
- `apps/admin/src/features/invoices/pages/InvoiceListPage.test.tsx`
- `apps/admin/src/features/payments/pages/PaymentsPage.test.tsx`
- `apps/admin/src/features/insurance/pages/InsuranceClaimsPage.test.tsx`
- `apps/admin/src/features/installments/pages/InstallmentListPage.test.tsx`
- `apps/admin/src/features/commissions/pages/CommissionsPage.test.tsx`
- `apps/admin/src/features/reports/pages/ReportsHubPage.test.tsx`

---

## ✅ Batch 1 — Models: Collection Names + Audit Fields (45 min)

**Why first:** Collection name changes affect how MongoDB stores data. Must be done before any service/route work to avoid inconsistencies. Zero dependencies on other batches.

### 1.1 Fix 6 Collection Names (M1) — 15 min

Each model factory function uses the 2-argument `connection.model(name, schema)` pattern. Add the 3rd argument (collection name) to match V2_DATABASE §7 specs, following the existing `getTenantPaymentModel` pattern:

```typescript
// EXISTING correct pattern (payment.model.ts):
connection.model('TenantPayment', tenantPaymentSchema, 'payments');
```

| File                                                                                | Current                                                        | Change To                                                                             |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [insurance-claim.model.ts](apps/api/src/tenant/models/insurance-claim.model.ts)     | `connection.model('InsuranceClaim', insuranceClaimSchema)`     | `connection.model('InsuranceClaim', insuranceClaimSchema, 'insurance_claims')`        |
| [insurance-company.model.ts](apps/api/src/tenant/models/insurance-company.model.ts) | `connection.model('InsuranceCompany', insuranceCompanySchema)` | `connection.model('InsuranceCompany', insuranceCompanySchema, 'insurance_companies')` |
| [installment-plan.model.ts](apps/api/src/tenant/models/installment-plan.model.ts)   | `connection.model('InstallmentPlan', installmentPlanSchema)`   | `connection.model('InstallmentPlan', installmentPlanSchema, 'installment_plans')`     |
| [reconciliation.model.ts](apps/api/src/tenant/models/reconciliation.model.ts)       | `connection.model('Reconciliation', reconciliationSchema)`     | `connection.model('Reconciliation', reconciliationSchema, 'reconciliations')`         |
| [commission-payout.model.ts](apps/api/src/tenant/models/commission-payout.model.ts) | `connection.model('CommissionPayout', commissionPayoutSchema)` | `connection.model('CommissionPayout', commissionPayoutSchema, 'commission_payouts')`  |
| [doctor-commission.model.ts](apps/api/src/tenant/models/doctor-commission.model.ts) | `connection.model('DoctorCommission', doctorCommissionSchema)` | `connection.model('DoctorCommission', doctorCommissionSchema, 'doctor_commissions')`  |

> **Note on reconciliation:** V2_DATABASE §7.6 uses singular `reconciliation` but Mongoose convention is plural. Using `reconciliations` is acceptable since this is the tenant convention throughout the codebase.

### 1.2 Add Missing Audit Fields (M2, M3) — 15 min

Add `updatedBy` and/or `createdBy` fields following the existing pattern in `invoice.model.ts`:

```typescript
// EXISTING pattern (invoice.model.ts):
createdBy: { type: Schema.Types.ObjectId, required: true },
updatedBy: { type: Schema.Types.ObjectId },
```

| File                                                                                |     Add `createdBy`      | Add `updatedBy` |
| ----------------------------------------------------------------------------------- | :----------------------: | :-------------: |
| [insurance-claim.model.ts](apps/api/src/tenant/models/insurance-claim.model.ts)     |      Already has ✅      |     **ADD**     |
| [insurance-company.model.ts](apps/api/src/tenant/models/insurance-company.model.ts) | **ADD** (required: true) |     **ADD**     |
| [installment-plan.model.ts](apps/api/src/tenant/models/installment-plan.model.ts)   |      Already has ✅      |     **ADD**     |
| [doctor-commission.model.ts](apps/api/src/tenant/models/doctor-commission.model.ts) | **ADD** (required: true) |     **ADD**     |

### 1.3 Report Model Enum Alignment (M4, M5) — 10 min

**File:** [report.model.ts](apps/api/src/tenant/models/report.model.ts)

1. Add `'inventory'` to the `reportCategories` array
2. Add the 10 inventory report types to the `reportTypes` array to match `@dento/shared` `ReportType`:
   ```
   'inventory-stock-levels', 'inventory-expiry-tracking', 'inventory-usage-by-procedure',
   'inventory-reorder-alerts', 'inventory-supplier-analysis', 'inventory-cost-analysis',
   'inventory-wastage-report', 'inventory-movement-history', 'inventory-valuation',
   'inventory-branch-comparison'
   ```
3. Add `'quarterly'` to the `ReportScheduleSchema.frequency` enum

### 1.4 Minor Model Fixes (M6) — 5 min

**File:** [invoice.model.ts](apps/api/src/tenant/models/invoice.model.ts)

Add `ref` to `insuranceClaimId`:

```typescript
// Before:
insuranceClaimId: { type: Schema.Types.ObjectId },
// After:
insuranceClaimId: { type: Schema.Types.ObjectId, ref: 'InsuranceClaim' },
```

---

## ✅ Batch 2 — Shared Schemas + Constants (30 min)

**Why second:** Route and service changes in Batches 3-4 depend on new schemas existing in `@dento/shared`. Must be done before consuming code.

### 2.1 Add `calculateCommissionBodySchema` to @dento/shared (SC3, R6) — 10 min

**File:** [packages/shared/src/schemas/commission.schema.ts](packages/shared/src/schemas/commission.schema.ts)

The commissions `POST /calculate/:invoiceId` endpoint currently uses manual body parsing. Create a proper Zod schema:

```typescript
// Add after existing schemas:
export const calculateCommissionBodySchema = z
  .object({
    doctorId: z.string().min(1, 'doctorId is required'),
    commissionRate: z.number().min(0).max(1),
    appointmentId: z.string().optional(),
  })
  .strict();

export type CalculateCommissionBody = z.infer<typeof calculateCommissionBodySchema>;
```

Then re-export from [packages/shared/src/schemas/index.ts](packages/shared/src/schemas/index.ts).

### 2.2 Move Inline Schemas to @dento/shared (SC3) — 15 min

Three inline Zod schemas in route files should move to `@dento/shared`:

| Schema                 | Currently In                 | Move To                                                        |
| ---------------------- | ---------------------------- | -------------------------------------------------------------- |
| `attachDocumentSchema` | `insurance-claims.route.ts`  | `packages/shared/src/schemas/insurance.schema.ts`              |
| `historyQuerySchema`   | `report-management.route.ts` | `packages/shared/src/schemas/report.schema.ts`                 |
| `idParamSchema`        | `report-helpers.ts`          | `packages/shared/src/schemas/index.ts` (common utility schema) |

For each:

1. Copy the schema definition to the target file in `@dento/shared`
2. Add `.strict()` if not already present
3. Export the type inference
4. Re-export from `schemas/index.ts`
5. Update the route file import to use `from '@dento/shared'`

### 2.3 Fix Schema Typing Issues (SC1, SC2) — 5 min

**File:** [commission.schema.ts](packages/shared/src/schemas/commission.schema.ts)

Strengthen `VALID_COMMISSION_STATUS_TRANSITIONS` typing:

```typescript
// Before:
export const VALID_COMMISSION_STATUS_TRANSITIONS: Record<string, string[]> = { ... };
// After:
export const VALID_COMMISSION_STATUS_TRANSITIONS: Record<CommissionStatus, readonly CommissionStatus[]> = { ... } as const;
```

**Files:** [invoice.schema.ts](packages/shared/src/schemas/invoice.schema.ts), [insurance.schema.ts](packages/shared/src/schemas/insurance.schema.ts)

Add explicit `.strict()` to derived update schemas:

```typescript
// Before:
export const updateInvoiceSchema = createInvoiceSchema.omit({ patientId: true }).partial();
// After:
export const updateInvoiceSchema = createInvoiceSchema.omit({ patientId: true }).partial().strict();
```

---

## ✅ Batch 3 — Backend Routes (3.5 hours)

**Why third:** Depends on Batch 2 schemas. Route changes are isolated from each other and can be done file-by-file.

### 3.1 Add Rate Limiting to All Financial Mutations (R1, SEC1) — 1.5 hours

**Step A:** Add a `MUTATION` rate limit tier to [config/constants.ts](apps/api/src/config/constants.ts):

```typescript
export const RATE_LIMITS = {
  GLOBAL: { max: 100, timeWindow: '1 minute' },
  AUTH: { max: 5, timeWindow: '1 minute' },
  MUTATION: { max: 30, timeWindow: '1 minute' }, // ← NEW
  UPLOAD: { max: 10, timeWindow: '1 minute' },
  API_KEY: { max: 1000, timeWindow: '1 minute' },
  WEBHOOK: { max: 200, timeWindow: '1 minute' },
} as const;
```

**Step B:** Apply to all mutation endpoints across 6 route files. Follow the existing pattern from `insurance-claims.route.ts`:

```typescript
import { RATE_LIMITS } from '../../../config/constants.js';

// On each POST/PUT/PATCH/DELETE endpoint, add config:
fastify.post(
  '/endpoint',
  {
    preHandler: [...preHandler, roleGuard('module', 'create')],
    config: {
      rateLimit: RATE_LIMITS.MUTATION,
    },
  },
  handler,
);
```

Files to update (mutation endpoints count):

| File                                                                                              | Mutation Endpoints to Add Rate Limiting                                                                                               |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [invoices.route.ts](apps/api/src/tenant/routes/invoices/invoices.route.ts)                        | POST `/`, PUT `/:id`, DELETE `/:id`, POST `/:id/issue`, POST `/generate-from-treatment-plan`, POST `/:id/void`, POST `/:id/send` (7)  |
| [payments.route.ts](apps/api/src/tenant/routes/payments/payments.route.ts)                        | POST `/`, POST `/:id/refund`, POST `/reconciliation`, PUT `/reconciliation/:id` (4)                                                   |
| [insurance-claims.route.ts](apps/api/src/tenant/routes/insurance/insurance-claims.route.ts)       | POST `/`, PATCH `/:id/status`, DELETE `/:id/documents/:docId` (3 — upload already has it)                                             |
| [insurance-companies.route.ts](apps/api/src/tenant/routes/insurance/insurance-companies.route.ts) | POST `/`, PUT `/:id`, DELETE `/:id` (3)                                                                                               |
| [installments.route.ts](apps/api/src/tenant/routes/installments/installments.route.ts)            | POST `/`, PUT `/:id`, POST `/:id/payments/:number`, PATCH `/:id/payments/:number/waive`, PATCH `/:id/cancel` (5)                      |
| [commissions.route.ts](apps/api/src/tenant/routes/commissions/commissions.route.ts)               | POST `/calculate/:invoiceId`, PATCH `/approve`, POST `/payouts` (3)                                                                   |
| [report-management.route.ts](apps/api/src/tenant/routes/reports/report-management.route.ts)       | POST `/saved`, DELETE `/saved/:id`, POST `/scheduled`, PATCH `/scheduled/:id`, DELETE `/scheduled/:id`, POST `/scheduled/:id/run` (6) |
| [report-data.route.ts](apps/api/src/tenant/routes/reports/report-data.route.ts)                   | POST `/export` (1) — heavy operation, consider using `UPLOAD` tier                                                                    |

### 3.2 Add `roleGuard` to GET Endpoints (R4, SEC2) — 45 min

Follow the pattern from `report-management.route.ts`:

```typescript
const readGuard = [...preHandler, roleGuard('module', 'read')];
```

Files to update:

| File                                                                                              | Module           | GET Endpoints to Add `roleGuard('x','read')`                      |
| ------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------- |
| [invoices.route.ts](apps/api/src/tenant/routes/invoices/invoices.route.ts)                        | `'invoices'`     | GET `/`, GET `/:id`, GET `/stats`, GET `/:id/pdf` (4)             |
| [payments.route.ts](apps/api/src/tenant/routes/payments/payments.route.ts)                        | `'payments'`     | GET `/`, GET `/:id`, GET `/reconciliation` (3)                    |
| [insurance-claims.route.ts](apps/api/src/tenant/routes/insurance/insurance-claims.route.ts)       | `'insurance'`    | GET `/`, GET `/aging`, GET `/:id` (3)                             |
| [insurance-companies.route.ts](apps/api/src/tenant/routes/insurance/insurance-companies.route.ts) | `'insurance'`    | GET `/`, GET `/:id`, GET `/:id/stats` (3)                         |
| [installments.route.ts](apps/api/src/tenant/routes/installments/installments.route.ts)            | `'installments'` | GET `/`, GET `/overdue`, GET `/:id` (3)                           |
| [commissions.route.ts](apps/api/src/tenant/routes/commissions/commissions.route.ts)               | `'commissions'`  | GET `/`, GET `/payouts`, GET `/summary/:doctorId`, GET `/:id` (4) |

**Pattern for each file:**

```typescript
// Before:
const preHandler = [authGuard, tenantDbMiddleware];

// After:
const preHandler = [authGuard, tenantDbMiddleware];
const readGuard = [...preHandler, roleGuard('invoices', 'read')]; // adjust module name

// Then update each GET endpoint:
fastify.get('/', { preHandler: readGuard }, handler);
```

### 3.3 Fix Report-Management DELETE Permission (R5) — 5 min

**File:** [report-management.route.ts](apps/api/src/tenant/routes/reports/report-management.route.ts)

```typescript
// Before (2 places):
const writeGuard = [...preHandler, roleGuard('reports', 'create')];
// DELETE /saved/:id and DELETE /scheduled/:id both use writeGuard

// Fix: create a separate deleteGuard
const deleteGuard = [...preHandler, roleGuard('reports', 'delete')];

// Then use deleteGuard on the 2 DELETE endpoints
```

### 3.4 Fix Commissions Calculate Endpoint (R6) — 10 min

**File:** [commissions.route.ts](apps/api/src/tenant/routes/commissions/commissions.route.ts)

Replace manual body parsing with Zod schema from Batch 2:

```typescript
// Before:
import { ... } from '@dento/shared';

// After (add to import):
import { calculateCommissionBodySchema, ... } from '@dento/shared';

// In the handler:
// Before:
const body = request.body as { doctorId: string; commissionRate: number; appointmentId?: string };
if (!body.doctorId || body.commissionRate === undefined) {
  throw ApiError.badRequest('doctorId and commissionRate are required');
}

// After:
const body = calculateCommissionBodySchema.parse(request.body);
```

### 3.5 Refactor Dashboard Route (R2, R3) — 1.5 hours

This is the biggest single change. Extract all inline aggregation logic into a new `DashboardService`.

**Step A:** Create [apps/api/src/tenant/services/dashboard.service.ts](apps/api/src/tenant/services/dashboard.service.ts)

Follow the standard service template:

```typescript
import type { Connection } from 'mongoose';
import { getInvoiceModel } from '../models/invoice.model.js';
import { getAppointmentModel } from '../models/appointment.model.js';
import { getTenantPaymentModel } from '../models/payment.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { logger } from '../../utils/logger.js';

export class DashboardService {
  private tenantDb: Connection;
  // ... model references

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    // Initialize all model references
  }

  async getStats(branchId?: string): Promise<DashboardStats> {
    // Move the 11 parallel aggregation queries from dashboard.route.ts GET /stats
  }

  async getTrends(branchId?: string, months?: number): Promise<DashboardTrends> {
    // Move the 8 parallel queries from dashboard.route.ts GET /trends
  }
}
```

**Step B:** Rewrite [dashboard.route.ts](apps/api/src/tenant/routes/reports/dashboard.route.ts) as a thin handler:

```typescript
import { DashboardService } from '../../../services/dashboard.service.js';
import { authGuard, tenantDbMiddleware } from '../../../plugins/auth.plugin.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  fastify.get('/stats', { preHandler }, async (request, reply) => {
    try {
      const tenantDb = getTenantDb(request);
      const { branchId } = request.query as { branchId?: string };
      const service = new DashboardService(tenantDb);
      const stats = await service.getStats(branchId);
      return apiResponse(reply, 200, stats);
    } catch (err) {
      return apiError(reply, err);
    }
  });

  fastify.get('/trends', { preHandler }, async (request, reply) => {
    try {
      const tenantDb = getTenantDb(request);
      const { branchId, months } = request.query as { branchId?: string; months?: number };
      const service = new DashboardService(tenantDb);
      const trends = await service.getTrends(branchId, months);
      return apiResponse(reply, 200, trends);
    } catch (err) {
      return apiError(reply, err);
    }
  });
}
```

**Step C:** Consider adding `roleGuard('reports', 'read')` to dashboard endpoints (currently no roleGuard at all). This depends on whether the dashboard is meant to be accessible to all authenticated users or only those with reports-read permission.

---

## ✅ Batch 4 — Backend Services (2.5 hours)

**Why fourth:** Depends on Batch 1 models being correct. Service webhook additions don't affect routes.

### 4.1 Add Webhook Dispatch to InsuranceClaimService (S1) — 45 min

**File:** [insurance-claim.service.ts](apps/api/src/tenant/services/insurance-claim.service.ts)

Follow the exact pattern from `invoice.service.ts`:

**Step A:** Add imports at top:

```typescript
import { dispatchWebhook } from './webhook-dispatcher.js';
import type { TenantWebhookEvent } from '@dento/shared';
import { logger } from '../../utils/logger.js';
```

**Step B:** Add webhook dispatch in `create()` method (after the `claim.save()`):

```typescript
try {
  const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
  await dispatchWebhook(this.tenantDb, {
    tenantId: tenantSlug,
    tenantSlug,
    event: 'insurance_claim.created' as TenantWebhookEvent,
    data: {
      claimId: claim._id,
      claimNumber: claim.claimNumber,
      patientId: claim.patientId,
      invoiceId: claim.invoiceId,
      totalAmount: claim.totalAmount,
      claimedAmount: claim.claimedAmount,
      status: claim.status,
    },
  });
} catch (err) {
  logger.warn({ err }, 'Failed to dispatch insurance_claim.created webhook');
}
```

**Step C:** Add webhook dispatch in `updateStatus()` method (after status save):

```typescript
try {
  const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
  await dispatchWebhook(this.tenantDb, {
    tenantId: tenantSlug,
    tenantSlug,
    event: 'insurance_claim.status_updated' as TenantWebhookEvent,
    data: {
      claimId: claim._id,
      claimNumber: claim.claimNumber,
      previousStatus: previousStatus,
      newStatus: claim.status,
      approvedAmount: claim.approvedAmount,
    },
  });
} catch (err) {
  logger.warn({ err }, 'Failed to dispatch insurance_claim.status_updated webhook');
}
```

### 4.2 Add Missing Webhooks to InstallmentService (S3) — 30 min

**File:** [installment.service.ts](apps/api/src/tenant/services/installment.service.ts)

Already has `dispatchWebhook` import (dispatches `installment.plan_created`). Add 3 more events:

1. In `recordPayment()` — after saving: `'installment.payment_recorded'`
2. In `cancelPlan()` — after saving: `'installment.plan_cancelled'`
3. In `markOverdueInstallments()` — after bulk update: `'installment.overdue'`

Follow the same try/catch + logger.warn pattern from invoice.service.ts.

### 4.3 Add Missing Webhook to CommissionService (S4) — 15 min

**File:** [commission.service.ts](apps/api/src/tenant/services/commission.service.ts)

Already dispatches `commission.calculated` and `commission.approved`. Add in `createPayout()`:

```typescript
// After payout.save():
await dispatchWebhook(this.tenantDb, {
  tenantId: tenantSlug,
  tenantSlug,
  event: 'commission.payout_created' as TenantWebhookEvent,
  data: {
    payoutId: payout._id,
    doctorId: payout.doctorId,
    totalAmount: payout.totalAmount,
    commissionCount: payout.commissionCount,
  },
});
```

### 4.4 Wire BullMQ Cron Jobs for Overdue Detection (S2) — 1 hour

The methods `InvoiceService.markOverdueInvoices()` and `InstallmentService.markOverdueInstallments()` exist but no cron calls them.

**Step A:** Add queue names to [apps/api/src/jobs/queue.ts](apps/api/src/jobs/queue.ts):

```typescript
export const QUEUE_NAMES = {
  // ... existing
  INVOICE_OVERDUE: 'invoice-overdue',
  INSTALLMENT_OVERDUE: 'installment-overdue',
} as const;
```

**Step B:** Create [apps/api/src/jobs/crons/overdue.cron.ts](apps/api/src/jobs/crons/overdue.cron.ts):

Follow the exact pattern from `alert.cron.ts`:

```typescript
import type { Job } from 'bullmq';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { getTenantConnections } from '../../config/database.js';
import { InvoiceService } from '../../tenant/services/invoice.service.js';
import { InstallmentService } from '../../tenant/services/installment.service.js';

export async function startOverdueCrons() {
  // Run at 2:00 AM daily — scan all tenants for overdue invoices
  await addCronJob(QUEUE_NAMES.INVOICE_OVERDUE, 'mark-overdue-invoices', '0 2 * * *');

  // Run at 3:00 AM daily — scan all tenants for overdue installments
  await addCronJob(QUEUE_NAMES.INSTALLMENT_OVERDUE, 'mark-overdue-installments', '0 3 * * *');

  logger.info('Overdue detection crons registered (daily 2AM + 3AM)');
}

export function startOverdueWorkers() {
  const invoiceWorker = createWorker(
    QUEUE_NAMES.INVOICE_OVERDUE,
    async (job: Job) => {
      const connections = await getTenantConnections();
      for (const tenantDb of connections) {
        try {
          const service = new InvoiceService(tenantDb);
          const count = await service.markOverdueInvoices();
          if (count > 0) {
            logger.info({ tenant: tenantDb.name, count }, 'Marked overdue invoices');
          }
        } catch (err) {
          logger.error({ err, tenant: tenantDb.name }, 'Failed to mark overdue invoices');
        }
      }
    },
    { concurrency: 1 },
  );

  const installmentWorker = createWorker(
    QUEUE_NAMES.INSTALLMENT_OVERDUE,
    async (job: Job) => {
      const connections = await getTenantConnections();
      for (const tenantDb of connections) {
        try {
          const service = new InstallmentService(tenantDb);
          const result = await service.markOverdueInstallments();
          if (result.overdueCount > 0) {
            logger.info({ tenant: tenantDb.name, ...result }, 'Marked overdue installments');
          }
        } catch (err) {
          logger.error({ err, tenant: tenantDb.name }, 'Failed to mark overdue installments');
        }
      }
    },
    { concurrency: 1 },
  );

  logger.info('Overdue detection workers started');
  return { invoiceWorker, installmentWorker };
}
```

**Step C:** Register in [apps/api/src/server.ts](apps/api/src/server.ts) alongside existing cron registrations:

```typescript
import { startOverdueCrons, startOverdueWorkers } from './jobs/crons/overdue.cron.js';

// In the startup sequence (after existing cron starts):
await startOverdueCrons();
startOverdueWorkers();
```

> **Note:** `getTenantConnections()` must return all active tenant database connections. If this function doesn't exist yet, check how other crons iterate over tenants in `alert.cron.ts` and follow the same pattern.

---

## ✅ Batch 5 — Frontend (5.5 hours)

**Why fifth:** Independent of backend changes. Can be done in parallel with Batch 4, but listed after for sequencing clarity.

### 5.1 Import Schemas from @dento/shared (FE1) — 2 hours

Replace local Zod schema definitions with imports from `@dento/shared` in 5 form components. Follow the existing correct pattern from `PatientForm.tsx`:

```typescript
// CORRECT pattern (already used in PatientForm.tsx):
import { createPatientSchema, type CreatePatientInput } from '@dento/shared';
const { ... } = useForm<CreatePatientInput>({ resolver: zodResolver(createPatientSchema) });
```

| File                                                                                                 | Remove Local Schema                      | Import From `@dento/shared`                                                                                                                                     | Form Type   |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [InvoiceForm.tsx](apps/admin/src/features/invoices/components/InvoiceForm.tsx)                       | `invoiceItemSchema`, `invoiceFormSchema` | `createInvoiceSchema`, `type CreateInvoiceInput`                                                                                                                | Create/Edit |
| [PaymentForm.tsx](apps/admin/src/features/payments/components/PaymentForm.tsx)                       | `paymentFormSchema`                      | `createPaymentSchema`, `type CreatePaymentInput`                                                                                                                | Create      |
| [InsuranceCompanyFormPage.tsx](apps/admin/src/features/insurance/pages/InsuranceCompanyFormPage.tsx) | `companyFormSchema`                      | `createInsuranceCompanySchema`, `type CreateInsuranceCompanyInput` (for create) / `updateInsuranceCompanySchema`, `type UpdateInsuranceCompanyInput` (for edit) | Create/Edit |
| [CreateClaimPage.tsx](apps/admin/src/features/insurance/pages/CreateClaimPage.tsx)                   | `claimFormSchema`                        | `createInsuranceClaimSchema`, `type CreateInsuranceClaimInput`                                                                                                  | Create      |
| [InstallmentFormPage.tsx](apps/admin/src/features/installments/pages/InstallmentFormPage.tsx)        | `installmentFormSchema`                  | `createInstallmentPlanSchema`, `type CreateInstallmentPlanInput`                                                                                                | Create      |

**For each file:**

1. Delete the local `z.object({...})` schema definition
2. Delete the local `type ... = z.infer<typeof ...>` type definition
3. Add import: `import { createXxxSchema, type CreateXxxInput } from '@dento/shared';`
4. Update `useForm` generic: `useForm<CreateXxxInput>({ resolver: zodResolver(createXxxSchema) })`
5. If the form has different fields for edit vs create (e.g., InsuranceCompanyFormPage), use the appropriate update schema for edit mode

> **Important:** Verify that the `@dento/shared` schema field names, optionality, and types exactly match what the form expects. If there are differences (e.g., the local schema has a field the shared schema doesn't), the shared schema may need a minor update (e.g., adding `.optional()` to a field). Test each form after conversion.

### 5.2 Fix RTL CSS Violations (FE2) — 3 hours

**85 violations** across 25 files. Use the Reports module as the reference pattern.

**Search and replace mappings:**

| Physical (WRONG) | Logical (CORRECT) | Tailwind Class       |
| ---------------- | ----------------- | -------------------- |
| `ml-`            | `ms-`             | margin-inline-start  |
| `mr-`            | `me-`             | margin-inline-end    |
| `pl-`            | `ps-`             | padding-inline-start |
| `pr-`            | `pe-`             | padding-inline-end   |
| `text-left`      | `text-start`      | text-align           |
| `text-right`     | `text-end`        | text-align           |
| `left-`          | `start-`          | inset-inline-start   |
| `right-`         | `end-`            | inset-inline-end     |
| `rounded-l-`     | `rounded-s-`      | border-start-radius  |
| `rounded-r-`     | `rounded-e-`      | border-end-radius    |
| `border-l-`      | `border-s-`       | border-inline-start  |
| `border-r-`      | `border-e-`       | border-inline-end    |

**Files to update (by module):**

| Module       | Files with Violations                                                                                                             | Est. Violations |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Invoices     | `InvoiceDetailPage.tsx`, `InvoiceForm.tsx`, `InvoiceListPage.tsx`, `InvoicePDF.tsx`, `InvoiceStatusBadge.tsx`                     | ~20             |
| Payments     | `PaymentDetailPage.tsx`, `PaymentForm.tsx`, `PaymentListPage.tsx`, `ReconciliationPage.tsx`                                       | ~15             |
| Insurance    | `InsuranceCompanyFormPage.tsx`, `InsuranceCompanyListPage.tsx`, `CreateClaimPage.tsx`, `ClaimListPage.tsx`, `ClaimDetailPage.tsx` | ~15             |
| Installments | `InstallmentFormPage.tsx`, `InstallmentListPage.tsx`, `InstallmentDetailPage.tsx`, `RecordInstallmentPaymentDialog.tsx`           | ~15             |
| Commissions  | `CommissionsPage.tsx`, `CommissionApprovalForm.tsx`, `CreatePayoutDialog.tsx`, `DoctorCommissionSummary.tsx`                      | ~10             |
| Other        | Remaining pages/components in these modules                                                                                       | ~10             |

**Approach:** Run a workspace-wide grep for each physical property class in these 5 modules and do find-replace:

```powershell
# Example grep to find violations:
Select-String -Path "apps\admin\src\features\invoices\**\*.tsx" -Pattern '\b(ml-|mr-|pl-|pr-|text-left|text-right)\b'
```

### 5.3 Convert 3 Dialog Forms to RHF+Zod (FE3) — 30 min

Replace `useState` with React Hook Form + Zod in 3 dialog forms:

#### A. CommissionApprovalForm.tsx

```typescript
// Before:
const [notes, setNotes] = useState('');

// After:
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const approvalSchema = z.object({ notes: z.string().optional() }).strict();
type ApprovalForm = z.infer<typeof approvalSchema>;

const { register, handleSubmit } = useForm<ApprovalForm>({
  resolver: zodResolver(approvalSchema),
  defaultValues: { notes: '' },
});
```

> Move `approvalSchema` to `@dento/shared` if it contains meaningful validation logic. For a single optional string field, keeping it local is acceptable.

#### B. RecordInstallmentPaymentDialog.tsx

```typescript
// Before:
const [amount, setAmount] = useState(remainingAmount);
const [notes, setNotes] = useState('');

// After:
import { recordInstallmentPaymentSchema, type RecordInstallmentPaymentInput } from '@dento/shared';

const { register, handleSubmit, setValue } = useForm<RecordInstallmentPaymentInput>({
  resolver: zodResolver(recordInstallmentPaymentSchema),
  defaultValues: { amountPaid: remainingAmount, notes: '' },
});
```

#### C. CreatePayoutDialog.tsx + CommissionsPage.tsx

```typescript
// Before (in CommissionsPage.tsx):
const [payoutForm, setPayoutForm] = useState({
  doctorId: '',
  paymentMethod: 'bank_transfer',
  reference: '',
  notes: '',
});

// After: lift form to a useForm hook
import { createPayoutSchema, type CreatePayoutInput } from '@dento/shared';

const payoutForm = useForm<CreatePayoutInput>({
  resolver: zodResolver(createPayoutSchema),
  defaultValues: { doctorId: '', paymentMethod: 'bank_transfer', reference: '', notes: '' },
});

// Pass payoutForm (the entire useForm return) as prop to CreatePayoutDialog
```

---

## ✅ Batch 6 — Tests (5 hours)

**Why last:** Tests validate all prior changes. Should be done after all code changes are complete.

### 6.1 Dashboard Service Test (T2) — 1 hour

**Create:** [apps/api/src/tenant/services/dashboard.service.test.ts](apps/api/src/tenant/services/dashboard.service.test.ts)

Follow the pattern from `report-pipeline.service.test.ts` (mocking model aggregates):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from './dashboard.service.js';

// Mock model factories
vi.mock('../models/invoice.model.js', () => ({ ... }));
vi.mock('../models/appointment.model.js', () => ({ ... }));
// etc.

describe('DashboardService', () => {
  describe('getStats', () => {
    it('should return dashboard statistics', async () => { ... });
    it('should filter by branchId when provided', async () => { ... });
    it('should handle empty data gracefully', async () => { ... });
  });

  describe('getTrends', () => {
    it('should return monthly trends', async () => { ... });
    it('should filter by branchId', async () => { ... });
    it('should default to 6 months', async () => { ... });
  });
});
```

### 6.2 Frontend Tests for Phase 4 (T1) — 4 hours

Per BUILD_RULES §18, need page tests and hook tests.

**Create 6 hook test files:**

| File                                                  | Tests                                                    |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `features/invoices/hooks/useInvoices.test.ts`         | queryKey factory, list fetching, single fetch, mutations |
| `features/payments/hooks/usePayments.test.ts`         | Same pattern                                             |
| `features/insurance/hooks/useInsurance.test.ts`       | Companies + Claims queries/mutations                     |
| `features/installments/hooks/useInstallments.test.ts` | List, create, recordPayment, cancel                      |
| `features/commissions/hooks/useCommissions.test.ts`   | List, calculate, approve, payout                         |
| `features/reports/hooks/useReports.test.ts`           | Data fetch, export, saved/scheduled CRUD                 |

**Create 6 page test files (basic render + interaction tests):**

| File                                                       | Tests                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `features/invoices/pages/InvoiceListPage.test.tsx`         | Renders loading, renders data, renders empty, pagination |
| `features/payments/pages/PaymentListPage.test.tsx`         | Same pattern                                             |
| `features/insurance/pages/ClaimListPage.test.tsx`          | Same pattern                                             |
| `features/installments/pages/InstallmentListPage.test.tsx` | Same pattern                                             |
| `features/commissions/pages/CommissionsPage.test.tsx`      | Same pattern                                             |
| `features/reports/pages/ReportsPage.test.tsx`              | Same pattern                                             |

Follow the testing library pattern with MSW for API mocking, as specified in BUILD_RULES §18.

---

## Execution Order Summary

```
Batch 1 (45 min)  → Models — collection names + audit fields + enum alignment
       ↓
Batch 2 (30 min)  → Shared schemas — new schema, move inlines, fix typing
       ↓
Batch 3 (3.5 hr)  → Routes — rate limits, read roleGuards, dashboard refactor
       ↓
Batch 4 (2.5 hr)  → Services — webhooks + cron jobs
       ↓ (can run in parallel with Batch 5)
Batch 5 (5.5 hr)  → Frontend — @dento/shared imports, RTL fixes, dialog forms
       ↓
Batch 6 (5 hr)    → Tests — dashboard test + frontend test suite
```

**Total: ~17.75 hours** (some Batch 4/5 parallelism possible → ~15 hours end-to-end)

---

## Verification Checklist

After all batches, run:

1. `pnpm build` — all 5 tasks must pass (api, admin, developer, shared, ui)
2. `pnpm test` — all existing 537+ tests must pass, plus new tests
3. Verify collection names in MongoDB:
   ```javascript
   db.getCollectionNames(); // Should show insurance_claims, not insuranceclaims
   ```
4. Verify rate limiting: hit a mutation endpoint 31+ times in 1 minute → expect 429
5. Verify roleGuard: access a GET endpoint without the required permission → expect 403
6. Verify webhooks: create an insurance claim → check webhook dispatch logs
7. Spot-check RTL: switch to Arabic locale, verify invoice/payment pages render correctly

---

## Risk Assessment

| Risk                                                | Mitigation                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Collection name change drops existing data          | Only applies to fresh databases; existing tenants need a migration script to rename collections |
| Rate limiting too aggressive                        | Start with `max: 30/min`; monitor and adjust. GLOBAL still allows 100/min for reads             |
| @dento/shared schema differs from local form schema | Test each form individually after conversion; diff local vs shared schema before deleting local |
| Dashboard refactor introduces regression            | Write dashboard.service.test.ts first (TDD), then refactor                                      |
| RTL find-replace breaks non-RTL-related classes     | Use word-boundary regex (`\bml-\b`) and verify with visual testing                              |
