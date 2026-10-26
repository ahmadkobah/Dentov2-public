# Phase 4 Financial Backend Services — Deep Scan Report

> Generated: 2026-03-02  
> Scan scope: All Phase 4 financial service files + workers/crons  
> Total files scanned: 10 service files, 6 worker/cron files, 1 queue infrastructure file

---

## 1. FILE INVENTORY

| #   | File                           | Path                            | Lines | Category       |
| --- | ------------------------------ | ------------------------------- | ----- | -------------- |
| 1   | `invoice.service.ts`           | `apps/api/src/tenant/services/` | 575   | Core Financial |
| 2   | `payment.service.ts`           | `apps/api/src/tenant/services/` | 365   | Core Financial |
| 3   | `insurance-claim.service.ts`   | `apps/api/src/tenant/services/` | 296   | Insurance      |
| 4   | `insurance-company.service.ts` | `apps/api/src/tenant/services/` | 187   | Insurance      |
| 5   | `installment.service.ts`       | `apps/api/src/tenant/services/` | 359   | Installments   |
| 6   | `commission.service.ts`        | `apps/api/src/tenant/services/` | 413   | Commissions    |
| 7   | `report-pipeline.service.ts`   | `apps/api/src/tenant/services/` | 1935  | Reporting      |
| 8   | `report-scheduler.service.ts`  | `apps/api/src/services/`        | 207   | Worker/Cron    |
| 9   | `report-export.service.ts`     | `apps/api/src/services/`        | 492   | Worker/Export  |
| 10  | `invoice-overdue.service.ts`   | `apps/api/src/services/`        | 140   | Worker/Cron    |

**Total LOC: 4,969**

---

## 2. COMPLETE METHOD INVENTORY

### 2.1 InvoiceService (575 lines)

