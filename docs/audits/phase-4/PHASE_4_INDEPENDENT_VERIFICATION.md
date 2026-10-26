# Phase 4 (Financial, Weeks 14–16) — Independent Verification Audit

> **Scan Date:** 2026-03-05  
> **Method:** Full independent codebase scan against all 9 planning documents  
> **Documents Verified Against:** BUILD_RULES, DENTO_V2_MASTER_PLAN, IMPLEMENTATION_ROADMAP, SECURITY_AND_ENCRYPTION, TECH_REQUIREMENTS, V2_DATABASE, V2_DECISION_LOG, V2_STRUCTURE, PLATFORM_RBAC  
> **Branch:** `main`  
> **Previous Evaluation Claim:** 100% A+ across all 5 layers

---

## Executive Summary

| Layer                      | Claimed     | Verified | Actual Grade | Gap Count              |
| -------------------------- | ----------- | -------- | ------------ | ---------------------- |
| **Backend Routes**         | 100% A+     | **92%**  | **A-**       | 6 issues               |
| **Backend Services**       | 100% A+     | **93%**  | **A-**       | 5 issues               |
| **Backend Models**         | 100% A+     | **88%**  | **B+**       | 8 issues               |
| **Shared Schemas & Types** | 100% A+     | **96%**  | **A**        | 3 minor issues         |
| **Frontend**               | 100% A+     | **85%**  | **B+**       | 3 categories of issues |
| **Security & RBAC**        | 100% A+     | **90%**  | **A-**       | 4 issues               |
| **Test Coverage**          | 100% A+     | **95%**  | **A**        | 2 gaps                 |
| **Overall**                | **100% A+** | **~91%** | **A-**       | **31 issues total**    |

**Verdict:** The previous evaluation's 100% A+ claim is **overstated**. The implementation is **solid and functional** (~91%) but has 31 verifiable gaps against the 9 planning documents. Most are MEDIUM severity — no showstoppers, but not 100%.

---

## 1. BACKEND ROUTES — 92% (A-)

### 1.1 What's Correct ✅

- **65 endpoints** across 11 route files — all IMPLEMENTATION_ROADMAP §6 endpoints present
- `authGuard + tenantDbMiddleware` on **100%** of endpoints
- `roleGuard` on **100%** of mutation endpoints (POST/PUT/PATCH/DELETE)
- `apiResponse/apiError` helpers used consistently (except dashboard)
- Zod schema validation on all create/update bodies using `@dento/shared` schemas (~95%)
- Thin handler → service delegation pattern followed (~95%)
- URL conventions: plural nouns, kebab-case ✅
- HTTP status codes correct (POST creates → 201, actions → 200, exports → 202) ✅
- Zero TODO/FIXME/HACK comments

### 1.2 Issues Found ❌

| #   | Issue                                                                                                                                                                                                                                                 | Severity   | Source Rule                                        | File(s)                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| R1  | **No rate limiting on mutation endpoints** — Only `insurance-claims POST /:id/documents` has rate limiting (RATE_LIMITS.UPLOAD). All other POST/PUT/PATCH/DELETE across invoices, payments, installments, commissions, reports lack rate limit config | **HIGH**   | SECURITY §6 (3-tier rate limiting), BUILD_RULES §5 | 6 route files                                                                        |
| R2  | **dashboard.route.ts: Fat handler / no service layer** — 200+ lines of MongoDB aggregation logic inline in route handler, violating BUILD_RULES §5.2 thin handler pattern                                                                             | **HIGH**   | BUILD_RULES §5.2                                   | dashboard.route.ts (245 lines)                                                       |
| R3  | **dashboard.route.ts: No error handling** — No try/catch blocks; unhandled aggregation errors propagate as 500s without proper apiError formatting                                                                                                    | **HIGH**   | BUILD_RULES §4 (Error Response Contract)           | dashboard.route.ts                                                                   |
| R4  | **GET endpoints missing `roleGuard('module','read')`** — 6 route files only have authGuard on reads, not roleGuard. Only report-management.route.ts and report-data.route.ts have roleGuard on reads                                                  | **MEDIUM** | SECURITY §4 Layer 3 (RBAC), BUILD_RULES §5.1       | invoices, payments, insurance-claims, insurance-companies, installments, commissions |
| R5  | **report-management DELETE uses wrong permission** — `DELETE /saved/:id` and `DELETE /scheduled/:id` use `roleGuard('reports','create')` instead of `roleGuard('reports','delete')`                                                                   | **MEDIUM** | SECURITY §4 Layer 3                                | report-management.route.ts                                                           |
| R6  | **commissions `POST /calculate/:invoiceId` uses manual body parsing** instead of Zod schema validation — `request.body as {...}` with manual required check                                                                                           | **MEDIUM** | BUILD_RULES §7.1, §8.4                             | commissions.route.ts                                                                 |

