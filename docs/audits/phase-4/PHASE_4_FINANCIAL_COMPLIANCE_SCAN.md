# Phase 4 — Financial Module: Compliance Scan Report

> **Generated:** 2026-03-01
> **Scanned Against:** 9 planning documents + codebase audit
> **Scope:** Phase 4 Financial — Insurance, Installments, Commissions, Reports, PDFs, Notifications, Cron Jobs, Bulk Ops
> **Overall Status:** ~55% DONE (backend ~80%, frontend ~20%, polish ~5%)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Document-by-Document Compliance Matrix](#2-document-by-document-compliance-matrix)
3. [Requirement Tracker — Granular](#3-requirement-tracker--granular)
4. [Frontend Gap Analysis](#4-frontend-gap-analysis)
5. [Backend Gap Analysis](#5-backend-gap-analysis)
6. [Router & Sidebar Compliance](#6-router--sidebar-compliance)
7. [Module Gating Requirements](#7-module-gating-requirements)
8. [PDF Templates Status](#8-pdf-templates-status)
9. [BullMQ Jobs & Cron Status](#9-bullmq-jobs--cron-status)
10. [Security Compliance](#10-security-compliance)
11. [Test Coverage Status](#11-test-coverage-status)
12. [Planning Gaps Discovered](#12-planning-gaps-discovered)
13. [Priority Action Items](#13-priority-action-items)

---

## 1. Executive Summary

| Category                  | DONE   | PARTIAL | TODO   | Total  |
| ------------------------- | ------ | ------- | ------ | ------ |
| Backend Models            | 7      | 0       | 0      | 7      |
| Backend Services          | 7      | 2       | 0      | 9      |
| Backend Routes            | 6      | 0       | 0      | 6      |
| Shared Schemas            | 5      | 0       | 0      | 5      |
| Admin Frontend Pages      | 4      | 2       | 8      | 14     |
| Admin Frontend Hooks      | 3      | 1       | 5      | 9      |
| Admin Frontend Components | 3      | 0       | 5      | 8      |
| PDF Templates             | 2      | 0       | 3      | 5      |
| Router Entries            | 4      | 0       | 8      | 12     |
| Sidebar Entries           | 5      | 2       | 3      | 10     |
| BullMQ Workers/Crons      | 2      | 2       | 1      | 5      |
| Integration/E2E Tests     | 0      | 0       | 1      | 1      |
| **TOTAL**                 | **48** | **9**   | **34** | **91** |

**Risk Level:** MEDIUM — Backend is solid, but ALL Admin UI for Insurance/Installments/Commissions is missing. No router entries, no feature folders created. Report UI shell exists but uses mock data for financial reports.

---

## 2. Document-by-Document Compliance Matrix

### 2.1 PHASE_4_IMPLEMENTATION_PLAN.md (Primary Source)

| Day    | Deliverable                                            | Status         | Notes                                                                   |
| ------ | ------------------------------------------------------ | -------------- | ----------------------------------------------------------------------- |
| Day 1  | Insurance Company model+service+routes+schema          | **DONE** ✅    | 82+176+135 lines, registered in server.ts                               |
| Day 2  | Insurance Claims model+service+routes                  | **DONE** ✅    | 155+260+170 lines, 6-status flow                                        |
| Day 3  | Admin UI — Insurance Companies + Claims Pages          | **TODO** ❌    | Feature folder `features/insurance/` does not exist                     |
| Day 4  | Installment Plan model+service+routes+schema           | **DONE** ✅    | 145+265+150+73 lines                                                    |
| Day 5  | Admin UI — Installments + Tests                        | **TODO** ❌    | Feature folder `features/installments/` does not exist                  |
| Day 6  | Doctor Commission + Payout model+service+routes+schema | **DONE** ✅    | 85+85+300+170+100 lines                                                 |
| Day 7  | Admin UI — Commissions + Payouts                       | **TODO** ❌    | Feature folder `features/commissions/` does not exist                   |
| Day 8  | Financial Report Pipelines (F1-F7, O1-O2)              | **DONE** ✅    | 500 lines, Redis cache 5min TTL                                         |
| Day 9  | Report UI — Real Data + Charts                         | **TODO** ❌    | ReportCategoryPage exists (601L) but still uses mock data               |
| Day 10 | Report Export — Real PDF/CSV/Excel                     | **PARTIAL** 🟡 | report-export.service.ts exists but uses sample data                    |
| Day 11 | Report Scheduling — Wire Real Cron                     | **PARTIAL** 🟡 | report-scheduler.service.ts runs every 5min but uses mock data          |
| Day 12 | PDF Templates (Prescription, Treatment Plan, Report)   | **TODO** ❌    | 0 of 3 created                                                          |
| Day 13 | Bulk Notifications endpoint + UI                       | **TODO** ❌    | NotificationsPage exists but no bulk send capability                    |
| Day 14 | Invoice Overdue Cron + Integration Tests               | **TODO** ❌    | No overdue worker, no integration tests                                 |
| Day 15 | Sidebar updates + Module gating + Polish               | **PARTIAL** 🟡 | Sidebar has some entries but missing key items; module gating not wired |

### 2.2 V2_DATABASE.md — §7 Billing & Finance

| Collection                 | Schema Match  | Status   | Gaps                                                     |
| -------------------------- | ------------- | -------- | -------------------------------------------------------- |
| §7.1 `invoices`            | ✅ Full match | **DONE** | 27 fields, 7 statuses, 4 indexes — matches spec          |
| §7.2 `payments`            | ✅ Full match | **DONE** | All fields incl. `receivedBy`, 3 indexes                 |
| §7.3 `doctor_commissions`  | ✅ Full match | **DONE** | `commissionRate` 0-1, `payoutId` link, 2 indexes         |
| §7.3 `commission_payouts`  | ✅ Full match | **DONE** | `periodStart/End`, `totalAmount`, `paymentMethod`        |
| §7.4 `installment_plans`   | ✅ Full match | **DONE** | Embedded `payments[]`, frequency enum, auto-complete     |
| §7.5 `insurance_companies` | ✅ Full match | **DONE** | Bilingual `name`, `code` unique, `coveragePercentage`    |
| §7.5 `insurance_claims`    | ✅ Full match | **DONE** | Auto `claimNumber`, 6 statuses, `documents[]`, 3 indexes |
| §7.6 `reconciliation`      | ✅ Full match | **DONE** | Cash/card/online/insurance breakdown, `discrepancy`      |

**Schema compliance: 8/8 (100%)**

### 2.3 DENTO_V2_MASTER_PLAN.md — Financial Sections

| Section                     | Requirement                                               | Status         | Details                                                |
| --------------------------- | --------------------------------------------------------- | -------------- | ------------------------------------------------------ |
| §10 Module #8               | Invoices (invoices collection)                            | **DONE** ✅    | Full stack                                             |
| §10 Module #9               | Payments (payments + reconciliation)                      | **DONE** ✅    | Full stack                                             |
| §10 Module #14              | Insurance (insurance_claims + insurance_companies)        | **PARTIAL** 🟡 | Backend DONE, Admin UI TODO                            |
| §10 Module #22              | Commissions (doctor_commissions + commission_payouts)     | **PARTIAL** 🟡 | Backend DONE, Admin UI TODO                            |
| §10 Module #23              | Installments (installment_plans with embedded payments)   | **PARTIAL** 🟡 | Backend DONE, Admin UI TODO                            |
| §10 Module #25              | Notifications — bulk send                                 | **TODO** ❌    | No bulk endpoint or UI                                 |
| §10 Module #26              | Reports (Aggregation Pipelines)                           | **PARTIAL** 🟡 | Pipelines DONE, UI uses mock data                      |
| §11 Pricing                 | insurance-claims $39/Mo                                   | **DONE** ✅    | Slug `insurance` in sidebar-config module field        |
| §11 Pricing                 | advanced-analytics $199/Mo                                | **DONE** ✅    | Report model has module gating fields                  |
| §13 Doctor Model            | `commissionRate` field on doctors                         | **DONE** ✅    | Used by commission.service.ts                          |
| §15 Invoice Template        | ClinicHeader + Invoice PDF (no doctor)                    | **DONE** ✅    | InvoicePDF.tsx (372L), PaymentReceipt.tsx (213L)       |
| §15 Prescription Template   | ClinicHeader + doctor+specialty+license+signature         | **TODO** ❌    | PrescriptionPDF.tsx not created                        |
| §15 Treatment Plan Template | ClinicHeader + dental chart mini + signatures             | **TODO** ❌    | TreatmentPlanPDF.tsx not created                       |
| §20 Notifications           | Bulk notification to patient groups                       | **TODO** ❌    | POST /api/notifications/bulk not implemented           |
| §21 Reports                 | 26 reports in 5 categories (F1-7, P1-5, A1-6, C1-4, O1-4) | **PARTIAL** 🟡 | F1-F7+O1-O2 pipelines DONE (9/26), UI placeholder only |
| §21 Reports                 | Scheduled Reports (BullMQ cron → email/in-app)            | **PARTIAL** 🟡 | Worker exists, uses mock data                          |
| §21 Reports                 | Report Export (CSV/Excel/PDF)                             | **PARTIAL** 🟡 | Worker exists, uses sample data                        |
| §21 Reports                 | Saved Reports                                             | **TODO** ❌    | DB model fields exist, no UI                           |
| §21 Reports                 | Recharts chart library integration                        | **TODO** ❌    | No Recharts components in report pages                 |
| §29 Payment Gateways        | Paymob + Stripe (SaaS-level)                              | **DONE** ✅    | Platform-level routes, webhook verification            |

### 2.4 V2_STRUCTURE.md — Required File Structure

| Planned File (§V2_STRUCTURE)                    | Exists?                                                            | Status      |
| ----------------------------------------------- | ------------------------------------------------------------------ | ----------- |
| `features/insurance/InsurancePage.tsx`          | ❌                                                                 | **TODO**    |
| `features/insurance/ClaimForm.tsx`              | ❌                                                                 | **TODO**    |
| `features/insurance/CompanyList.tsx`            | ❌                                                                 | **TODO**    |
| `features/insurance/useInsurance.ts`            | ❌                                                                 | **TODO**    |
| `features/commissions/CommissionsPage.tsx`      | ❌                                                                 | **TODO**    |
| `features/commissions/CommissionConfig.tsx`     | ❌                                                                 | **TODO**    |
| `features/commissions/PayoutTable.tsx`          | ❌                                                                 | **TODO**    |
| `features/commissions/useCommissions.ts`        | ❌                                                                 | **TODO**    |
| `features/installments/InstallmentsPage.tsx`    | ❌                                                                 | **TODO**    |
| `features/installments/InstallmentPlanForm.tsx` | ❌                                                                 | **TODO**    |
| `features/installments/useInstallments.ts`      | ❌                                                                 | **TODO**    |
| `features/reports/ReportsHub.tsx`               | ✅ (`ReportsHubPage.tsx`)                                          | **DONE**    |
| `features/reports/FinancialReports.tsx`         | ❌ (merged into `ReportCategoryPage.tsx`)                          | **PARTIAL** |
| `features/reports/ReportCard.tsx`               | ❌                                                                 | **TODO**    |
| `features/reports/ChartWrapper.tsx`             | ❌                                                                 | **TODO**    |
| `features/reports/DateRangePicker.tsx`          | ❌                                                                 | **TODO**    |
| `features/reports/ExportButtons.tsx`            | ❌                                                                 | **TODO**    |
| `features/reports/useReports.ts`                | ❌ (hooks not yet created)                                         | **TODO**    |
| `api/routes/insurance/insurance.route.ts`       | ✅ (split into 2 files)                                            | **DONE**    |
| `api/routes/commissions/commissions.route.ts`   | ✅                                                                 | **DONE**    |
| `api/routes/installments/installments.route.ts` | ✅                                                                 | **DONE**    |
| `api/routes/reports/reports.route.ts`           | ✅                                                                 | **DONE**    |
| `api/services/report-pipeline.service.ts`       | ✅                                                                 | **DONE**    |
| `api/jobs/workers/report.worker.ts`             | ✅ (as `report-export.service.ts` + `report-scheduler.service.ts`) | **PARTIAL** |

### 2.5 IMPLEMENTATION_ROADMAP.md

| Milestone                          | Requirement                                                                           | Status                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Week 14                            | Invoices + Payments                                                                   | **DONE** ✅                                                           |
| Week 15                            | Insurance + Claims + Installments                                                     | **PARTIAL** 🟡 — Backend DONE, Admin UI TODO                          |
| Week 16                            | Commissions + Financial Reports + PDF Export + Bulk Notifications + Report Scheduling | **PARTIAL** 🟡 — Backend partially done, frontend/PDFs/bulk/cron TODO |
| M4 Gate                            | "Invoice → Payment → Insurance, Payment Webhook HMAC verified"                        | **PARTIAL** 🟡 — Flow works backend-only, no end-to-end UI test       |
| Definition of Done — RBAC          | All routes have authGuard + tenantDb + roleGuard                                      | **DONE** ✅ for all created routes                                    |
| Definition of Done — RTL           | Logical CSS properties on all new UI                                                  | **N/A** — No new UI created yet                                       |
| Definition of Done — Dark Mode     | All new UI supports dark mode                                                         | **N/A** — No new UI created yet                                       |
| Definition of Done — Responsive    | Mobile breakpoints per Decision Log §14                                               | **N/A** — No new UI created yet                                       |
| Definition of Done — Zod strict    | `.strict()` on all request schemas                                                    | **DONE** ✅ for all created schemas                                   |
| Definition of Done — Audit Logging | Every financial mutation audit-logged                                                 | **TODO** ❌ — Need to verify                                          |

### 2.6 ADMIN_PORTAL_SCREENS.md

| Screen                        | Requirement                                                    | Status                                                    |
| ----------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| #9 Invoices                   | Full list + detail + PDF preview + LTR/RTL                     | **DONE** ✅                                               |
| #10 Payments & Reconciliation | Payment list + Daily Reconciliation tab                        | **DONE** ✅                                               |
| #11 Inventory                 | Full inventory management                                      | **N/A** (Phase 5)                                         |
| #12 Reports                   | Revenue/Patient/Operational categories                         | **PARTIAL** 🟡 — Hub + CategoryPage exist, no real charts |
| #13 Settings — Billing tab    | enableInstallments, enableInsurance, enableCommissions toggles | **DONE** ✅                                               |

**⚠️ CRITICAL FINDING:** ADMIN_PORTAL_SCREENS.md contains **NO wireframes** for Insurance Companies, Insurance Claims, Installments, or Commissions. Only Invoices (#9) and Payments (#10) have wireframes. See [§12 Planning Gaps](#12-planning-gaps-discovered).

### 2.7 SECURITY_AND_ENCRYPTION.md

| #   | Requirement                                           | Source                  | Status                                                                            |
| --- | ----------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| S1  | `patients.insurance[].policyNumber` AES-256-GCM       | §5 Data Encryption      | **DONE** ✅ — Patient model has encryption hooks                                  |
| S2  | Claim documents: PDF only, 10MB max, magic bytes      | §8 File Upload Security | **DONE** ✅ — insurance-claim.service.ts validates                                |
| S3  | Zod `.strict()` on every new endpoint                 | §6 Input Validation     | **DONE** ✅ — All 3 new schema files use strict                                   |
| S4  | `authGuard + tenantDb + roleGuard` on every route     | §3 Authorization        | **DONE** ✅ — All 6 route files have middleware chain                             |
| S5  | No card data stored (PCI DSS)                         | §12 HIPAA/GDPR          | **DONE** ✅ — Payment model stores no card numbers                                |
| S6  | Audit logging on financial mutations                  | §10 Audit               | **TODO** ❌ — Need to verify audit hooks on new models                            |
| S7  | Report data respects RBAC (doctor sees own data only) | §3 Authorization        | **PARTIAL** 🟡 — Pipeline service accepts doctorId filter, but UI doesn't enforce |
| S8  | Webhook HMAC-SHA256 (5-min replay window)             | §6.3 Webhook Security   | **DONE** ✅ — Already implemented for Paymob/Stripe                               |

### 2.8 V2_DECISION_LOG.md

| Decision                         | Requirement                                                        | Status                                                                  |
| -------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| §3 Webhook Events                | `invoice.issued/paid`, `payment.received/refunded` defined         | **DONE** ✅ — Webhook event constants exist                             |
| §4 Pricing Edge Cases            | Mid-cycle module activation, downgrade with data                   | **DONE** ✅ — Platform-level billing handles this                       |
| §5 Aggregation Pipeline Patterns | Revenue, doctor productivity, insurance aging, inventory valuation | **DONE** ✅ — F1-F7, O1-O2 pipelines match patterns                     |
| §8 Timeline                      | Phase 4 at Weeks 18-20 (3 weeks)                                   | **IN PROGRESS** — Backend ~80%, frontend ~20%                           |
| §10 Test Coverage                | Phase 4 target: 70% statements                                     | **TODO** ❌ — 0 new tests for insurance/installment/commission services |
| §12 Accessibility                | WCAG 2.1 AA on all UI                                              | **N/A** — No new UI created yet                                         |
| §13 Loading/Error/Empty States   | All pages need loading/error/empty states                          | **N/A** — No new UI created yet                                         |
| §14 Responsive Breakpoints       | Mobile → Tablet → Desktop → Wide                                   | **N/A** — No new UI created yet                                         |
| §22 Rollback Plan                | If Phase 4 runs over: cut Insurance → Phase 5                      | **N/A** — Not needed yet                                                |

### 2.9 TECH_REQUIREMENTS.md

| Package               | Required For                                       | Status                                                           |
| --------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| `@react-pdf/renderer` | Invoice, Prescription, Treatment Plan, Report PDFs | **DONE** ✅ — Used in InvoicePDF.tsx                             |
| `exceljs`             | Report Excel export                                | **DONE** ✅ — In report-export.service.ts (sample data)          |
| `@fast-csv/format`    | Report CSV export                                  | **DONE** ✅ — In report-export.service.ts (sample data)          |
| `recharts`            | Report charts (Bar, Line, Pie, Heatmap)            | **TODO** ❌ — Not used in any report page yet                    |
| `BullMQ 5.x`          | Report scheduling, invoice overdue, notifications  | **PARTIAL** 🟡 — Report scheduler exists, overdue worker missing |
| `stripe`              | International payment gateway                      | **DONE** ✅                                                      |
| `paymob-node`         | Egyptian payment gateway                           | **DONE** ✅                                                      |
| `date-fns`            | Date range picker, report period calculations      | **DONE** ✅ — Used across codebase                               |

---

## 3. Requirement Tracker — Granular

### 3.1 Insurance Module

| ID     | Requirement                                     | Source           | Status         | Notes                                                                                                     |
| ------ | ----------------------------------------------- | ---------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| INS-01 | Insurance Company CRUD (model+service+routes)   | PHASE_4 Day 1    | **DONE** ✅    | 82+176+135 lines                                                                                          |
| INS-02 | Bilingual company name (en/ar)                  | V2_DATABASE §7.5 | **DONE** ✅    | `name: { en, ar }` in model                                                                               |
| INS-03 | Company code (unique index)                     | V2_DATABASE §7.5 | **DONE** ✅    | Unique index + service validation                                                                         |
| INS-04 | coveragePercentage + maxCoverage                | V2_DATABASE §7.5 | **DONE** ✅    | 0-100 range                                                                                               |
| INS-05 | Insurance Claim CRUD (model+service+routes)     | PHASE_4 Day 2    | **DONE** ✅    | 155+260+170 lines                                                                                         |
| INS-06 | Auto claim number (CLM-YYYY-NNNNN)              | V2_DATABASE §7.5 | **DONE** ✅    | Pre-save hook                                                                                             |
| INS-07 | 6-status claim flow                             | V2_DATABASE §7.5 | **DONE** ✅    | submitted→under_review→approved/partially_approved/denied→paid                                            |
| INS-08 | Claim document uploads (PDF only, 10MB)         | SECURITY §8      | **DONE** ✅    | Magic bytes check                                                                                         |
| INS-09 | Aging report aggregation ($bucket)              | PHASE_4 Day 2    | **DONE** ✅    | In insurance-claim.service.ts                                                                             |
| INS-10 | `patients.insurance[].policyNumber` AES-256-GCM | SECURITY §5      | **DONE** ✅    | Encryption hooks in patient model                                                                         |
| INS-11 | Insurance Companies Admin Page                  | PHASE_4 Day 3    | **TODO** ❌    | No `features/insurance/` folder                                                                           |
| INS-12 | Insurance Claims Admin Page                     | PHASE_4 Day 3    | **TODO** ❌    | No `features/insurance/` folder                                                                           |
| INS-13 | Insurance Claim Detail Page                     | PHASE_4 Day 3    | **TODO** ❌    | Not created                                                                                               |
| INS-14 | ClaimForm component (RHF+Zod)                   | PHASE_4 Day 3    | **TODO** ❌    | Not created                                                                                               |
| INS-15 | useInsuranceCompanies hook                      | PHASE_4 Day 3    | **TODO** ❌    | Not created                                                                                               |
| INS-16 | useInsuranceClaims hook                         | PHASE_4 Day 3    | **TODO** ❌    | Not created                                                                                               |
| INS-17 | Router: /insurance-companies                    | PHASE_4 Day 3    | **TODO** ❌    | Not in router.tsx                                                                                         |
| INS-18 | Router: /insurance-claims                       | PHASE_4 Day 3    | **TODO** ❌    | Not in router.tsx                                                                                         |
| INS-19 | Router: /insurance-claims/:id                   | PHASE_4 Day 3    | **TODO** ❌    | Not in router.tsx                                                                                         |
| INS-20 | Sidebar: Insurance Companies under Financial    | PHASE_4 Day 15   | **PARTIAL** 🟡 | "Insurance" exists but under Medical group, not Financial; single entry instead of split Companies+Claims |
| INS-21 | Module gating: insurance-claims module check    | PHASE_4 Day 15   | **TODO** ❌    | Sidebar has `module: 'insurance'` but no runtime gating                                                   |
| INS-22 | Insurance service unit tests                    | PHASE_4 Day 5    | **TODO** ❌    | insurance.service.test.ts not created                                                                     |
| INS-23 | Insurance claim service unit tests              | PHASE_4 Day 5    | **TODO** ❌    | insurance-claim.service.test.ts not created                                                               |

### 3.2 Installment Plans

| ID      | Requirement                                  | Source           | Status      | Notes                                   |
| ------- | -------------------------------------------- | ---------------- | ----------- | --------------------------------------- |
| INST-01 | Installment Plan model (embedded payments[]) | PHASE_4 Day 4    | **DONE** ✅ | 145 lines, auto-complete detection      |
| INST-02 | Frequency: weekly / biweekly / monthly       | V2_DATABASE §7.4 | **DONE** ✅ | Enum in schema                          |
| INST-03 | Auto-generate payment schedule by frequency  | PHASE_4 Day 4    | **DONE** ✅ | In installment.service.ts               |
| INST-04 | Record payment, waive, cancel                | PHASE_4 Day 4    | **DONE** ✅ | All methods implemented                 |
| INST-05 | markOverdueInstallments                      | PHASE_4 Day 4    | **DONE** ✅ | Method exists in service                |
| INST-06 | Late fee application                         | V2_DATABASE §7.4 | **DONE** ✅ | `lateFee` field in embedded payments    |
| INST-07 | Installments Admin Page                      | PHASE_4 Day 5    | **TODO** ❌ | No `features/installments/` folder      |
| INST-08 | Installment Detail Page                      | PHASE_4 Day 5    | **TODO** ❌ | Not created                             |
| INST-09 | InstallmentPlanForm component                | PHASE_4 Day 5    | **TODO** ❌ | Not created                             |
| INST-10 | useInstallments hook                         | PHASE_4 Day 5    | **TODO** ❌ | Not created                             |
| INST-11 | Router: /installments                        | PHASE_4 Day 5    | **TODO** ❌ | Not in router.tsx                       |
| INST-12 | Router: /installments/:id                    | PHASE_4 Day 5    | **TODO** ❌ | Not in router.tsx                       |
| INST-13 | Sidebar: Installments under Financial        | PHASE_4 Day 15   | **DONE** ✅ | In sidebar-config.ts                    |
| INST-14 | Settings toggle: billing.enableInstallments  | PHASE_4 Day 15   | **DONE** ✅ | In settings                             |
| INST-15 | Installment service unit tests               | PHASE_4 Day 5    | **TODO** ❌ | installment.service.test.ts not created |

### 3.3 Doctor Commissions

| ID     | Requirement                                | Source         | Status      | Notes                                  |
| ------ | ------------------------------------------ | -------------- | ----------- | -------------------------------------- |
| COM-01 | Doctor Commission model                    | PHASE_4 Day 6  | **DONE** ✅ | 85 lines, matches V2_DATABASE §7.3     |
| COM-02 | Commission Payout model                    | PHASE_4 Day 6  | **DONE** ✅ | 85 lines, `periodStart/End`            |
| COM-03 | calculateFromInvoice (auto-create)         | PHASE_4 Day 6  | **DONE** ✅ | In commission.service.ts               |
| COM-04 | Bulk approveCommissions                    | PHASE_4 Day 6  | **DONE** ✅ | Accepts array of IDs                   |
| COM-05 | createPayout (groups approved→paid)        | PHASE_4 Day 6  | **DONE** ✅ | In commission.service.ts               |
| COM-06 | getDoctorSummary (faceted aggregation)     | PHASE_4 Day 6  | **DONE** ✅ | Pending/approved/paid breakdown        |
| COM-07 | getCommissionReport (aggregation)          | PHASE_4 Day 6  | **DONE** ✅ | Per-doctor aggregation pipeline        |
| COM-08 | Commissions Admin Page (2 tabs)            | PHASE_4 Day 7  | **TODO** ❌ | No `features/commissions/` folder      |
| COM-09 | Commission Detail Page                     | PHASE_4 Day 7  | **TODO** ❌ | Not created                            |
| COM-10 | CommissionConfig component                 | PHASE_4 Day 7  | **TODO** ❌ | Not created                            |
| COM-11 | PayoutForm component                       | PHASE_4 Day 7  | **TODO** ❌ | Not created                            |
| COM-12 | useCommissions hook                        | PHASE_4 Day 7  | **TODO** ❌ | Not created                            |
| COM-13 | Router: /commissions                       | PHASE_4 Day 7  | **TODO** ❌ | Not in router.tsx                      |
| COM-14 | Router: /commissions/:id                   | PHASE_4 Day 7  | **TODO** ❌ | Not in router.tsx                      |
| COM-15 | Sidebar: Commissions under Financial       | PHASE_4 Day 15 | **DONE** ✅ | In sidebar-config.ts                   |
| COM-16 | Settings toggle: billing.enableCommissions | PHASE_4 Day 15 | **DONE** ✅ | In settings                            |
| COM-17 | Commission service unit tests              | PHASE_4 Day 10 | **TODO** ❌ | commission.service.test.ts not created |

### 3.4 Financial Reports

| ID     | Requirement                                                               | Source                           | Status         | Notes                                            |
| ------ | ------------------------------------------------------------------------- | -------------------------------- | -------------- | ------------------------------------------------ |
| RPT-01 | F1: Revenue Summary pipeline                                              | MASTER_PLAN §21, DECISION_LOG §5 | **DONE** ✅    | $group by configurable period                    |
| RPT-02 | F2: Revenue by Doctor pipeline                                            | MASTER_PLAN §21                  | **DONE** ✅    | $lookup appointments → $group by doctorId        |
| RPT-03 | F3: Revenue by Service pipeline                                           | MASTER_PLAN §21                  | **DONE** ✅    | $unwind items → $group by serviceId              |
| RPT-04 | F4: Revenue by Branch pipeline                                            | MASTER_PLAN §21                  | **DONE** ✅    | $group by branchId                               |
| RPT-05 | F5: Payment Collection pipeline                                           | MASTER_PLAN §21                  | **DONE** ✅    | $group by paymentMethod                          |
| RPT-06 | F6: Outstanding/Aging pipeline                                            | MASTER_PLAN §21, DECISION_LOG §5 | **DONE** ✅    | $bucket (0-30, 31-60, 61-90, 90+)                |
| RPT-07 | F7: Tax Report pipeline                                                   | MASTER_PLAN §21                  | **DONE** ✅    | $group by period → $sum taxAmount                |
| RPT-08 | O1: Commission Summary pipeline                                           | MASTER_PLAN §21                  | **DONE** ✅    | $group by doctorId → status breakdown            |
| RPT-09 | O2: Daily Reconciliation pipeline                                         | MASTER_PLAN §21                  | **DONE** ✅    | Expected vs actual by date+branch                |
| RPT-10 | Redis cache (5min TTL) on pipelines                                       | PHASE_4 Day 8                    | **DONE** ✅    | getOrSet wrapper with graceful fallback          |
| RPT-11 | Report model (29 types, 5 categories)                                     | PHASE_4                          | **DONE** ✅    | 531 lines                                        |
| RPT-12 | 18 report API endpoints                                                   | PHASE_4                          | **DONE** ✅    | Dashboard + reports + saved + scheduled + export |
| RPT-13 | ReportsHubPage (overview)                                                 | PHASE_4                          | **DONE** ✅    | 288 lines                                        |
| RPT-14 | ReportCategoryPage (per-category)                                         | PHASE_4                          | **PARTIAL** 🟡 | 601 lines, but uses mock chart data              |
| RPT-15 | DateRangePicker component                                                 | PHASE_4 Day 9                    | **TODO** ❌    | Not created                                      |
| RPT-16 | KPICards component (stat cards + sparklines)                              | PHASE_4 Day 9                    | **TODO** ❌    | Not created                                      |
| RPT-17 | ExportButton component (PDF/CSV/Excel dropdown)                           | PHASE_4 Day 9                    | **TODO** ❌    | Not created                                      |
| RPT-18 | Recharts integration in report pages                                      | MASTER_PLAN §21, TECH_REQS       | **TODO** ❌    | recharts not imported in any report page         |
| RPT-19 | Wire report-export.service.ts to real pipelines                           | PHASE_4 Day 10                   | **TODO** ❌    | Still uses sample data                           |
| RPT-20 | Wire report-scheduler.service.ts to real generation                       | PHASE_4 Day 11                   | **TODO** ❌    | Runs every 5min but uses mock data               |
| RPT-21 | ScheduledReportsPage (CRUD)                                               | PHASE_4 Day 11                   | **TODO** ❌    | Not created                                      |
| RPT-22 | useReportSchedules hook                                                   | PHASE_4 Day 11                   | **TODO** ❌    | Not created                                      |
| RPT-23 | useReports hook (financial report types)                                  | PHASE_4 Day 9                    | **TODO** ❌    | Not created                                      |
| RPT-24 | Router: /reports/scheduled                                                | PHASE_4 Day 11                   | **TODO** ❌    | Not in router.tsx                                |
| RPT-25 | Saved Reports UI                                                          | MASTER_PLAN §21                  | **TODO** ❌    | No page or hooks                                 |
| RPT-26 | Two-tier model (Free dashboard vs Paid Advanced)                          | MASTER_PLAN §21                  | **TODO** ❌    | No locked preview with blur + CTA                |
| RPT-27 | Sidebar: Split into Dashboard / Hub / Financial / Operational / Scheduled | MASTER_PLAN §21, PHASE_4 Day 15  | **TODO** ❌    | Single "Reports" entry exists                    |
| RPT-28 | Report RBAC (doctor sees own data only)                                   | SECURITY §3                      | **PARTIAL** 🟡 | Pipeline accepts filter, UI doesn't enforce      |

### 3.5 PDF Templates

| ID     | Requirement                                              | Source                          | Status      | Notes                     |
| ------ | -------------------------------------------------------- | ------------------------------- | ----------- | ------------------------- |
| PDF-01 | Invoice PDF (ClinicHeader, no doctor)                    | MASTER_PLAN §15                 | **DONE** ✅ | InvoicePDF.tsx (372L)     |
| PDF-02 | Payment Receipt PDF                                      | PHASE_4                         | **DONE** ✅ | PaymentReceipt.tsx (213L) |
| PDF-03 | Prescription PDF (doctor+specialty+license+signature)    | MASTER_PLAN §15, PHASE_4 Day 12 | **TODO** ❌ | Not created               |
| PDF-04 | Treatment Plan PDF (dental chart mini + patient consent) | MASTER_PLAN §15, PHASE_4 Day 12 | **TODO** ❌ | Not created               |
| PDF-05 | Report PDF (KPI + chart image + table)                   | PHASE_4 Day 12                  | **TODO** ❌ | Not created               |

### 3.6 BullMQ Jobs & Cron

| ID     | Requirement                                        | Source                          | Status         | Notes                                          |
| ------ | -------------------------------------------------- | ------------------------------- | -------------- | ---------------------------------------------- |
| JOB-01 | Report export worker (CSV/Excel/PDF)               | MASTER_PLAN §21, PHASE_4 Day 10 | **PARTIAL** 🟡 | Exists, uses sample data                       |
| JOB-02 | Report scheduler (daily/weekly/monthly cron)       | MASTER_PLAN §21, PHASE_4 Day 11 | **PARTIAL** 🟡 | Runs every 5min, uses mock data                |
| JOB-03 | Invoice overdue worker (daily 01:00)               | PHASE_4 Day 14                  | **TODO** ❌    | Not created                                    |
| JOB-04 | Bulk notification dispatcher                       | MASTER_PLAN §20, PHASE_4 Day 13 | **TODO** ❌    | No bulk endpoint                               |
| JOB-05 | Installment overdue cron (markOverdueInstallments) | V2_DATABASE §7.4                | **PARTIAL** 🟡 | Service method exists, no BullMQ scheduled job |

### 3.7 Notifications (Phase 4 scope: Bulk only)

| ID       | Requirement                                | Source                          | Status      | Notes           |
| -------- | ------------------------------------------ | ------------------------------- | ----------- | --------------- |
| NOTIF-01 | POST /api/notifications/bulk endpoint      | MASTER_PLAN §20, PHASE_4 Day 13 | **TODO** ❌ | Not implemented |
| NOTIF-02 | BulkNotificationModal component            | PHASE_4 Day 13                  | **TODO** ❌ | Not created     |
| NOTIF-03 | Recipient selection (all / group / custom) | PHASE_4 Day 13                  | **TODO** ❌ | Not implemented |
| NOTIF-04 | Rate limit: max 1 bulk send per 15 minutes | PHASE_4 Day 13                  | **TODO** ❌ | Not implemented |
| NOTIF-05 | Batch patient lookups (100 per batch)      | PHASE_4 Day 13                  | **TODO** ❌ | Not implemented |

---

## 4. Frontend Gap Analysis

### 4.1 Missing Feature Folders

The following feature folders specified in PHASE_4_IMPLEMENTATION_PLAN.md and V2_STRUCTURE.md **do not exist** in the codebase:

| Feature Folder                          | Expected Files                                                                                                                                    | Impact                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `apps/admin/src/features/insurance/`    | InsuranceCompaniesPage.tsx, InsuranceClaimsPage.tsx, InsuranceClaimDetailPage.tsx, ClaimForm.tsx, useInsuranceCompanies.ts, useInsuranceClaims.ts | 6 files, ~1,500 LOC estimated |
| `apps/admin/src/features/installments/` | InstallmentsPage.tsx, InstallmentDetailPage.tsx, InstallmentPlanForm.tsx, useInstallments.ts                                                      | 4 files, ~900 LOC estimated   |
| `apps/admin/src/features/commissions/`  | CommissionsPage.tsx, CommissionDetailPage.tsx, CommissionConfig.tsx, PayoutForm.tsx, useCommissions.ts                                            | 5 files, ~1,150 LOC estimated |

### 4.2 Missing Report Components

| Component                | Expected In                    | Impact                                                                             |
| ------------------------ | ------------------------------ | ---------------------------------------------------------------------------------- |
| DateRangePicker.tsx      | `features/reports/components/` | Presets: Today, This Week, This Month, Last Month, This Quarter, This Year, Custom |
| KPICards.tsx             | `features/reports/components/` | 4 stat cards with sparklines                                                       |
| ExportButton.tsx         | `features/reports/components/` | Dropdown: PDF/CSV/Excel → POST /api/reports/export                                 |
| ReportPDF.tsx            | `features/reports/components/` | ClinicHeader + KPI + chart image + table                                           |
| ChartWrapper.tsx         | `features/reports/components/` | Recharts ResponsiveContainer wrapper with RTL support                              |
| ScheduledReportsPage.tsx | `features/reports/pages/`      | CRUD for report schedules                                                          |
| useReports.ts            | `features/reports/hooks/`      | Financial report type hooks                                                        |
| useReportSchedules.ts    | `features/reports/hooks/`      | Schedule CRUD hooks                                                                |

### 4.3 Missing PDF Templates

| Template             | Expected Location                      | Required Elements (MASTER_PLAN §15)                                                                               |
| -------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PrescriptionPDF.tsx  | `features/prescriptions/components/`   | ClinicHeader, Patient Info, Items Table, Doctor Signature, Specialty, License #, "Not valid after 30 days"        |
| TreatmentPlanPDF.tsx | `features/treatment-plans/components/` | ClinicHeader, Patient Info, Dental Chart Mini, Items Table, Total Summary, Patient Consent Line, Doctor Signature |
| ReportPDF.tsx        | `features/reports/components/`         | ClinicHeader, Title, Date Range, 4 KPI Boxes, Chart PNG, Data Table, Timestamp, Page Numbers                      |

### 4.4 Existing Reports Pages — Status

| Page                   | Lines | Real Data?              | Charts?              | Export?                   |
| ---------------------- | ----- | ----------------------- | -------------------- | ------------------------- |
| ReportsHubPage.tsx     | 288   | N/A (overview page)     | No                   | No                        |
| ReportCategoryPage.tsx | 601   | **No — uses mock data** | **No — no Recharts** | **No — no export button** |

---

## 5. Backend Gap Analysis

### 5.1 Confirmed Complete

| Item                            | Lines | Verified |
| ------------------------------- | ----- | -------- |
| insurance-company.model.ts      | 82    | ✅       |
| insurance-company.service.ts    | 176   | ✅       |
| insurance-companies.route.ts    | 135   | ✅       |
| insurance-claim.model.ts        | 155   | ✅       |
| insurance-claim.service.ts      | 260   | ✅       |
| insurance-claims.route.ts       | 170   | ✅       |
| installment-plan.model.ts       | 145   | ✅       |
| installment.service.ts          | 265   | ✅       |
| installments.route.ts           | 150   | ✅       |
| doctor-commission.model.ts      | 85    | ✅       |
| commission-payout.model.ts      | 85    | ✅       |
| commission.service.ts           | 300   | ✅       |
| commissions.route.ts            | 170   | ✅       |
| report-pipeline.service.ts      | 500   | ✅       |
| report.model.ts                 | 531   | ✅       |
| reports.route.ts (18 endpoints) | ~400  | ✅       |

### 5.2 Backend Items Needing Work

| Item                         | Current State                           | Required Work                                                                                      |
| ---------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| report-export.service.ts     | Uses sample data                        | Wire to real report-pipeline.service.ts                                                            |
| report-scheduler.service.ts  | Runs every 5min with mock data          | Wire to real generation + email delivery (Resend)                                                  |
| Invoice overdue worker       | Does not exist                          | Create BullMQ cron job (daily 01:00), update invoice status, dispatch webhook, create notification |
| Installment overdue cron     | Service method exists, no scheduled job | Create BullMQ repeatable job calling installment.service.markOverdueInstallments()                 |
| POST /api/notifications/bulk | Does not exist                          | New route + service method for bulk notification dispatch                                          |
| Audit logging hooks          | Unclear if new models have hooks        | Verify audit_logs entries for insurance/installment/commission mutations                           |

---

## 6. Router & Sidebar Compliance

### 6.1 Router — Current State vs Required

| Route                   | In router.tsx?    | Page Component           | Status   |
| ----------------------- | ----------------- | ------------------------ | -------- |
| `/invoices`             | ✅ Yes (line 112) | InvoiceListPage          | **DONE** |
| `/invoices/:id`         | ✅ Yes (line 113) | InvoiceDetailPage        | **DONE** |
| `/payments`             | ✅ Yes (line 114) | PaymentsPage             | **DONE** |
| `/reconciliation`       | ✅ Yes (line 115) | ReconciliationPage       | **DONE** |
| `/reports`              | ✅ Yes (line 86)  | ReportsHubPage           | **DONE** |
| `/reports/:category`    | ✅ Yes (line 87)  | ReportCategoryPage       | **DONE** |
| `/insurance-companies`  | ❌ **Missing**    | InsuranceCompaniesPage   | **TODO** |
| `/insurance-claims`     | ❌ **Missing**    | InsuranceClaimsPage      | **TODO** |
| `/insurance-claims/:id` | ❌ **Missing**    | InsuranceClaimDetailPage | **TODO** |
| `/installments`         | ❌ **Missing**    | InstallmentsPage         | **TODO** |
| `/installments/:id`     | ❌ **Missing**    | InstallmentDetailPage    | **TODO** |
| `/commissions`          | ❌ **Missing**    | CommissionsPage          | **TODO** |
| `/commissions/:id`      | ❌ **Missing**    | CommissionDetailPage     | **TODO** |
| `/reports/scheduled`    | ❌ **Missing**    | ScheduledReportsPage     | **TODO** |

### 6.2 Sidebar — Current State vs Required (PHASE_4 Day 15 spec)

| Sidebar Entry       | Current Group            | Required Group | Module                  | Status                                                    |
| ------------------- | ------------------------ | -------------- | ----------------------- | --------------------------------------------------------- |
| Invoices            | Financial                | Financial      | `invoices`              | **DONE** ✅                                               |
| Payments            | Financial                | Financial      | `payments`              | **DONE** ✅                                               |
| Reconciliation      | —                        | Financial      | —                       | **TODO** ❌ — No sidebar entry, only route exists         |
| Insurance Companies | Medical (as "Insurance") | Financial      | `insurance`             | **WRONG GROUP** ⚠️ — Should be Financial per PHASE_4 spec |
| Insurance Claims    | —                        | Financial      | `insurance`             | **TODO** ❌ — No separate sidebar entry                   |
| Installments        | Financial                | Financial      | `installments`          | **DONE** ✅                                               |
| Commissions         | Financial                | Financial      | `commissions`           | **DONE** ✅                                               |
| Dashboard (Reports) | —                        | Reports        | `dashboard`             | **TODO** ❌ — Part of Reports group per §21               |
| Reports Hub         | System (as "Reports")    | Reports        | `reports`               | **WRONG GROUP** ⚠️ — Should be dedicated Reports group    |
| Financial Reports   | —                        | Reports        | `reports` (Advanced 🔒) | **TODO** ❌                                               |
| Operational Reports | —                        | Reports        | `reports` (Advanced 🔒) | **TODO** ❌                                               |
| Scheduled Reports   | —                        | Reports        | `reports` (Advanced 🔒) | **TODO** ❌                                               |

### 6.3 Sidebar Corrections Needed

1. **Move "Insurance"** from Medical group → Financial group
2. **Split "Insurance"** into "Insurance Companies" + "Insurance Claims"
3. **Move "Reports"** from System group → dedicated "Reports" group
4. **Add Reconciliation** to Financial group
5. **Add sub-entries** under Reports: Dashboard, Reports Hub, Financial, Operational, Scheduled
6. **Add lock icons** (🔒) on Advanced Analytics items for tenants without the module

---

## 7. Module Gating Requirements

Per PHASE_4_IMPLEMENTATION_PLAN Day 15 and MASTER_PLAN §21:

| Page/Feature                  | Required Module                                           | Gating Check                                                 | Status      |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ | ----------- |
| Insurance Companies           | `insurance-claims` ($39/Mo)                               | Check `tenant_modules` for active module                     | **TODO** ❌ |
| Insurance Claims              | `insurance-claims` ($39/Mo)                               | Check `tenant_modules` for active module                     | **TODO** ❌ |
| Installments                  | `billing-invoicing` + `billing.enableInstallments` toggle | Check settings                                               | **TODO** ❌ |
| Commissions                   | `billing-invoicing` + `billing.enableCommissions` toggle  | Check settings                                               | **TODO** ❌ |
| Financial Reports (F1-F7)     | `advanced-analytics` ($199/Mo)                            | Free: current month only. Advanced: full historical + charts | **TODO** ❌ |
| Operational Reports (O1-O2)   | `advanced-analytics` ($199/Mo)                            | Locked with blur + upgrade CTA                               | **TODO** ❌ |
| Scheduled Reports             | `advanced-analytics` ($199/Mo)                            | Check `tenant_modules`                                       | **TODO** ❌ |
| Report Export (CSV/Excel/PDF) | `advanced-analytics` ($199/Mo)                            | Check `tenant_modules`                                       | **TODO** ❌ |
| Saved Reports                 | `advanced-analytics` ($199/Mo)                            | Check `tenant_modules`                                       | **TODO** ❌ |

---

## 8. PDF Templates Status

| #   | Template        | File                                                     | Status      | Required Elements (MASTER_PLAN §15)                                                               |
| --- | --------------- | -------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| 1   | Invoice         | `features/invoices/components/InvoicePDF.tsx` (372L)     | **DONE** ✅ | ClinicHeader, Patient Info, Items Table, Totals, Terms, No Doctor                                 |
| 2   | Payment Receipt | `features/payments/components/PaymentReceipt.tsx` (213L) | **DONE** ✅ | Receipt-sized, payment details                                                                    |
| 3   | Consent Form    | `features/documents/templates/ConsentFormTemplate.tsx`   | **DONE** ✅ | Template-based consent                                                                            |
| 4   | Prescription    | Not created                                              | **TODO** ❌ | ClinicHeader, Doctor Name+Specialty+License+Signature, Items, "Not valid after 30 days" watermark |
| 5   | Treatment Plan  | Not created                                              | **TODO** ❌ | ClinicHeader, Dental Chart Mini, Items Table, Total, Patient Consent Line, Doctor Signature       |
| 6   | Report          | Not created                                              | **TODO** ❌ | ClinicHeader, Title, Date Range, 4 KPI Boxes, Chart PNG, Data Table, Page Numbers                 |
| 7   | Lab Order       | `features/documents/templates/LabOrderTemplate.tsx`      | **DONE** ✅ | Lab order details                                                                                 |

**Note:** `features/documents/templates/` also has InvoiceTemplate.tsx, PrescriptionTemplate.tsx, TreatmentPlanTemplate.tsx — these are **print-preview HTML templates** (for `window.print()`), NOT `@react-pdf/renderer` PDFs. The Phase 4 plan requires proper PDF generation using `@react-pdf/renderer`.

---

## 9. BullMQ Jobs & Cron Status

| Worker/Cron         | Queue Name                           | Schedule            | Status         | Notes                                                                                               |
| ------------------- | ------------------------------------ | ------------------- | -------------- | --------------------------------------------------------------------------------------------------- |
| Report Export       | `report-export`                      | On-demand           | **PARTIAL** 🟡 | Worker exists, uses sample data                                                                     |
| Report Scheduler    | `report-scheduler`                   | Every 5 min         | **PARTIAL** 🟡 | Worker exists, uses mock data                                                                       |
| Invoice Overdue     | —                                    | Daily 01:00         | **TODO** ❌    | Not created. Required: find `issued` invoices past dueDate → set `overdue` → webhook → notification |
| Installment Overdue | —                                    | Daily (recommended) | **TODO** ❌    | `installment.service.markOverdueInstallments()` exists but no BullMQ job calls it                   |
| Bulk Notification   | notification:email/sms/whatsapp/push | On-demand           | **TODO** ❌    | Existing queues exist for individual sends, bulk dispatcher missing                                 |

---

## 10. Security Compliance

| #   | Requirement                                        | Source            | Status            | Verified?                                      |
| --- | -------------------------------------------------- | ----------------- | ----------------- | ---------------------------------------------- |
| 1   | AES-256-GCM on `patients.insurance[].policyNumber` | SECURITY §5       | **DONE** ✅       | Yes — encryption hooks in patient model        |
| 2   | Claim docs: PDF only, 10MB, magic bytes            | SECURITY §8       | **DONE** ✅       | Yes — insurance-claim.service.ts               |
| 3   | Zod `.strict()` on all new schemas                 | BUILD_RULES §5.3  | **DONE** ✅       | insurance/installment/commission schemas       |
| 4   | 3-layer middleware on all routes                   | BUILD_RULES §17.4 | **DONE** ✅       | authGuard + tenantDb + roleGuard               |
| 5   | No card data stored (PCI)                          | SECURITY §12      | **DONE** ✅       | payment model — no card fields                 |
| 6   | Webhook HMAC-SHA256 verification                   | SECURITY §6.3     | **DONE** ✅       | Paymob + Stripe hooks                          |
| 7   | Audit logging on financial mutations               | SECURITY §10      | **⚠️ UNVERIFIED** | Need to check if new models trigger audit_logs |
| 8   | Report data respects RBAC                          | SECURITY §3       | **PARTIAL** 🟡    | Pipelines accept filters, UI doesn't enforce   |
| 9   | Rate limiting on financial endpoints               | SECURITY §3       | **DONE** ✅       | Global rate limiter configured                 |
| 10  | RTL on all new UI (logical CSS)                    | BUILD_RULES §11   | **N/A**           | No new UI created yet                          |

---

## 11. Test Coverage Status

**Phase 4 target (V2_DECISION_LOG §10): 70% statements, 55% branches**

| Service                      | Test File               | Status        | Est. Coverage |
| ---------------------------- | ----------------------- | ------------- | ------------- |
| invoice.service.ts           | invoice.service.test.ts | **EXISTS** ✅ | ~75%          |
| payment.service.ts           | payment.service.test.ts | **EXISTS** ✅ | ~70%          |
| insurance-company.service.ts | —                       | **TODO** ❌   | 0%            |
| insurance-claim.service.ts   | —                       | **TODO** ❌   | 0%            |
| installment.service.ts       | —                       | **TODO** ❌   | 0%            |
| commission.service.ts        | —                       | **TODO** ❌   | 0%            |
| report-pipeline.service.ts   | —                       | **TODO** ❌   | 0%            |
| report-export.service.ts     | —                       | **TODO** ❌   | 0%            |
| report-scheduler.service.ts  | —                       | **TODO** ❌   | 0%            |

**Integration tests:** None exist for the full financial flow (Patient → Invoice → Insurance Claim → Payment → Commission).

**Test files to create (7):**

1. `insurance-company.service.test.ts` (~200L)
2. `insurance-claim.service.test.ts` (~250L)
3. `installment.service.test.ts` (~200L)
4. `commission.service.test.ts` (~200L)
5. `report-pipeline.service.test.ts` (~300L)
6. `report-export.service.test.ts` (~150L)
7. Full integration test: financial flow (~300L)

---

## 12. Planning Gaps Discovered

### GAP-01: No Wireframes for Insurance/Installments/Commissions

**Source:** ADMIN_PORTAL_SCREENS.md
**Issue:** The document has detailed wireframes (LTR+RTL+variants) for 16 screens including Invoices (#9) and Payments (#10), but **no wireframes exist** for:

- Insurance Companies page
- Insurance Claims page
- Insurance Claim Detail page
- Installments page
- Installment Detail page
- Commissions page
- Commission Detail page

**Impact:** Frontend developers must design these 7 pages without wireframe guidance.
**Recommendation:** Add wireframes to ADMIN_PORTAL_SCREENS.md before implementing frontend, or use the existing Invoices page pattern as a reference.

### GAP-02: Sidebar Group Inconsistency

**Source:** PHASE_4_IMPLEMENTATION_PLAN.md Day 15 vs actual sidebar-config.ts
**Issue:** The implementation plan specifies Insurance under "Financial" group, but the current sidebar places it under "Medical" group. Reports are in "System" group instead of a dedicated "Reports" group.

### GAP-03: V2_STRUCTURE.md File Names Don't Match Convention

**Source:** V2_STRUCTURE.md vs actual codebase
**Issue:** V2_STRUCTURE.md specifies `InsurancePage.tsx`, `CompanyList.tsx`, `CommissionsPage.tsx` etc. The actual codebase convention for other features uses `InsuranceCompaniesPage.tsx`, `InsuranceClaimsPage.tsx` (page-per-entity, not combined pages).
**Recommendation:** Follow the codebase convention (separate pages per entity) rather than the V2_STRUCTURE.md file names.

### GAP-04: Reconciliation Has No Sidebar Entry

**Source:** sidebar-config.ts
**Issue:** `ReconciliationPage` exists and has a route (`/reconciliation`), but is not listed in the sidebar. Users can only navigate to it directly or from within the Payments page.

### GAP-05: Report Pipeline Count Mismatch

**Source:** MASTER_PLAN §21 defines 26 reports (F1-7 + P1-5 + A1-6 + C1-4 + O1-4), but Phase 4 only implements 9 (F1-7 + O1-O2).
**Explanation:** Per MASTER_PLAN §21, Patient/Appointment/Clinical reports are "Advanced Analytics" ($199/Mo) and may be deferred. The 9 Financial + Operational pipelines cover the Phase 4 scope. The remaining 17 reports (P1-5, A1-6, C1-4, O3-O4) could be Phase 5 or a follow-up.

### GAP-06: Document Templates Folder vs PDF Components

**Source:** `features/documents/templates/` contains HTML-based templates (InvoiceTemplate.tsx, PrescriptionTemplate.tsx, TreatmentPlanTemplate.tsx) intended for `window.print()`. Phase 4 specifies `@react-pdf/renderer` PDFs as separate components in each feature folder. The relationship between these two approaches is unclear.

---

## 13. Priority Action Items

### P0 — Critical (Must complete for M4 Gate)

| #   | Action                                                                   | Est. Effort | Files                                                                                                                                                |
| --- | ------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Create `features/insurance/` folder + 6 files (pages, hooks, components) | 2 days      | InsuranceCompaniesPage.tsx, InsuranceClaimsPage.tsx, InsuranceClaimDetailPage.tsx, ClaimForm.tsx, useInsuranceCompanies.ts, useInsuranceClaims.ts    |
| 2   | Create `features/installments/` folder + 4 files                         | 1.5 days    | InstallmentsPage.tsx, InstallmentDetailPage.tsx, InstallmentPlanForm.tsx, useInstallments.ts                                                         |
| 3   | Create `features/commissions/` folder + 5 files                          | 1.5 days    | CommissionsPage.tsx, CommissionDetailPage.tsx, CommissionConfig.tsx, PayoutForm.tsx, useCommissions.ts                                               |
| 4   | Add 8 routes to router.tsx                                               | 0.5 day     | /insurance-companies, /insurance-claims, /insurance-claims/:id, /installments, /installments/:id, /commissions, /commissions/:id, /reports/scheduled |
| 5   | Fix sidebar: move Insurance to Financial, split into Companies+Claims    | 0.5 day     | sidebar-config.ts                                                                                                                                    |
| 6   | Wire ReportCategoryPage to real pipeline data + Recharts                 | 1.5 days    | ReportCategoryPage.tsx + new chart components                                                                                                        |

### P1 — High Priority (Business value)

| #   | Action                                                             | Est. Effort | Files                                    |
| --- | ------------------------------------------------------------------ | ----------- | ---------------------------------------- |
| 7   | Wire report-export.service.ts to real pipelines                    | 1 day       | report-export.service.ts                 |
| 8   | Wire report-scheduler.service.ts to real generation + Resend email | 1 day       | report-scheduler.service.ts              |
| 9   | Create Invoice Overdue BullMQ cron worker                          | 0.5 day     | New worker file + server.ts registration |
| 10  | Create Installment Overdue BullMQ cron                             | 0.5 day     | New worker or add to existing cron       |
| 11  | Create unit tests for 4 new services                               | 2 days      | 4 test files (~850L total)               |

### P2 — Medium Priority (Completeness)

| #   | Action                                                        | Est. Effort | Files                                                    |
| --- | ------------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| 12  | Create 3 PDF templates (Prescription, Treatment Plan, Report) | 2 days      | PrescriptionPDF.tsx, TreatmentPlanPDF.tsx, ReportPDF.tsx |
| 13  | Create ScheduledReportsPage + useReportSchedules hook         | 1 day       | 2 files                                                  |
| 14  | Create DateRangePicker, KPICards, ExportButton components     | 1 day       | 3 files                                                  |
| 15  | Implement module gating checks on Insurance/Reports pages     | 1 day       | Multiple files                                           |
| 16  | Add Reconciliation to sidebar                                 | 0.25 day    | sidebar-config.ts                                        |
| 17  | Create dedicated Reports sidebar group                        | 0.5 day     | sidebar-config.ts                                        |

### P3 — Lower Priority (Polish / Deferrable)

| #   | Action                                     | Est. Effort | Files                                                    |
| --- | ------------------------------------------ | ----------- | -------------------------------------------------------- |
| 18  | Bulk notification endpoint + modal         | 1 day       | notification service + route + BulkNotificationModal.tsx |
| 19  | Two-tier report model (blur + upgrade CTA) | 0.5 day     | Multiple report pages                                    |
| 20  | Integration test: full financial flow      | 1 day       | 1 test file (~300L)                                      |
| 21  | Verify audit logging on all new models     | 0.5 day     | Audit hook verification                                  |
| 22  | Report pipeline tests                      | 1 day       | report-pipeline.service.test.ts                          |

**Total estimated remaining effort: ~18-20 developer-days**

---

## Appendix A — File Inventory

### Existing Phase 4 Backend Files (16 files, ~3,700+ LOC)

```
apps/api/src/tenant/models/
  ├── insurance-company.model.ts          (82L)   ✅
  ├── insurance-claim.model.ts            (155L)  ✅
  ├── installment-plan.model.ts           (145L)  ✅
  ├── doctor-commission.model.ts          (85L)   ✅
  ├── commission-payout.model.ts          (85L)   ✅
  └── report.model.ts                     (531L)  ✅

apps/api/src/tenant/services/
  ├── insurance-company.service.ts        (176L)  ✅
  ├── insurance-claim.service.ts          (260L)  ✅
  ├── installment.service.ts              (265L)  ✅
  ├── commission.service.ts               (300L)  ✅
  └── report-pipeline.service.ts          (500L)  ✅

apps/api/src/tenant/routes/
  ├── insurance/insurance-companies.route.ts  (135L)  ✅
  ├── insurance/insurance-claims.route.ts     (170L)  ✅
  ├── installments/installments.route.ts      (150L)  ✅
  ├── commissions/commissions.route.ts        (170L)  ✅
  └── reports/reports.route.ts                (~400L) ✅

apps/api/src/services/
  ├── report-export.service.ts            (sample data)  🟡
  └── report-scheduler.service.ts         (mock data)    🟡
```

### Existing Phase 4 Frontend Files (10 files, ~3,000+ LOC)

```
apps/admin/src/features/invoices/
  ├── pages/InvoiceListPage.tsx           (418L)  ✅
  ├── pages/InvoiceDetailPage.tsx         (320L)  ✅
  ├── components/InvoicePDF.tsx           (372L)  ✅
  └── hooks/useInvoices.ts               (163L)  ✅

apps/admin/src/features/payments/
  ├── pages/PaymentsPage.tsx              (361L)  ✅
  ├── pages/ReconciliationPage.tsx        (208L)  ✅
  ├── components/PaymentReceipt.tsx       (213L)  ✅
  └── hooks/usePayments.ts               (214L)  ✅

apps/admin/src/features/reports/
  ├── pages/ReportsHubPage.tsx            (288L)  ✅
  ├── pages/ReportCategoryPage.tsx        (601L)  🟡 (mock data)
  └── pages/index.ts                      ✅
```

### Files To Create (34 files, ~7,000+ LOC estimated)

```
apps/admin/src/features/insurance/           ← NEW FOLDER
  ├── pages/InsuranceCompaniesPage.tsx       (~350L)
  ├── pages/InsuranceClaimsPage.tsx          (~400L)
  ├── pages/InsuranceClaimDetailPage.tsx     (~350L)
  ├── components/ClaimForm.tsx              (~200L)
  ├── hooks/useInsuranceCompanies.ts        (~120L)
  └── hooks/useInsuranceClaims.ts           (~150L)

apps/admin/src/features/installments/        ← NEW FOLDER
  ├── pages/InstallmentsPage.tsx             (~350L)
  ├── pages/InstallmentDetailPage.tsx        (~300L)
  ├── components/InstallmentPlanForm.tsx     (~180L)
  └── hooks/useInstallments.ts              (~120L)

apps/admin/src/features/commissions/         ← NEW FOLDER
  ├── pages/CommissionsPage.tsx              (~400L)
  ├── pages/CommissionDetailPage.tsx         (~300L)
  ├── components/CommissionConfig.tsx        (~150L)
  ├── components/PayoutForm.tsx             (~150L)
  └── hooks/useCommissions.ts               (~150L)

apps/admin/src/features/reports/
  ├── pages/ScheduledReportsPage.tsx         (~300L)
  ├── components/DateRangePicker.tsx         (~120L)
  ├── components/KPICards.tsx                (~100L)
  ├── components/ExportButton.tsx            (~80L)
  ├── components/ReportPDF.tsx              (~250L)
  ├── components/ChartWrapper.tsx            (~60L)
  ├── hooks/useReports.ts                   (~150L)
  └── hooks/useReportSchedules.ts           (~100L)

apps/admin/src/features/prescriptions/
  └── components/PrescriptionPDF.tsx         (~250L)

apps/admin/src/features/treatment-plans/
  └── components/TreatmentPlanPDF.tsx        (~300L)

apps/admin/src/features/notifications/
  └── components/BulkNotificationModal.tsx   (~200L)

apps/api/src/tenant/services/               ← TESTS
  ├── insurance-company.service.test.ts      (~200L)
  ├── insurance-claim.service.test.ts        (~250L)
  ├── installment.service.test.ts            (~200L)
  ├── commission.service.test.ts             (~200L)
  └── report-pipeline.service.test.ts        (~300L)

apps/api/src/jobs/                           ← WORKERS
  ├── invoice-overdue.worker.ts              (~80L)
  └── installment-overdue.worker.ts          (~60L)
```

---

_End of compliance scan. Generated from 9 planning documents + full codebase audit._