| Method                                      | Parameters                                                                                             | Return Type                          | DB Operations                                                       | Business Logic                                                                                                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list(query)`                               | `InvoiceQuery` (page, limit, search, status, patientId, branchId, dateFrom, dateTo, sortBy, sortOrder) | `{ invoices, meta }`                 | `Invoice.find()`, `Invoice.countDocuments()`                        | Paginated listing with filtering by status/patient/branch/date range, regex search on invoiceNumber, populate patient name+code                                                                                               |
| `getById(id)`                               | `id: string`                                                                                           | `IInvoice` (lean)                    | `Invoice.findById().populate().lean()`                              | Fetch single invoice with patient details (name, code, phone, email) and branch name                                                                                                                                          |
| `create(data, userId)`                      | `CreateInvoiceInput, userId: string`                                                                   | `IInvoice`                           | `Invoice.create()`                                                  | **Server-side recalculation** of item totals, subtotal, discount (% or flat), tax, totalAmount, balanceDue. Sets amountPaid=0. Calculates patientResponsibility = total - insuredAmount. Dispatches `invoice.created` webhook |
| `update(id, data, userId)`                  | `id: string, UpdateInvoiceInput, userId: string`                                                       | `IInvoice`                           | `Invoice.findById()`, `invoice.save()`                              | **Guard: only draft invoices editable**. If items provided, full recalculation of subtotal→discount→tax→total→balanceDue. Updates notes, terms, dueDate, currency, insuranceClaimId, insuredAmount                            |
| `issue(id, userId)`                         | `id: string, userId: string`                                                                           | `IInvoice`                           | `Invoice.findById()`, `invoice.save()`                              | Validates status transition (draft→issued). Sets issueDate=now. Dispatches `invoice.issued` webhook                                                                                                                           |
| `cancel(id, userId)`                        | `id: string, userId: string`                                                                           | `IInvoice`                           | `Invoice.findById()`, `invoice.save()`                              | Validates status transition via `validateStatusTransition()`. Sets status=cancelled                                                                                                                                           |
| `generateFromTreatmentPlan(data, userId)`   | `GenerateInvoiceFromPlanInput, userId: string`                                                         | `IInvoice`                           | `TreatmentPlan.findById().lean()`, `Invoice.create()`               | Converts treatment plan items to invoice items (description, treatmentId, serviceId, toothNumber, quantity, unitPrice, discount, total). Validates plan has items. Sets status=draft, insuredAmount=0                         |
| `recordPayment(invoiceId, amount)`          | `invoiceId: string, amount: number`                                                                    | `IInvoice`                           | `Invoice.findById()`, `invoice.save()`                              | **Called from PaymentService**. Increments amountPaid, recalculates balanceDue. Auto-transitions: partially_paid if partial, paid if full (sets paidAt). Dispatches `invoice.paid` webhook when fully paid                    |
| `reversePayment(invoiceId, amount)`         | `invoiceId: string, amount: number`                                                                    | `IInvoice`                           | `Invoice.findById()`, `invoice.save()`                              | **Called from PaymentService.refund()**. Decrements amountPaid (floor 0), recalculates balanceDue. Transitions to refunded if amountPaid=0, or partially_paid if partial. Clears paidAt                                       |
| `markOverdueInvoices()`                     | none                                                                                                   | `Promise<number>`                    | `Invoice.updateMany()`, `Invoice.find().select().lean()`            | **Cron-callable**. Bulk updates issued invoices with dueDate < now to status=overdue. Dispatches `invoice.overdue` webhook for each                                                                                           |
| `void(id, userId)`                          | `id: string, userId: string`                                                                           | `IInvoice`                           | `Invoice.findById()`, `invoice.save()`                              | Validates transition, sets status=cancelled, appends "[VOIDED]" to notes. Dispatches `invoice.voided` webhook                                                                                                                 |
| `getStats(branchId?)`                       | `branchId?: string`                                                                                    | `{ byStatus, overall, recentMonth }` | `Invoice.aggregate()` (**$facet**)                                  | Aggregation with 3 facets: byStatus (count/total/paid/balance per status), overall (totalInvoices/revenue/collected/outstanding), recentMonth (last 30 days count+amount)                                                     |
| `getPdfData(id)`                            | `id: string`                                                                                           | `{ invoice, settings }`              | `Invoice.findById().populate().lean()`, `Settings.findOne().lean()` | Returns structured data for client-side PDF gen. Populates patient (address), branch (logo), loads clinic settings (clinicName, logo, taxId, address)                                                                         |
| `send(id, userId)`                          | `id: string, userId: string`                                                                           | `IInvoice`                           | `Invoice.findById()`, `invoice.save()`                              | **Auto-issues draft invoices** before sending. Sets sentAt+sentBy metadata. Dispatches `invoice.sent` webhook                                                                                                                 |
| `validateStatusTransition(current, target)` | `InvoiceStatus, InvoiceStatus`                                                                         | `void` (throws)                      | none                                                                | Uses `VALID_INVOICE_STATUS_TRANSITIONS` from @dento/shared. Throws ApiError.badRequest with descriptive message                                                                                                               |

**Validation logic:** Status transition guard using shared constants. Draft-only edits. Server-side amount recalculation prevents client manipulation.

---

### 2.2 PaymentService (365 lines)

| Method                                                                                                                    | Parameters                                                                                                     | Return Type                 | DB Operations                                                                | Business Logic                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list(query)`                                                                                                             | `PaymentQuery` (page, limit, invoiceId, patientId, paymentMethod, status, dateFrom, dateTo, sortBy, sortOrder) | `{ payments, meta }`        | `Payment.find()`, `Payment.countDocuments()`                                 | Paginated listing with filtering, populates invoice (number/total/status) and patient (name/code)                                                                                                                              |
| `getById(id)`                                                                                                             | `id: string`                                                                                                   | `ITenantPayment` (lean)     | `Payment.findById().populate().lean()`                                       | Fetch with full invoice details (number, total, amountPaid, balanceDue, status) and patient details                                                                                                                            |
| `create(data, userId)`                                                                                                    | `CreatePaymentInput, userId: string`                                                                           | `ITenantPayment`            | `Payment.create()`                                                           | Creates payment record with status=completed. **Auto-reconciliation**: calls `InvoiceService.recordPayment()` to update invoice amounts. Dispatches `payment.received` webhook                                                 |
| `refund(id, data, userId)`                                                                                                | `id: string, RefundPaymentInput, userId: string`                                                               | `ITenantPayment`            | `Payment.findById()`, `payment.save()`                                       | **Guards**: already refunded → error, not completed → error. Sets refundedAt, refundReason, refundedBy. Calls `InvoiceService.reversePayment()`. Dispatches `payment.refunded` webhook                                         |
| `recordOnlinePayment(invoiceId, patientId, amount, method, providerPaymentId, providerTransactionId, last4?, cardBrand?)` | 8 params                                                                                                       | `ITenantPayment`            | `Payment.create()`                                                           | Records online/gateway payments. Stores providerPaymentId, providerTransactionId, last4, cardBrand. Sets receivedBy=patientId (self-service). Calls `InvoiceService.recordPayment()`                                           |
| `listReconciliations(query)`                                                                                              | `ReconciliationQuery` (page, limit, branchId, status, dateFrom, dateTo, sortBy, sortOrder)                     | `{ reconciliations, meta }` | `Reconciliation.find()`, `Reconciliation.countDocuments()`                   | Paginated listing filtered by branch/status/date. Populates branch name                                                                                                                                                        |
| `openReconciliation(data, userId)`                                                                                        | `CreateReconciliationInput, userId: string`                                                                    | Reconciliation doc          | `Reconciliation.findOne()`, `Payment.aggregate()`, `Reconciliation.create()` | **Conflict check**: unique branch+date. Aggregates all completed payments by paymentMethod for the day. Calculates cashReceived, cardReceived (card+meeza), onlineReceived (online+fawry), insuranceReceived. Sets status=open |
| `updateReconciliation(id, data, userId)`                                                                                  | `id: string, UpdateReconciliationInput, userId: string`                                                        | Reconciliation doc          | `Reconciliation.findById()`, `reconciliation.save()`                         | Updates closingBalance, expenses, notes. Calculates discrepancy = closing - (opening + received - expenses). **Status flow**: open→closed→reviewed. Sets closedBy/closedAt and reviewedBy/reviewedAt                           |

**Validation logic:** Refund guards (already refunded, not completed). Reconciliation duplicate prevention. Status flow enforcement.