---

## 2. BACKEND SERVICES — 93% (A-)

### 2.1 What's Correct ✅

- **All 7 services** follow `constructor(tenantDb: Connection)` pattern per BUILD_RULES §5.2
- **24 model factory calls** — all use `get*Model(tenantDb)` pattern, zero raw `mongoose.model()` usage
- Total 3,750 lines across 7 service files — substantial business logic
- Business rules correctly implement financial workflows:
  - Invoice: Treatment plan → invoice generation, line items, tax, status transitions, overdue detection, PDF data
  - Payment: 8 payment methods, auto-reconciliation, refunds, online payment recording
  - Insurance Claims: Coverage calculation, 6-state status flow, document management, aging report
  - Installments: Schedule generation, frequency support, down payment validation, rounding correction, overdue detection
  - Commissions: Per-line-item calculation, idempotency, bulk approve, payout generation
  - Reports: 26 report pipelines with Redis caching, `{ summary, chart, table }` output format
- `ApiError` (notFound/badRequest/conflict) used consistently in all services
- Zero TODO/FIXME/HACK comments

### 2.2 Issues Found ❌

| #   | Issue                                                                                                                                                                                                                                          | Severity   | Source Rule                                                               | File(s)                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------- | -------------------------- |
| S1  | **InsuranceClaimService has ZERO webhook dispatch** — No events for claim.created, claim.status_updated. All other financial services dispatch webhooks.                                                                                       | **HIGH**   | BUILD_RULES §23 (24 standard events include financial)                    | insurance-claim.service.ts |
| S2  | **No BullMQ cron wired to `markOverdueInvoices()` or `markOverdueInstallments()`** — Methods exist in services but no cron job calls them. The alert.cron.ts handles `payment_overdue` alerts but doesn't call these service methods directly. | **HIGH**   | IMPLEMENTATION_ROADMAP §6 Week 14 (auto-overdue), Week 15 (auto-reminder) | queue.ts, missing cron     |
| S3  | **InstallmentService missing webhooks** for `installment.payment_recorded`, `installment.overdue`, `installment.plan_cancelled` — only dispatches `installment.plan_created`                                                                   | **MEDIUM** | BUILD_RULES §23                                                           | installment.service.ts     |
| S4  | **CommissionService missing webhook** for `commission.payout_created` — dispatches `commission.calculated` and `commission.approved` but not payout                                                                                            | **MEDIUM** | BUILD_RULES §23                                                           | commission.service.ts      |
| S5  | **Split payments are implicit only** — Multiple payments against same invoice work but no dedicated split-payment API or explicit split tracking                                                                                               | **LOW**    | MASTER_PLAN §9 (mentions split payments)                                  | payment.service.ts         |

---

## 3. BACKEND MODELS — 88% (B+)

### 3.1 What's Correct ✅

- **All 9 required financial collections** implemented (Invoice, Payment, InsuranceClaim, InsuranceCompany, InstallmentPlan, Reconciliation, CommissionPayout, DoctorCommission, Report[3 sub-models])
- All field types and constraints correct
- All V2_DATABASE index specifications implemented (some have bonus indexes)
- Mongoose `timestamps: true` on all models
- Model factory functions exported for all models
- Pre-hooks for auto-generated numbers (INV-YYYY-NNNNN, CLM-YYYY-NNNNN)
- Pre-save hook for `balanceDue` calculation on Invoice
- Pre-save hook for auto-completion on InstallmentPlan
- Enum values match V2_DATABASE and @dento/shared constants
- Commission payout correctly uses `{ createdAt: true, updatedAt: false }` (immutable)