---

### 2.3 InsuranceClaimService (296 lines)

| Method                           | Parameters                                                                                          | Return Type              | DB Operations                                                              | Business Logic                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list(query)`                    | `InsuranceClaimQuery` (page, limit, search, status, patientId, dateFrom, dateTo, sortBy, sortOrder) | `{ claims, meta }`       | `InsuranceClaim.find()`, `InsuranceClaim.countDocuments()`                 | Paginated, search by claimNumber regex. Populates patient (name/code) and invoice (number/total)                                                                                                                                                                                                                                                             |
| `getById(id)`                    | `id: string`                                                                                        | `IInsuranceClaim` (lean) | `InsuranceClaim.findById().populate().lean()`                              | Full populate: patient (name, code, insurance), invoice (number, total, paid, balance, status)                                                                                                                                                                                                                                                               |
| `create(data, userId)`           | `CreateInsuranceClaimInput, userId: string`                                                         | `IInsuranceClaim`        | `Invoice.findById().lean()`, `InsuranceClaim.create()`                     | **Validates**: invoice exists, claimedAmount ≤ totalAmount. Sets status=submitted, converts dates. Logs creation                                                                                                                                                                                                                                             |
| `updateStatus(id, data, userId)` | `id: string, UpdateClaimStatusInput, userId: string`                                                | `IInsuranceClaim`        | `InsuranceClaim.findById()`, `claim.save()`, `Invoice.findByIdAndUpdate()` | **6-status flow** with `VALID_INSURANCE_CLAIM_STATUS_TRANSITIONS` from shared. **approved/partially_approved**: requires approvedAmount, calculates patientResponsibility, **updates linked invoice** (insuredAmount, patientResponsibility). **denied**: requires denialReason, sets approvedAmount=0, updates invoice (patient pays full). Logs transition |
| `attachDocument(id, doc)`        | `id: string, { name, url, type }`                                                                   | `IInsuranceClaim`        | `InsuranceClaim.findById()`, `claim.save()`                                | **PDF-only validation** (application/pdf per SECURITY §8). Pushes doc to documents array                                                                                                                                                                                                                                                                     |
| `removeDocument(id, docId)`      | `id: string, docId: string`                                                                         | `IInsuranceClaim`        | `InsuranceClaim.findById()`, `claim.save()`                                | Finds document by \_id in array, throws if not found, splices it out                                                                                                                                                                                                                                                                                         |
| `getAgingReport(query)`          | `ClaimAgingQuery` (asOfDate, insuranceCompanyId)`                                                   | `{ aging, asOfDate }`    | `InsuranceClaim.aggregate()` (**$addFields, $bucket**)                     | Calculates age in days from claimDate. Buckets: 0-30, 31-60, 61-90, 90+ days. Returns count, totalAmount, claim details per bucket. **⚠️ insuranceCompanyId filter is incomplete (simplified comment)**                                                                                                                                                      |

**Validation logic:** Claimed amount ≤ total. 6-status transition validation. PDF-only documents. Invoice cross-update on approval/denial.

---

### 2.4 InsuranceCompanyService (187 lines)

| Method                | Parameters                                                                 | Return Type                | DB Operations                                                                    | Business Logic                                                                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list(query)`         | `InsuranceCompanyQuery` (page, limit, search, isActive, sortBy, sortOrder) | `{ companies, meta }`      | `InsuranceCompany.find()`, `InsuranceCompany.countDocuments()`                   | Bilingual search (name.en, name.ar, code). Filter by isActive                                                                                                                                         |
| `getById(id)`         | `id: string`                                                               | `IInsuranceCompany` (lean) | `InsuranceCompany.findById().lean()`                                             | Simple fetch                                                                                                                                                                                          |
| `create(data)`        | `CreateInsuranceCompanyInput`                                              | `IInsuranceCompany`        | `InsuranceCompany.findOne()`, `InsuranceCompany.create()`                        | **Code uniqueness check**. Throws conflict if exists                                                                                                                                                  |
| `update(id, data)`    | `id: string, UpdateInsuranceCompanyInput`                                  | `IInsuranceCompany`        | `InsuranceCompany.findById()`, `InsuranceCompany.findOne()`, `company.save()`    | Code uniqueness re-check (excluding self). Granular field updates: name (en/ar), code, contactPerson, phone, email, coveragePercentage, maxCoverage, isActive                                         |
| `deactivate(id)`      | `id: string`                                                               | `IInsuranceCompany`        | `InsuranceCompany.findById()`, `company.save()`                                  | Soft delete: sets isActive=false                                                                                                                                                                      |
| `getCompanyStats(id)` | `id: string`                                                               | `{ company, claimStats }`  | `getById()`, `InsuranceClaim.aggregate()` (**$lookup, $unwind, $match, $group**) | Joins claims→patients→insurance array to find claims linked to this company. Groups by status with count + totalAmount + approvedAmount. **Graceful fallback** if InsuranceClaim model not registered |

**Validation logic:** Code uniqueness enforcement. Bilingual search support.

---

### 2.5 InstallmentService (359 lines)

| Method                                                   | Parameters                                                                                 | Return Type               | DB Operations                                                | Business Logic                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list(query)`                                            | `InstallmentQuery` (page, limit, search, status, patientId, sortBy, sortOrder)             | `{ plans, meta }`         | `InstallmentPlan.find()`, `InstallmentPlan.countDocuments()` | Paginated, search by notes. Populates patient+invoice                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `getById(id)`                                            | `id: string`                                                                               | `IInstallmentPlan` (lean) | `InstallmentPlan.findById().populate().lean()`               | Full populate with invoice balance details                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `update(id, data, _userId)`                              | `id: string, UpdateInstallmentPlanInput, string`                                           | `IInstallmentPlan`        | `InstallmentPlan.findById()`, `plan.save()`                  | **Active plans only**. Can update notes and frequency only                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `create(data, userId)`                                   | `CreateInstallmentPlanInput, userId: string`                                               | `IInstallmentPlan`        | `Invoice.findById().lean()`, `InstallmentPlan.create()`      | **Validates**: invoice exists, downPayment < totalAmount. **Auto-calculates** payment schedule: remaining = total - down, installmentAmount = remaining / count (rounded to cents). **Schedule generation**: iterates 1..N, calculates dueDate based on frequency (weekly/biweekly/monthly). **Last installment gets rounding remainder**. Each payment: {installmentNumber, dueDate, amountDue, amountPaid:0, lateFee:0, status:'pending'}. Dispatches `installment.plan_created` webhook |
| `recordPayment(planId, installmentNumber, data, userId)` | `planId: string, installmentNumber: number, RecordInstallmentPaymentInput, userId: string` | `IInstallmentPlan`        | `InstallmentPlan.findById()`, `plan.save()`                  | **Guards**: plan must be active, installment not already paid/waived. Sets amountPaid, lateFee, paidAt, paymentId. **Model pre('save') hook** recalculates remainingAmount and checks completion                                                                                                                                                                                                                                                                                           |
| `waiveInstallment(planId, installmentNumber, userId)`    | `planId: string, installmentNumber: number, userId: string`                                | `IInstallmentPlan`        | `InstallmentPlan.findById()`, `plan.save()`                  | Active plans only. Cannot waive paid installments. Sets status=waived                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `cancelPlan(planId, userId)`                             | `planId: string, userId: string`                                                           | `IInstallmentPlan`        | `InstallmentPlan.findById()`, `plan.save()`                  | Active plans only. Sets status=cancelled                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `markOverdueInstallments()`                              | none                                                                                       | `{ overdueCount }`        | `InstallmentPlan.find()`, `plan.save()` (per plan)           | **Cron candidate**. Finds active plans with pending payments past dueDate. Iterates each, flips pending→overdue. Saves individually (triggers hooks)                                                                                                                                                                                                                                                                                                                                       |
| `listOverdue()`                                          | none                                                                                       | `{ overdueItems, total }` | `InstallmentPlan.find().populate().lean()`                   | Returns flattened list of overdue payments across all plans with patient/invoice details                                                                                                                                                                                                                                                                                                                                                                                                   |

**Validation logic:** Down payment < total. Plan must be active for mutations. Installment status guards (paid/waived). Rounding remainder on last installment.

---

### 2.6 CommissionService (413 lines)