### 3.2 Issues Found ❌

| #   | Issue                                                                                                                                                                                                                                                 | Severity   | Source Rule                                                                 | Affected Models                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------- | ---------- | ------- | ----------------- | --------------- |
| M1  | **6 models have wrong collection names** — Mongoose auto-pluralizes, producing `insuranceclaims` instead of `insurance_claims`, `installmentplans` instead of `installment_plans`, etc. Only Payment and Report models set explicit collection names. | **HIGH**   | V2_DATABASE §7 (explicit snake_case collection names), BUILD_RULES §6       | InsuranceClaim, InsuranceCompany, InstallmentPlan, Reconciliation, CommissionPayout, DoctorCommission |
| M2  | **Missing `updatedBy` audit field** on InsuranceClaim, InsuranceCompany, InstallmentPlan, DoctorCommission                                                                                                                                            | **MEDIUM** | BUILD_RULES §6.4 (audit fields)                                             | 4 models                                                                                              |
| M3  | **Missing `createdBy` audit field** on InsuranceCompany, DoctorCommission                                                                                                                                                                             | **MEDIUM** | BUILD_RULES §6.4                                                            | 2 models                                                                                              |
| M4  | **Report model missing `inventory` category** — `reportCategories` array has 5 values but @dento/shared `ReportCategory` includes `'inventory'` as 6th. 10 inventory report types also missing from `reportTypes` enum validation.                    | **MEDIUM** | @dento/shared alignment, MASTER_PLAN §21                                    | report.model.ts                                                                                       |
| M5  | **Missing `quarterly` schedule frequency** — Model has `daily                                                                                                                                                                                         | weekly     | monthly`but V2_DATABASE §11.5 specifies`daily                               | weekly                                                                                                | monthly | quarterly` | **LOW** | V2_DATABASE §11.5 | report.model.ts |
| M6  | **Missing `ref` on `insuranceClaimId`** in Invoice model — ObjectId without `ref: 'InsuranceClaim'` prevents Mongoose `.populate()`                                                                                                                   | **LOW**    | Best practice                                                               | invoice.model.ts                                                                                      |
| M7  | **Missing `ref` on `createdBy`/`updatedBy`** across most models — no `ref: 'User'` on audit ObjectIds                                                                                                                                                 | **LOW**    | N/A (User is in platform DB — refs would be cross-database, not applicable) | Multiple models                                                                                       |
| M8  | **Reconciliation collection name mismatch** — Default `reconciliations` vs V2_DATABASE spec `reconciliation` (singular)                                                                                                                               | **LOW**    | V2_DATABASE §7.6                                                            | reconciliation.model.ts                                                                               |

---

## 4. SHARED SCHEMAS & TYPES — 96% (A)

### 4.1 What's Correct ✅

- **36 Zod schemas** across 6 schema files (invoice, payment, insurance, installment, commission, report)
- **34/36 schemas** use `.strict()` explicitly per BUILD_RULES §7.3
- **19 constants** exported (status transitions, valid statuses, enums)
- **37 TypeScript types** inferred from Zod schemas
- All expected fields present with correct types on all create/update/query schemas
- Status enums and transition maps match V2_DATABASE specifications
- Reconciliation schemas co-located in payment.schema.ts (acceptable)
- Report schemas comprehensive: 6 categories, 28+ report types, filter/export/saved/schedule schemas

### 4.2 Issues Found ❌

| #   | Issue                                                                                                                                                                                                            | Severity | Source Rule                                        | File(s)                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------- | -------------------------------------- |
| SC1 | **`updateInvoiceSchema` and `updateInsuranceCompanySchema` derive `.strict()` implicitly** via `.omit().partial()` instead of explicit `.strict()` call                                                          | **LOW**  | BUILD_RULES §7.3 ("MUST use `.strict()`")          | invoice.schema.ts, insurance.schema.ts |
| SC2 | **`VALID_COMMISSION_STATUS_TRANSITIONS` weakly typed** as `Record<string, string[]>` instead of `Record<CommissionStatus, readonly CommissionStatus[]>` — loses type safety vs invoice/insurance transition maps | **LOW**  | TypeScript best practices                          | commission.schema.ts                   |
| SC3 | **Inline Zod schemas in routes** — `attachDocumentSchema` (insurance-claims), `historyQuerySchema` (report-management), `idParamSchema` (report-helpers) defined in route files instead of @dento/shared         | **LOW**  | BUILD_RULES §7.1 (shared schemas in @dento/shared) | 3 route files                          |