| Method                                                                      | Parameters                                                                                | Return Type                                      | DB Operations                                                                           | Business Logic                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list(query)`                                                               | `CommissionQuery` (page, limit, doctorId, status, invoiceId, startDate, endDate)          | `{ items, meta }`                                | `DoctorCommission.find()`, `DoctorCommission.countDocuments()`                          | Paginated, filterable by doctor/status/invoice/date range                                                                                                                                                                                                                                                      |
| `getById(id)`                                                               | `id: string`                                                                              | `IDoctorCommission` (lean)                       | `DoctorCommission.findById().lean()`                                                    | Simple fetch                                                                                                                                                                                                                                                                                                   |
| `calculateFromInvoice(invoiceId, doctorId, commissionRate, appointmentId?)` | 4 params                                                                                  | `IDoctorCommission[]`                            | `DoctorCommission.find()`, `Invoice.findById().lean()`, `DoctorCommission.insertMany()` | **Idempotent**: returns existing if commissions already exist for invoice. **Validates** rate 0.0–1.0. Creates one commission per invoice item: procedureName, procedureAmount, commissionAmount = item.total × rate (rounded to cents). Status=pending. Dispatches `commission.calculated` webhook with total |
| `approveCommissions(data, _userId)`                                         | `ApproveCommissionsInput` ({ ids: string[] })                                             | `{ approvedCount }`                              | `DoctorCommission.find()`, `DoctorCommission.updateMany()`                              | **Bulk operation**. Validates all specified commissions can transition to 'approved' via `VALID_COMMISSION_STATUS_TRANSITIONS`. Collects invalid IDs for error message. Updates status pending→approved. Dispatches `commission.approved` webhook                                                              |
| `createPayout(data, userId)`                                                | `CreatePayoutInput` (doctorId, periodStart, periodEnd, paymentMethod, reference?), userId | Payout doc                                       | `DoctorCommission.find()`, `CommissionPayout.create()`, `DoctorCommission.updateMany()` | Finds all approved commissions for doctor in date range. **Validates**: at least 1 approved commission exists. Calculates totalAmount (sum of commissionAmount, rounded to cents). Creates payout record. **Transitions all included commissions** to 'paid' with paidAt + payoutId link                       |
| `listPayouts(query)`                                                        | `PayoutQuery` (page, limit, doctorId, startDate, endDate)                                 | `{ items, meta }`                                | `CommissionPayout.find()`, `CommissionPayout.countDocuments()`                          | Paginated payout listing                                                                                                                                                                                                                                                                                       |
| `getDoctorSummary(doctorId, query)`                                         | `doctorId: string, CommissionSummaryQuery` (startDate?, endDate?)                         | `{ doctorId, byStatus, topProcedures, overall }` | `DoctorCommission.aggregate()` (**$facet**)                                             | 3 facets: byStatus (count+total per status), topProcedures (top 10 by commission amount), overall (totalCommissions, totalAmount, avgRate)                                                                                                                                                                     |
| `getCommissionReport(filters)`                                              | `{ startDate?, endDate?, doctorId? }`                                                     | Aggregation result                               | `DoctorCommission.aggregate()`                                                          | Admin-level report grouped by doctorId: totalProcedures, totalProcedureAmount, totalCommissionAmount, avgRate, pending/approved/paid breakdowns                                                                                                                                                                |

**Validation logic:** Commission rate 0.0–1.0. Status transition validation for bulk approve. Idempotent calculation (no duplicates). Rounding to cents.

---

### 2.7 ReportPipelineService (1,935 lines)

This is the largest service. All methods follow the same pattern: `{ summary, chart, table }` return structure with Redis caching (5 min TTL).

#### Financial Pipelines (F1–F7)

| Method                       | Aggregation                                                                                      | Key Metrics                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `revenueByPeriod(filters)`   | Invoice aggregate: group by period (daily/weekly/monthly/quarterly/yearly)                       | totalRevenue, invoiceCount, avgInvoice, maxInvoice                                           |
| `revenueByDoctor(filters)`   | Invoice → $lookup appointments → group by doctorId                                               | revenue per doctor, share %, grand total                                                     |
| `revenueByService(filters)`  | Invoice → $unwind items → group by serviceId/description                                         | revenue per service, quantity, avgPrice. Top 50                                              |
| `revenueByBranch(filters)`   | Invoice → group by branchId                                                                      | revenue per branch, share %                                                                  |
| `paymentCollection(filters)` | Payment → group by paymentMethod                                                                 | totalCollected per method, transaction count, share %                                        |
| `outstandingAging(filters)`  | Invoice (issued/partially_paid/overdue) → $addFields ageDays → $bucket [0-30, 31-60, 61-90, 90+] | totalOutstanding, invoiceCount per bucket. Returns invoice details (capped at 20 per bucket) |
| `taxReport(filters)`         | Invoice (non-cancelled) → group by period                                                        | totalTax, totalRevenue, effectiveRate %, invoiceCount                                        |

#### Patient Pipelines (P1–P5)

| Method                           | Aggregation                                                                                                   | Key Metrics                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `patientOverview(filters)`       | Patient $facet: total/active/inactive/newThisMonth + monthly trend                                            | total, active, inactive, newThisMonth                   |
| `newVsReturning(filters)`        | Appointment → self-$lookup for first visit → $addFields isNew → group by period                               | newPatients, returningPatients, newRate                 |
| `patientDemographics(filters)`   | Patient: 3 parallel aggregations (gender, age buckets [0-12,13-17,18-29,30-44,45-59,60+], nationality top 20) | gender breakdown %, age distribution, top nationalities |
| `noShowReport(filters)`          | Appointment (no_show): by doctor, by dayOfWeek, total appointments count                                      | noShowRate, by day chart, by doctor table               |
| `patientSourceReferral(filters)` | Patient → group by referralSource                                                                             | per-source count + percentage                           |

#### Appointment Pipelines (A1–A6)

| Method                          | Aggregation                                                            | Key Metrics                                       |
| ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| `appointmentSummary(filters)`   | Appointment → group by status                                          | total per status, percentage                      |
| `doctorUtilization(filters)`    | Appointment (non-cancelled) + DoctorSchedule → slot count calculation  | utilization % per doctor (booked/available)       |
| `chairUtilization(filters)`     | Appointment (non-cancelled/no_show) → group by chairId/roomId          | appointments per chair, totalMinutes, occupancy % |
| `cancellationAnalysis(filters)` | Appointment (cancelled): by reason + weekly trend + total appointments | cancellationRate, byReason breakdown              |
| `peakHoursHeatmap(filters)`     | Appointment → group by dayOfWeek+hour → 7×24 matrix                    | heatmap matrix, peakSlot identification           |
| `avgDurationAnalysis(filters)`  | Appointment (completed, duration>0): by serviceType + by doctor        | avgDuration per serviceType, per doctor           |

#### Clinical Pipelines (C1–C4)

| Method                             | Aggregation                                                         | Key Metrics                                        |
| ---------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| `proceduresPerformed(filters)`     | ProcedureNote → $unwind procedures → group by code/name + by doctor | totalProcedures, totalRevenue, top 15              |
| `treatmentPlanAcceptance(filters)` | TreatmentPlan → group by status                                     | acceptanceRate = (accepted+completed)/total        |
| `labOrderTurnaround(filters)`      | LabOrder (completed) → calculate turnaround hours → group by labId  | avgTurnaroundHours per lab, min/max                |
| `prescriptionVolume(filters)`      | Prescription: by medication, by doctor, trend by period             | totalPrescriptions, uniqueMedications, top 30 meds |

#### Operational Pipelines (O1–O4)

| Method                         | Aggregation                                                                        | Key Metrics                                       |
| ------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| `commissionSummary(filters)`   | DoctorCommission → group by doctorId                                               | pending/approved/paid amounts per doctor, avgRate |
| `dailyReconciliation(filters)` | Reconciliation → group by date+branch                                              | expected vs actual, matchRate, difference         |
| `waitTimeAnalysis(filters)`    | Appointment (with actualStartTime) → calculate waitMinutes → by branch + by doctor | avgWaitMinutes, maxWait                           |
| `staffProductivity(filters)`   | Appointment (completed) + Invoice revenue → by doctor                              | apptPerDay, revenue per appointment               |

#### Dispatcher Method

| Method                           | Logic                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `getReport(reportType, filters)` | Routes to correct pipeline method via switch statement. Handles 23 report types across 4 categories |

**DB Models Used:** Invoice, Payment, DoctorCommission, Reconciliation, Patient, Appointment, DoctorSchedule, ProcedureNote, TreatmentPlan, LabOrder, Prescription (11 models total)

---

## 3. WEBHOOK EVENTS INVENTORY

| Source Service     | Event Name                 | Payload Fields                                                  |
| ------------------ | -------------------------- | --------------------------------------------------------------- |
| InvoiceService     | `invoice.created`          | invoiceId, invoiceNumber, patientId, totalAmount, status        |
| InvoiceService     | `invoice.issued`           | invoiceId, invoiceNumber, status='issued'                       |
| InvoiceService     | `invoice.paid`             | invoiceId, invoiceNumber, paidAt                                |
| InvoiceService     | `invoice.overdue`          | invoiceId, invoiceNumber, status='overdue'                      |
| InvoiceService     | `invoice.voided`           | invoiceId, invoiceNumber, status='cancelled'                    |
| InvoiceService     | `invoice.sent`             | invoiceId, invoiceNumber, patientId                             |
| PaymentService     | `payment.received`         | paymentId, invoiceId, patientId, amount, paymentMethod          |
| PaymentService     | `payment.refunded`         | paymentId, invoiceId, amount, reason                            |
| InstallmentService | `installment.plan_created` | planId, invoiceId, patientId, numberOfInstallments, totalAmount |
| CommissionService  | `commission.calculated`    | invoiceId, doctorId, count, totalAmount                         |
| CommissionService  | `commission.approved`      | ids, approvedCount                                              |

**Total: 11 distinct webhook events**

> **⚠️ Signature mismatch noted:** Services call `dispatchWebhook(tenantDb, 'event.name' as TenantWebhookEvent, { data })` with 3 args, but the dispatcher signature accepts `(tenantDb: Connection, payload: WebhookDispatchPayload)` with 2 args (where payload = `{ event, data, tenantSlug }`). This may cause runtime issues or silently drop event data.

---

## 4. WORKER / CRON INVENTORY

### 4.1 Phase 4 Financial Workers

| Worker                      | Queue Name         | Schedule           | What It Does                                                                                                                                                                                                  |
| --------------------------- | ------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Invoice Overdue Worker**  | `invoice-overdue`  | Daily at 01:00 UTC | Iterates all tenant DBs, finds invoices with status='issued' and dueDate < now, bulk updates to 'overdue'. Logs count per tenant                                                                              |
| **Report Scheduler Worker** | `report-scheduler` | Every 5 minutes    | Iterates all tenant DBs, finds active report schedules with nextRunAt ≤ now. Creates history entries (status=pending), queues export jobs, calculates next run for daily/weekly/monthly                       |
| **Report Export Worker**    | `report-export`    | On-demand (queued) | Resolves tenant DB, fetches pipeline data (falls back to sample data), generates CSV/Excel/PDF buffer. Updates history status (pending→processing→completed/failed). Emails report if schedule has recipients |

### 4.2 General Platform Workers (Non-Financial, for reference)

| Worker                 | Queue Name               | Schedule                  |
| ---------------------- | ------------------------ | ------------------------- |
| Appointment Reminders  | `appointment-reminders`  | Every 15 minutes          |
| Auto No-Show           | `auto-no-show`           | Registered via addCronJob |
| Scheduled Alerts       | `scheduled-alerts`       | Registered via addCronJob |
| Inventory Expiry       | `inventory-expiry`       | Registered via addCronJob |
| Inventory Auto-Reorder | `inventory-auto-reorder` | Registered via addCronJob |
| Workflow Execution     | `workflow-execution`     | On-demand                 |

### 4.3 Queue Infrastructure

- **Shared connection factory** in `jobs/queue.ts` with connection pooling
- **Queue cache** (Map<string, Queue>) prevents duplicate instances
- **Default job options**: removeOnComplete=1000, removeOnFail=5000, attempts=3, exponential backoff
- **Worker factory**: concurrency=5, completed/failed/error event logging
- **Cron helper**: cleans up existing repeatable jobs before re-registering

### 4.4 Worker Config Details

| Worker           | Concurrency | Retry      | Backoff         | Rate Limit |
| ---------------- | ----------- | ---------- | --------------- | ---------- |
| Invoice Overdue  | 1           | 2 attempts | Exponential 10s | None       |
| Report Scheduler | 1           | Default    | Default         | None       |
| Report Export    | 3           | 2 attempts | Exponential 5s  | 10/minute  |

---

## 5. INCOMPLETE / TODO ITEMS

### 5.1 Explicit TODOs & Placeholders

| File                         | Line     | Issue                                                                                                                                                                                                                                        | Severity   |
| ---------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `insurance-claim.service.ts` | L243     | `// This is a simplified version; full implementation would join patients` — Aging report's `insuranceCompanyId` filter is **not implemented**. The match stage doesn't actually use it.                                                     | **Medium** |
| `invoice-overdue.service.ts` | L93-95   | `// Phase 4+: Queue overdue notification for each invoice` / `// Optionally send email/SMS reminders via NotificationService` / `// For now, we just mark the status transition` — Overdue notifications to patients are **not implemented** | **Medium** |
| `report-export.service.ts`   | L175     | `// ── Placeholder Data Fetcher ──` label, though the actual implementation now uses real pipeline data with a sample-data fallback                                                                                                          | **Low**    |
| `report-export.service.ts`   | L152-155 | PDF generation is a **text-based fallback**, not real PDF. Comment says "For production, integrate with @react-pdf/renderer or puppeteer"                                                                                                    | **Medium** |

### 5.2 Incomplete Functionality

| Area                              | Description                                                                                                                                                                             | Impact                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Insurance aging report            | `insuranceCompanyId` filter parameter accepted but **never applied** to the aggregation pipeline                                                                                        | Filtering by company returns unfiltered results                 |
| Webhook dispatcher call signature | Services pass 3 args `(db, event_string, data_object)`, but the exported function accepts 2 args `(db, payload_object)`. Could be silently failing or relying on JS arg ignore behavior | Webhooks may not dispatch correctly                             |
| Overdue invoice notifications     | Worker marks status but doesn't send email/SMS/push notifications to patients                                                                                                           | Patients unaware of overdue invoices                            |
| PDF export                        | Uses text-based representation, not actual PDF format                                                                                                                                   | Exported "PDF" files won't open in PDF viewers                  |
| Reconciliation branch filter      | `openReconciliation` aggregates payments without filtering by branchId in the $match stage — aggregates ALL branches' payments                                                          | Reconciliation totals may be incorrect for multi-branch clinics |
| Doctor commission objectId        | `getDoctorSummary` uses `doctorId: { $in: [doctorId] }` with string comparison — comment notes "will need ObjectId conversion in route"                                                 | May not match if stored as ObjectId                             |

---

## 6. CROSS-SERVICE DEPENDENCIES