---

## 5. FRONTEND — 85% (B+)

### 5.1 What's Correct ✅

- **52 files** across 6 feature modules (invoices, payments, insurance, installments, commissions, reports)
- React Query with `queryKeys` factory pattern used correctly in all 6 hooks per BUILD_RULES §8.3
- React Hook Form + Zod resolver pattern used correctly in all 6 major forms per BUILD_RULES §8.4
- Loading/Error/Empty state components present on all list and detail pages per BUILD_RULES §15
- Reports module is **fully RTL-compliant** — uses `me-`/`ms-`/`text-start`/`text-end` logical properties
- Zero TODO/FIXME/HACK comments

### 5.2 Issues Found ❌

| #   | Issue                                                                                                                                                                                                      | Severity   | Source Rule                                                                                       | Files Affected                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| FE1 | **All 6 form components define Zod schemas locally** instead of importing from `@dento/shared` — despite shared schemas existing with identical definitions                                                | **HIGH**   | BUILD_RULES §8.4 ("Always: React Hook Form + Zod resolver + **shared schema**"), BUILD_RULES §7.1 | 6 form components                                                            |
| FE2 | **85 physical CSS property violations** across 25 files — using `ml-`/`mr-`/`pl-`/`pr-`/`text-left`/`text-right` instead of RTL-safe logical equivalents (`ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`) | **HIGH**   | BUILD_RULES §11 (RTL support mandatory)                                                           | 25 files in invoices, payments, insurance, installments, commissions modules |
| FE3 | **3 dialog forms use `useState`** for form data instead of React Hook Form + Zod                                                                                                                           | **MEDIUM** | BUILD_RULES §8.4, §8.5 (no useState for form data)                                                | 3 dialog components                                                          |

---

## 6. SECURITY & RBAC — 90% (A-)

### 6.1 What's Correct ✅

- `authGuard` on **100%** of endpoints (verified across all 11 route files)
- `tenantDbMiddleware` on **100%** of endpoints
- `roleGuard` on **100%** of mutation endpoints
- RBAC permission modules correctly mapped: `invoices`, `payments`, `insurance`, `installments`, `commissions`, `reports`
- Zod `.strict()` validation prevents mass-assignment attacks
- Proper status transition validation prevents unauthorized state manipulation
- ApiError class provides standardized error responses with requestId and timestamp
- Payment model stores no raw card data (PCI DSS compliant) — only `last4`, `cardBrand`, `providerPaymentId`
- Webhook signature verification (HMAC-SHA256) implemented per BUILD_RULES §23

### 6.2 Issues Found ❌

| #    | Issue                                                                                                        | Severity   | Source Rule                               | Details                      |
| ---- | ------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------- | ---------------------------- |
| SEC1 | **No rate limiting on financial mutation endpoints**                                                         | **HIGH**   | SECURITY §6 (3-tier rate limiting)        | See R1 above                 |
| SEC2 | **GET endpoints missing roleGuard** for read operations                                                      | **MEDIUM** | SECURITY §4 Layer 3 (RBAC complete chain) | See R4 above — 6 route files |
| SEC3 | **DELETE endpoints using wrong permission**                                                                  | **MEDIUM** | SECURITY §4                               | See R5 above                 |
| SEC4 | **InsuranceClaim service has no webhook dispatch** — webhook audit trail incomplete for insurance operations | **MEDIUM** | BUILD_RULES §23                           | See S1 above                 |

---

## 7. TEST COVERAGE — 95% (A)

### 7.1 What's Correct ✅

- **14 test files**, **4,526 lines** of test code, **~439 test blocks**
- **7 service test files** covering all Phase 4 financial services:
  - invoice.service.test.ts (274 lines, 18 tests)
  - payment.service.test.ts (278 lines, 17 tests)
  - insurance-claim.service.test.ts (438 lines, 27 tests — most comprehensive)
  - insurance-company.service.test.ts (259 lines, 21 tests)
  - installment.service.test.ts (403 lines, 23 tests)
  - commission.service.test.ts (381 lines, 31 tests)
  - report-pipeline.service.test.ts (925 lines, 83 tests — covers all 26 pipelines)
- **7 route test files** covering all Phase 4 financial routes:
  - invoices.route.test.ts (209 lines, 33 tests — all 11 endpoints)
  - payments.route.test.ts (188 lines, 25 tests — all 7 endpoints)
  - insurance-claims.route.test.ts (228 lines, 28 tests)
  - insurance-companies.route.test.ts (257 lines, 31 tests)
  - installments.route.test.ts (198 lines, 28 tests)
  - commissions.route.test.ts (215 lines, 27 tests)
  - reports.route.test.ts (503 lines, 47 tests — 16 endpoints including free/paid gating)
- Strong edge case coverage: status transition violations, duplicate prevention, boundary amounts, idempotency, rounding
- Middleware verification: all route tests verify authGuard + roleGuard
- Consistent AAA pattern, proper vi.mock usage, factory functions

### 7.2 Issues Found ❌

| #   | Issue                                                                                                          | Severity   | Source Rule                                       | Details                                                   |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------- | --------------------------------------------------------- |
| T1  | **No frontend tests** — Zero test files for any Phase 4 frontend page/component/hook                           | **MEDIUM** | BUILD_RULES §18 (Component + Hook tests required) | Missing: `*.test.tsx` for pages, `use*.test.ts` for hooks |
| T2  | **No dashboard.route.test.ts** — The dashboard endpoints (GET /stats, GET /trends) have no dedicated test file | **LOW**    | BUILD_RULES §18                                   | Missing test file                                         |

---

## 8. IMPLEMENTATION_ROADMAP §6 — Deliverables Checklist

### Week 14: Invoices + Payments

| Deliverable                         | Status | Notes                                                  |
| ----------------------------------- | ------ | ------------------------------------------------------ |
| Invoices CRUD + items               | ✅     | 11 endpoints, full service layer                       |
| Treatment Plan → Invoice generation | ✅     | `generateFromTreatmentPlan()` method                   |
| Invoice PDF data                    | ✅     | `getPdfData()` with clinic settings                    |
| Payments (Cash/Card/Bank/Online)    | ✅     | 8 payment methods                                      |
| Payment Reconciliation              | ✅     | open → closed → reviewed flow                          |
| Paymob/Stripe integration           | ✅     | `recordOnlinePayment()` + platform webhook handlers    |
| Payment Security (HMAC webhooks)    | ✅     | Webhook signature verification                         |
| Payment Receipts PDF                | ✅     | PDF data generation with `@react-pdf/renderer` support |
| Auto-overdue detection cron         | ⚠️     | Method exists but **no cron job wired**                |

### Week 15: Insurance + Installments

| Deliverable                         | Status | Notes                                                               |
| ----------------------------------- | ------ | ------------------------------------------------------------------- |
| Insurance Companies CRUD            | ✅     | Full CRUD with bilingual names                                      |
| Patient Insurance (embedded)        | ✅     | Referenced via `patientInsuranceIndex`                              |
| Insurance Claims CRUD + status flow | ✅     | 6-state flow with transition validation                             |
| Claim ↔ Invoice linking             | ✅     | `invoiceId` on claim, `insuranceClaimId`/`insuredAmount` on invoice |
| Installment Plans CRUD              | ✅     | Full lifecycle with schedule generation                             |
| Auto-reminder for due installments  | ⚠️     | Method exists but **no cron job wired**                             |

### Week 16: Commissions + Reports

| Deliverable                         | Status | Notes                                     |
| ----------------------------------- | ------ | ----------------------------------------- |
| Doctor Commissions (configurable %) | ✅     | Per-line-item calculation with 0-1 rate   |
| Commission Payouts                  | ✅     | Bulk approve → payout generation          |
| Financial Reports (7 types)         | ✅     | F1-F7 in ReportPipelineService            |
| PDF Export System                   | ✅     | `@react-pdf/renderer` integration         |
| Report Scheduling                   | ✅     | ReportSchedule model + cron worker        |
| Report History                      | ✅     | ReportHistory model with status tracking  |
| Dashboard Stats + Trends            | ✅     | 2 dashboard endpoints (needs refactoring) |