```
┌──────────────────────┐
│    PaymentService     │
│                       │
│  create()  ──────────►│──► InvoiceService.recordPayment()
│  refund()  ──────────►│──► InvoiceService.reversePayment()
│  recordOnlinePayment()│──► InvoiceService.recordPayment()
└──────────────────────┘

┌──────────────────────┐
│ InsuranceClaimService │
│                       │
│  updateStatus() ─────►│──► Invoice.findByIdAndUpdate() [direct model]
│  create()      ──────►│──► Invoice.findById() [validation only]
└──────────────────────┘

┌──────────────────────┐
│  CommissionService    │
│                       │
│  calculateFromInvoice()│──► Invoice.findById() [reads items]
└──────────────────────┘

┌──────────────────────┐
│    InvoiceService     │
│                       │
│  generateFromTreatmentPlan()│──► TreatmentPlan.findById()
│  getPdfData()        ──►│──► Settings.findOne()
└──────────────────────┘

┌──────────────────────┐
│  ReportPipelineService│
│                       │
│  Reads from 11 models │ (read-only aggregation pipelines)
└──────────────────────┘

┌──────────────────────┐
│ ReportSchedulerWorker │
│                       │
│  Check due schedules ►│──► ReportExportService.queueReportExport()
│                       │──► ReportHistory.create()
│                       │──► ReportSchedule.updateOne() [nextRunAt]
└──────────────────────┘

┌──────────────────────┐
│ ReportExportWorker    │
│                       │
│  Process export ─────►│──► ReportPipelineService.getReport() [data]
│                 ─────►│──► ReportHistory.updateOne() [status]
│                 ─────►│──► EmailProvider.sendEmail() [delivery]
└──────────────────────┘

Common dependency: All mutation services → webhook-dispatcher.ts → BullMQ webhook queue
```

### Dependency Summary Table