---

## 9. V2_DATABASE §7 — Schema Compliance Matrix

| Collection          | Spec Name             | Actual Name             | Fields Match | Indexes Match | Notes                         |
| ------------------- | --------------------- | ----------------------- | :----------: | :-----------: | ----------------------------- |
| invoices            | `invoices`            | `invoices` ✅           |      ✅      |      ✅       | +3 multi-currency fields      |
| payments            | `payments`            | `payments` ✅           |      ✅      |      ✅       | +5 PCI DSS / refund fields    |
| insurance_claims    | `insurance_claims`    | `insuranceclaims` ❌    |      ✅      |      ✅       | Collection name mismatch      |
| insurance_companies | `insurance_companies` | `insurancecompanies` ❌ |      ✅      |      ✅       | Collection name mismatch      |
| installment_plans   | `installment_plans`   | `installmentplans` ❌   |      ✅      |      ✅       | Collection name mismatch      |
| reconciliation      | `reconciliation`      | `reconciliations` ❌    |      ✅      |      ✅       | Collection name mismatch      |
| doctor_commissions  | `doctor_commissions`  | `doctorcommissions` ❌  |      ✅      |      ✅       | Collection name mismatch      |
| commission_payouts  | `commission_payouts`  | `commissionpayouts` ❌  |      ✅      |      ✅       | Collection name mismatch      |
| saved_reports       | —                     | `saved_reports` ✅      |      ✅      |      ✅       | Explicit collection name      |
| report_schedules    | `report_schedules`    | `report_schedules` ✅   |      ⚠️      |      ✅       | Missing `quarterly` frequency |
| report_history      | —                     | `report_history` ✅     |      ✅      |      ✅       | Explicit collection name      |

---

## 10. BUILD_RULES Compliance Matrix

| Rule                       | Section | Status | Details                                                             |
| -------------------------- | ------- | ------ | ------------------------------------------------------------------- |
| API URL conventions        | §3      | ✅     | Plural, kebab-case, no version prefix                               |
| Error Response Contract    | §4      | ⚠️     | dashboard.route.ts has no error handling                            |
| Service Layer Pattern      | §5.2    | ⚠️     | dashboard.route.ts has fat inline handler                           |
| Model Factory Pattern      | §5.1    | ✅     | 24 factory calls across all services                                |
| Database-per-tenant        | §6      | ✅     | All services receive Connection, use getTenantModel()               |
| Audit fields               | §6.4    | ⚠️     | 4 models missing updatedBy, 2 missing createdBy                     |
| Shared Zod .strict()       | §7.3    | ✅     | 34/36 explicit, 2 implicit (acceptable)                             |
| React Query key factories  | §8.3    | ✅     | All 6 hooks compliant                                               |
| RHF + Zod + shared schema  | §8.4    | ⚠️     | RHF+Zod used but schemas are local, not imported from @dento/shared |
| No useState for forms      | §8.5    | ⚠️     | 3 dialog forms use useState                                         |
| RTL logical properties     | §11     | ⚠️     | 85 violations in 25 files (reports module is clean)                 |
| Loading/Error/Empty states | §15     | ✅     | Present on all data-fetching pages                                  |
| Testing standards          | §18     | ⚠️     | No frontend tests for Phase 4                                       |
| Webhook standards          | §23     | ⚠️     | InsuranceClaim has zero webhooks                                    |

---

## 11. Priority-Ordered Action Items

### Critical (P0) — Should fix before M4 gate

| #   | Action                                                                                                                                                                   | Effort | Category        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------- |
| 1   | Add explicit collection names to 6 models (`insurance_claims`, `insurance_companies`, `installment_plans`, `reconciliation`, `commission_payouts`, `doctor_commissions`) | 30 min | Models          |
| 2   | Add rate limiting to all financial mutation endpoints                                                                                                                    | 1h     | Routes/Security |
| 3   | Import Zod schemas from `@dento/shared` in 6 frontend form components instead of defining locally                                                                        | 2h     | Frontend        |

### High (P1) — Should fix soon

| #   | Action                                                                                                      | Effort | Category        |
| --- | ----------------------------------------------------------------------------------------------------------- | ------ | --------------- |
| 4   | Refactor `dashboard.route.ts` — extract aggregation logic into `DashboardService`, add try/catch + apiError | 2h     | Routes          |
| 5   | Add webhook dispatch to InsuranceClaimService (claim.created, claim.status_updated)                         | 1h     | Services        |
| 6   | Wire BullMQ cron jobs for `markOverdueInvoices()` and `markOverdueInstallments()`                           | 1h     | Jobs/Crons      |
| 7   | Replace 85 physical CSS properties with RTL logical equivalents in 25 frontend files                        | 3h     | Frontend        |
| 8   | Add `roleGuard('module','read')` to GET endpoints in 6 route files                                          | 1h     | Routes/Security |

### Medium (P2) — Should fix in next sprint

| #   | Action                                                                                                      | Effort | Category |
| --- | ----------------------------------------------------------------------------------------------------------- | ------ | -------- |
| 9   | Add `updatedBy` to InsuranceClaim, InsuranceCompany, InstallmentPlan, DoctorCommission                      | 30 min | Models   |
| 10  | Add `createdBy` to InsuranceCompany, DoctorCommission                                                       | 15 min | Models   |
| 11  | Fix report-management DELETE permission from `'create'` to `'delete'`                                       | 5 min  | Routes   |
| 12  | Create Zod schema for commissions `POST /calculate/:invoiceId` body, move to @dento/shared                  | 15 min | Schemas  |
| 13  | Add missing webhook events: installment (payment_recorded, overdue, cancelled), commission (payout_created) | 1h     | Services |
| 14  | Convert 3 dialog forms to RHF+Zod                                                                           | 1h     | Frontend |
| 15  | Add `inventory` category + 10 inventory report types to report.model.ts enum                                | 15 min | Models   |

### Low (P3) — Nice to have

| #   | Action                                                                                             | Effort | Category |
| --- | -------------------------------------------------------------------------------------------------- | ------ | -------- |
| 16  | Move inline Zod schemas (attachDocumentSchema, historyQuerySchema, idParamSchema) to @dento/shared | 30 min | Schemas  |
| 17  | Add explicit `.strict()` to updateInvoiceSchema and updateInsuranceCompanySchema                   | 5 min  | Schemas  |
| 18  | Strengthen `VALID_COMMISSION_STATUS_TRANSITIONS` typing                                            | 5 min  | Schemas  |
| 19  | Add `quarterly` to schedule frequency enum                                                         | 5 min  | Models   |
| 20  | Add `ref: 'InsuranceClaim'` to invoice model `insuranceClaimId`                                    | 5 min  | Models   |
| 21  | Add frontend tests (pages + hooks) for Phase 4 modules                                             | 4h     | Tests    |
| 22  | Add dashboard.route.test.ts                                                                        | 1h     | Tests    |

---

## 12. Conclusion

**The Phase 4 implementation is substantially complete and well-architected** (~91%), but the previous 100% A+ claim is not accurate. Key strengths:

- All IMPLEMENTATION_ROADMAP deliverables are present
- Service layer is robust with correct business logic
- Shared schemas are comprehensive with proper `.strict()` usage
- Backend test coverage is excellent (14 files, 439 test blocks)
- Security fundamentals (auth, tenant isolation, Zod validation) are solid

Key weaknesses that prevent 100%:

- **6 collection name mismatches** against V2_DATABASE spec (highest priority fix)
- **No rate limiting** on financial mutations (security requirement)
- **Frontend uses local schemas** instead of importing from @dento/shared
- **85 RTL violations** in frontend (BUILD_RULES §11)
- **Dashboard route** violates thin handler pattern + has no error handling
- **Missing webhook dispatch** on InsuranceClaimService
- **Missing cron jobs** for overdue detection

**Estimated effort to reach true 100%:** ~20 hours (13 P0+P1 items, 7 P2 items, 7 P3 items).