| Service                 | Depends On                                                | Depended By                                                                                           |
| ----------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| InvoiceService          | TreatmentPlanModel, SettingsModel, webhook-dispatcher     | PaymentService, InsuranceClaimService, CommissionService, ReportPipelineService, InvoiceOverdueWorker |
| PaymentService          | InvoiceService, ReconciliationModel, webhook-dispatcher   | ReportPipelineService                                                                                 |
| InsuranceClaimService   | InvoiceModel, InsuranceClaimModel                         | —                                                                                                     |
| InsuranceCompanyService | InsuranceCompanyModel, InsuranceClaimModel (loose)        | —                                                                                                     |
| InstallmentService      | InvoiceModel, webhook-dispatcher                          | —                                                                                                     |
| CommissionService       | InvoiceModel, CommissionPayoutModel, webhook-dispatcher   | ReportPipelineService                                                                                 |
| ReportPipelineService   | 11 Models (read-only), Redis                              | ReportExportWorker                                                                                    |
| ReportSchedulerWorker   | ReportSchedule/History models, ReportExportService        | —                                                                                                     |
| ReportExportWorker      | ReportPipelineService, ReportHistory model, EmailProvider | —                                                                                                     |
| InvoiceOverdueWorker    | InvoiceModel (direct)                                     | —                                                                                                     |

---

## 7. BUSINESS LOGIC COMPLEXITY ASSESSMENT

| Service                     | Complexity      | Reason                                                                                                                                                                     |
| --------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **InvoiceService**          | **High**        | 14 methods. Server-side amount recalculation. 5 status transitions. Treatment plan conversion. Auto-status on payment. 6 webhook events. PDF data assembly                 |
| **PaymentService**          | **High**        | 8 methods. Auto-reconciliation via InvoiceService. Online payment gateway integration. Full reconciliation lifecycle (open→close→review) with payment aggregation          |
| **InsuranceClaimService**   | **Medium-High** | 7 methods. 6-status claim flow. Cross-updates to invoice (insuredAmount/patientResponsibility). Aging report with bucket aggregation. Document management                  |
| **InsuranceCompanyService** | **Low**         | 6 methods. Standard CRUD with code uniqueness. Stats via cross-collection $lookup                                                                                          |
| **InstallmentService**      | **Medium-High** | 9 methods. Auto-calculated payment schedules with frequency math. Late fee tracking. Overdue marking. Multiple status guards per installment                               |
| **CommissionService**       | **Medium-High** | 7 methods. Per-item commission calculation from invoices. Bulk approve with validation. Payout creation with batch status transition. Summary aggregation with $facet      |
| **ReportPipelineService**   | **Very High**   | 23 pipeline methods + dispatcher. 11 models. Complex MongoDB aggregation ($facet, $bucket, $lookup, $addFields, $unwind). Redis caching layer. Matrix generation (heatmap) |
| **ReportSchedulerWorker**   | **Medium**      | Multi-tenant iteration. Schedule frequency calculation. History tracking. Job queuing                                                                                      |
| **ReportExportWorker**      | **Medium-High** | 3 export formats (CSV streaming, Excel with styling, PDF placeholder). Pipeline data integration. Email delivery with HTML template. Error recovery with history updates   |
| **InvoiceOverdueWorker**    | **Low**         | Single-purpose bulk update across tenants                                                                                                                                  |

---

## 8. ERROR HANDLING PATTERNS

| Pattern                        | Used In                                                                                            | Notes                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `ApiError.notFound('Entity')`  | All tenant services                                                                                | Consistent 404 pattern                                |
| `ApiError.badRequest(message)` | All tenant services                                                                                | Status transition failures, validation failures       |
| `ApiError.conflict(message)`   | InsuranceCompanyService, PaymentService                                                            | Duplicate code, duplicate reconciliation              |
| `try/catch + logger.warn`      | All webhook dispatches                                                                             | Non-critical webhook failures don't break main flow   |
| `try/catch + continue`         | Worker iteration loops                                                                             | Per-tenant errors don't stop processing other tenants |
| `try/catch + throw`            | Report export worker                                                                               | Re-throws to trigger BullMQ retry                     |
| Graceful fallback              | InsuranceCompanyService.getCompanyStats, ReportPipelineService Redis, ReportExportService pipeline | Falls back to empty/sample data on failure            |

**Error types used:** `ApiError` custom class with `.notFound()`, `.badRequest()`, `.conflict()` factory methods.

---

## 9. SUMMARY STATISTICS

| Metric                    | Count                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Total service files       | 10                                                                                                                                            |
| Total lines of code       | 4,969                                                                                                                                         |
| Total public methods      | 80+                                                                                                                                           |
| Webhook event types       | 11                                                                                                                                            |
| BullMQ queues (financial) | 3 (invoice-overdue, report-scheduler, report-export)                                                                                          |
| MongoDB models used       | 15+                                                                                                                                           |
| Aggregation pipelines     | 23 (in ReportPipelineService) + 6 (in other services)                                                                                         |
| Status machines           | 4 (invoice, insurance claim, commission, reconciliation)                                                                                      |
| Cross-service calls       | 6 (PaymentService→InvoiceService, InsuranceClaim→Invoice, Commission→Invoice, ReportScheduler→Export, Export→Pipeline, Invoice→TreatmentPlan) |
| Issues/TODOs found        | 6                                                                                                                                             |
