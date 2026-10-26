# Phase 4 Financial Module — Complete Requirements Extraction Report

> **Generated:** 2025-07-27
> **Scope:** Every Phase 4 (Financial Module) requirement extracted from 11 planning documents
> **Covers:** Invoices, Payments, Insurance Companies, Insurance Claims, Installment Plans, Doctor Commissions/Payouts, Financial Reports (F1-F7, O1-O2), Report Scheduling, Report Export, PDF Templates, Bulk Notifications, Overdue Invoice Cron Worker

---

## Table of Contents

1. [DENTO_V2_MASTER_PLAN.md](#1-dento_v2_master_planmd)
2. [IMPLEMENTATION_ROADMAP.md](#2-implementation_roadmapmd)
3. [V2_DATABASE.md](#3-v2_databasemd)
4. [TECH_REQUIREMENTS.md](#4-tech_requirementsmd)
5. [SECURITY_AND_ENCRYPTION.md](#5-security_and_encryptionmd)
6. [V2_DECISION_LOG.md](#6-v2_decision_logmd)
7. [V2_STRUCTURE.md](#7-v2_structuremd)
8. [PLATFORM_RBAC.md](#8-platform_rbacmd)
9. [BUILD_RULES.md](#9-build_rulesmd)
10. [ADMIN_PORTAL_SCREENS.md](#10-admin_portal_screensmd)
11. [PHASE_4_IMPLEMENTATION_PLAN.md](#11-phase_4_implementation_planmd)
12. [Implementation Status Summary](#12-implementation-status-summary)

---

## 1. DENTO_V2_MASTER_PLAN.md

### §10 — Module Table (line 818)

- [ ] **Module #8 — Invoices**: Collection `invoices` with embedded `items[]`
- [ ] **Module #9 — Payments**: Collections `payments`, `reconciliation`
- [ ] **Module #14 — Insurance**: Collections `insurance_claims`, `insurance_companies`
- [ ] **Module #22 — Commissions**: Collections `doctor_commissions`, `commission_payouts`
- [ ] **Module #23 — Installments**: Collection `installment_plans` with embedded `payments[]`

### §10 — Module #14 Insurance Embedded Schema (line 906)

Patient insurance embedded array `patients.insurance[]`:

- [ ] Field `insuranceCompanyId` — ObjectId → insurance_companies
- [ ] Field `policyNumber` — String, **ENCRYPTED** (AES-256-GCM)
- [ ] Field `groupNumber` — String
- [ ] Field `memberId` — String
- [ ] Field `coverageType` — enum: `'individual' | 'family'`
- [ ] Field `coveragePercentage` — Number (0-100)
- [ ] Field `maxCoverage` — Number
- [ ] Field `deductible` — Number
- [ ] Field `deductibleMet` — Number
- [ ] Field `effectiveDate` — Date
- [ ] Field `expiryDate` — Date
- [ ] Field `isPrimary` — Boolean
- [ ] Field `isActive` — Boolean

### §13 — Doctor Data Model (line 1200)

- [ ] `doctors.commissionRate` — Number (e.g. 30.0 = 30%)
- [ ] `doctors.consultationFee` — Number (in tenant currency)
- [ ] Cross-reference: `doctorCommissions.doctorId` → doctors

### §15 — Document Templates (line 1381)

- [ ] Reusable `<ClinicHeader />` component: clinic logo, name (EN/AR), address, phone, optional doctor
- [ ] **Invoice PDF template**: NO doctor on invoice (clinic document), patient info, line items table (Service, Tooth, Qty, Price, Total), subtotal/VAT/total, payment status badge
- [ ] **Prescription PDF template**: Doctor + Specialty + License number, Rx items, signature line
- [ ] **Treatment Plan PDF template**: Doctor info, procedure table (tooth, status, cost), total, patient + doctor signature

Template matrix:

| Element         | Invoice | Prescription | Treatment Plan  |
| :-------------- | :-----: | :----------: | :-------------: |
| Clinic Header   |   ✅    |      ✅      |       ✅        |
| Doctor          |   ❌    |      ✅      |       ✅        |
| Patient Info    |   ✅    |      ✅      |       ✅        |
| Line Items      |   ✅    |   ✅ (Rx)    | ✅ (Procedures) |
| Financial Total |   ✅    |      ❌      |       ✅        |
| Signature       |   ❌    |      ✅      |    ✅ (both)    |

- [ ] `invoice.items[].doctorId` tracked internally but NOT shown on PDF

### §20 — Notification System: Financial Alerts (line 3996)

- [ ] `alert_rules` trigger type `invoice_overdue` — condition: `daysPastDue ≥ 30`
- [ ] Overdue Invoice alert: Notify `admin`, `accountant` (In-App)
- [ ] `alert_rules` trigger type `payment_pending`
- [ ] `alert_rules` trigger type `revenue_drop` — condition: `monthlyChange ≤ -20%` → Notify admin (Email)
- [ ] BullMQ Worker `alert-rule-checker` runs every 15 minutes
- [ ] Payment Reminders cron: daily 10:00 — `pattern: '0 10 * * *'` → open invoices > X days

### §20 — Bulk Notifications (line 4394)

- [ ] Route: `POST /api/notifications/send-bulk` — send to all patients / group
- [ ] RBAC: `notifications.send_bulk` — Admin only
- [ ] Webhook event: `notification.bulk_sent`

### §21 — Reports & Analytics System (line 4457)

#### Two-Tier Model

- [ ] Free tier: `dashboard-reports` module
- [ ] Paid tier: `advanced-analytics` module ($199/month)
- [ ] Chart library: Recharts 2.x (React-based, RTL-compatible)

#### 7 Financial Reports

- [ ] **F1: Revenue Summary** — `invoices` → `$group` by period, `$sum totalAmount` WHERE `status='paid'` — Free: current month only; Advanced: historical
- [ ] **F2: Revenue by Doctor** — `invoices` → `$lookup appointments` → `$group` by `doctorId` — Advanced only
- [ ] **F3: Revenue by Service** — `invoices.items` → `$unwind` → `$group` by `serviceId` — Advanced only
- [ ] **F4: Revenue by Branch** — `invoices` → `$group` by `branchId` — Advanced + Multi-Branch only
- [ ] **F5: Payment Collection** — `payments` → `$group` by `method`, `$sum amount` — Advanced only
- [ ] **F6: Outstanding Invoices / Aging** — `invoices` WHERE `status≠paid` → `$bucket` by age: 0-30 / 31-60 / 61-90 / 90+ — Advanced only
- [ ] **F7: Tax Report** — `invoices` → `$group` by period, `$sum taxAmount` — Advanced only

#### 2 Operational Reports (Financial)

- [ ] **O1: Commission Summary** — `doctor_commissions` → `$group` by `doctorId`, `status` — Advanced only
- [ ] **O2: Daily Reconciliation** — `reconciliation` → by date, branch — Advanced only

#### Dashboard Widgets

- [ ] Today's Overview widget
- [ ] Revenue This Month sparkline widget
- [ ] Quick Actions: **+New Invoice**
- [ ] Waiting Room widget

#### Report Scheduling Schema (`report_schedules` collection)

- [ ] Field `reportType` — String
- [ ] Field `reportParams` — Object
- [ ] Field `frequency` — enum: `'daily' | 'weekly' | 'monthly'`
- [ ] Field `dayOfWeek` — Number | null
- [ ] Field `dayOfMonth` — Number | null
- [ ] Field `time` — String
- [ ] Field `timezone` — String
- [ ] Field `deliveryMethod` — enum: `'email' | 'in_app' | 'both'`
- [ ] Field `recipients` — ObjectId[]
- [ ] Field `emailAddresses` — String[]
- [ ] Field `format` — enum: `'pdf' | 'csv' | 'excel'`
- [ ] Field `name` — String
- [ ] Field `lastRunAt` — Date | null
- [ ] Field `nextRunAt` — Date | null

#### BullMQ Worker `report-generation`

- [ ] Cron: daily at `00:05`
- [ ] Find due schedules
- [ ] Run aggregation pipeline
- [ ] Generate PDF / CSV / Excel
- [ ] Upload to S3/R2
- [ ] Deliver via Email (Resend) or In-App notification

#### Export System

- [ ] Route: `POST /api/reports/export`
- [ ] CSV export via `@fast-csv/format`
- [ ] Excel export via `exceljs`
- [ ] PDF export via `@react-pdf/renderer`

#### 9 UI Pages for Reports

- [ ] Dashboard page
- [ ] Reports Hub page
- [ ] Financial Reports page
- [ ] Patient Reports page
- [ ] Appointment Reports page
- [ ] Clinical Reports page
- [ ] Operational Reports page
- [ ] Saved Reports page
- [ ] Scheduled Reports page

#### 16 API Endpoints

- [ ] `GET /api/dashboard/stats`
- [ ] `GET /api/dashboard/trends`
- [ ] `GET /api/reports/financial/:type`
- [ ] `GET /api/reports/patients/:type`
- [ ] `GET /api/reports/appointments/:type`
- [ ] `GET /api/reports/clinical/:type`
- [ ] `GET /api/reports/operational/:type`
- [ ] `POST /api/reports/export`
- [ ] `GET /api/reports/saved` (list)
- [ ] `POST /api/reports/saved` (create)
- [ ] `GET /api/reports/saved/:id` (read)
- [ ] `DELETE /api/reports/saved/:id` (delete)
- [ ] `GET /api/reports/scheduled` (list)
- [ ] `POST /api/reports/scheduled` (create)
- [ ] `DELETE /api/reports/scheduled/:id` (delete)
- [ ] `POST /api/reports/scheduled/:id/run` (manual trigger)

#### RBAC Permissions for Reports

| Permission                 | Roles                              |
| :------------------------- | :--------------------------------- |
| `reports.dashboard.view`   | All                                |
| `reports.basic.view`       | admin, manager, doctor, accountant |
| `reports.advanced.view`    | admin, manager, accountant         |
| `reports.financial.view`   | admin, manager, accountant         |
| `reports.export`           | admin, manager, accountant         |
| `reports.schedules.manage` | admin, manager                     |
| `reports.saved.manage`     | admin, manager, accountant         |

#### Report Webhook Events

- [ ] `report.generated`
- [ ] `report.generation_failed`
- [ ] `report.exported`
- [ ] `report.schedule.created`
- [ ] `report.schedule.deleted`

### §25 — Tenant Locale & Currency (line 5995)

- [ ] Country determines: Phone Prefix, Tax Rate, Tax Label, Payment Provider (locked)
- [ ] Tenant chooses: Language, Currency, Timezone, Date Format
- [ ] **Per-Invoice Currency Override** — patient/invoice can use a different currency than tenant default
- [ ] Currency propagation: Invoice PDFs, Reports, Dashboard widgets

### §29 — Payment Gateways (line 6976)

#### Paymob Integration (Egypt)

- [ ] Cards (Visa/MC/Meeza): 2.5% + 1 EGP
- [ ] Fawry: 2% + 2 EGP — offline reference (10-digit), 48h validity, kiosk payment → webhook
- [ ] Mobile Wallets: 1.5%
- [ ] InstaPay: 3 EGP flat
- [ ] ValU (BNPL): 0%
- [ ] Meeza Digital: 1%

#### Stripe Integration (International)

- [ ] Cards
- [ ] SEPA
- [ ] Bank Transfer
- [ ] Recurring Subscriptions

#### Paymob Integration Code

- [ ] File: `apps/api/src/plugins/paymob.ts`
- [ ] Flow: Auth Request → Order Registration → Payment Key → Frontend iframe → Webhook

#### `saas_payments` Extended Schema

- [ ] Field `provider` — String (stripe | paymob)
- [ ] Field `providerPaymentId` — String
- [ ] Field `providerTransactionId` — String
- [ ] Field `method` — enum: `'card' | 'fawry' | 'wallet' | 'instapay' | 'valu' | 'bank_transfer'`
- [ ] Field `methodDetails.cardBrand` — String
- [ ] Field `methodDetails.fawryReference` — String
- [ ] Field `methodDetails.walletPhone` — String
- [ ] Field `methodDetails.valuMonths` — Number
- [ ] Field `status` — String
- [ ] Field `providerFee` — Number
- [ ] Field `netAmount` — Number

#### Admin Billing Page (SaaS-level)

- [ ] Active modules display
- [ ] Next invoice display
- [ ] Payment method management
- [ ] Pay Now button
- [ ] Payment history
- [ ] PDF download for SaaS invoices
- [ ] Auto-pay toggle

---

## 2. IMPLEMENTATION_ROADMAP.md

### Phase 4 Financial — Weeks 14-16 (adjusted to Weeks 18-20 per Decision Log)

#### Week 14 (adjusted Week 18): Invoices + Payments

- [ ] Invoices CRUD + embedded `items[]`
- [ ] Auto-generate invoice from Treatment Plan
- [ ] Invoice PDF export
- [ ] Line items: services, quantities, discounts, tax
- [ ] Per-invoice currency override
- [ ] Payments: cash / card / bank / online
- [ ] Payment reconciliation
- [ ] Paymob online payment integration
- [ ] Stripe online payment integration
- [ ] Payment security: HMAC webhook verification, no card data stored
- [ ] Payment receipts PDF

#### Week 15 (adjusted Week 19): Insurance + Installments

- [ ] Insurance companies CRUD + coverage defaults
- [ ] Patient insurance embedded array `patients.insurance[]`
- [ ] Insurance claims CRUD + status flow: `submitted → approved → paid → denied`
- [ ] Claim ↔ Invoice linking
- [ ] Installment plans CRUD + embedded payments + auto-reminder
- [ ] Installment tracking

#### Week 16 (adjusted Week 20): Commissions + Reports

- [ ] Doctor commissions: configurable % or fixed per service, auto-calculation
- [ ] Commission payouts
- [ ] 7 financial reports (F1-F7)
- [ ] PDF export system
- [ ] Bulk notifications
- [ ] Report scheduling

### Milestones

- [ ] **M4: "Billing Complete"** — Invoice → Payment → Insurance full flow, Payment Webhook HMAC verified

### Security Integration Map — Phase 4

- [ ] Payment Webhook HMAC Verification
- [ ] PCI DSS Compliance via Provider (no card data stored)

### Definition of Done (15 criteria — applies to all Phase 4 features)

- [ ] API endpoint implemented
- [ ] Zod schema (`.strict()`) for validation
- [ ] UI page built
- [ ] RTL + LTR support
- [ ] Dark mode support
- [ ] Responsive design
- [ ] RBAC guard applied
- [ ] Seed data for development
- [ ] No `any` types in codebase
- [ ] ESLint + Prettier passing
- [ ] Security: rate limiting, Zod strict, RBAC
- [ ] PII encryption where required
- [ ] Audit log for mutations
- [ ] Unit test coverage
- [ ] Swagger/OpenAPI docs

---

## 3. V2_DATABASE.md

### §7 — Billing & Finance (line 2233)

#### 7.1 `invoices` Collection (line 2235)

| Field                   | Type             | Notes                                                                                               |
| :---------------------- | :--------------- | :-------------------------------------------------------------------------------------------------- |
| `_id`                   | ObjectId         |                                                                                                     |
| `invoiceNumber`         | String           | Auto: `INV-YYYY-NNNNN`                                                                              |
| `patientId`             | ObjectId         | → patients                                                                                          |
| `branchId`              | ObjectId         | → branches                                                                                          |
| `appointmentId`         | ObjectId \| null | → appointments                                                                                      |
| `treatmentPlanId`       | ObjectId \| null | → treatment_plans                                                                                   |
| `items[]`               | Array (embedded) |                                                                                                     |
| `items[].description`   | String           |                                                                                                     |
| `items[].treatmentId`   | ObjectId \| null |                                                                                                     |
| `items[].serviceId`     | ObjectId \| null |                                                                                                     |
| `items[].quantity`      | Number           |                                                                                                     |
| `items[].unitPrice`     | Number           |                                                                                                     |
| `items[].discount`      | Number           |                                                                                                     |
| `items[].total`         | Number           |                                                                                                     |
| `subtotal`              | Number           |                                                                                                     |
| `discountAmount`        | Number           |                                                                                                     |
| `discountPercentage`    | Number           |                                                                                                     |
| `taxAmount`             | Number           |                                                                                                     |
| `taxPercentage`         | Number           |                                                                                                     |
| `totalAmount`           | Number           |                                                                                                     |
| `amountPaid`            | Number           |                                                                                                     |
| `balanceDue`            | Number           |                                                                                                     |
| `status`                | String           | enum: `'draft' \| 'issued' \| 'paid' \| 'partially_paid' \| 'overdue' \| 'cancelled' \| 'refunded'` |
| `issueDate`             | Date             |                                                                                                     |
| `dueDate`               | Date             |                                                                                                     |
| `paidAt`                | Date \| null     |                                                                                                     |
| `notes`                 | String \| null   |                                                                                                     |
| `terms`                 | String \| null   |                                                                                                     |
| `insuranceClaimId`      | ObjectId \| null | → insurance_claims                                                                                  |
| `insuredAmount`         | Number \| null   |                                                                                                     |
| `patientResponsibility` | Number \| null   |                                                                                                     |
| `createdBy`             | ObjectId         |                                                                                                     |
| `createdAt`             | Date             |                                                                                                     |
| `updatedAt`             | Date             |                                                                                                     |

**Indexes:**

- [ ] `{ invoiceNumber: 1 }` — unique
- [ ] `{ patientId: 1, createdAt: -1 }`
- [ ] `{ status: 1, dueDate: 1 }`
- [ ] `{ branchId: 1, issueDate: 1 }`

#### 7.2 `payments` Collection (line 2297)

| Field              | Type           | Notes                                                                                                    |
| :----------------- | :------------- | :------------------------------------------------------------------------------------------------------- |
| `_id`              | ObjectId       |                                                                                                          |
| `invoiceId`        | ObjectId       | → invoices                                                                                               |
| `patientId`        | ObjectId       | → patients                                                                                               |
| `amount`           | Number         |                                                                                                          |
| `paymentMethod`    | String         | enum: `'cash' \| 'card' \| 'bank_transfer' \| 'cheque' \| 'insurance' \| 'online' \| 'fawry' \| 'meeza'` |
| `paymentReference` | String \| null |                                                                                                          |
| `status`           | String         | enum: `'pending' \| 'completed' \| 'failed' \| 'refunded'`                                               |
| `notes`            | String \| null |                                                                                                          |
| `receivedBy`       | ObjectId       |                                                                                                          |
| `receivedAt`       | Date           |                                                                                                          |
| `createdAt`        | Date           |                                                                                                          |

**Indexes:**

- [ ] `{ invoiceId: 1 }`
- [ ] `{ patientId: 1, createdAt: -1 }`
- [ ] `{ receivedAt: -1 }`

#### 7.3 `doctor_commissions` Collection (line 2327)

| Field              | Type             | Notes                                                    |
| :----------------- | :--------------- | :------------------------------------------------------- |
| `_id`              | ObjectId         |                                                          |
| `doctorId`         | ObjectId         | → doctors                                                |
| `appointmentId`    | ObjectId         | → appointments                                           |
| `invoiceId`        | ObjectId         | → invoices                                               |
| `procedureName`    | String           |                                                          |
| `procedureAmount`  | Number           |                                                          |
| `commissionRate`   | Number           | Percentage                                               |
| `commissionAmount` | Number           |                                                          |
| `status`           | String           | enum: `'pending' \| 'approved' \| 'paid' \| 'cancelled'` |
| `paidAt`           | Date \| null     |                                                          |
| `payoutId`         | ObjectId \| null | → commission_payouts                                     |

**Indexes:**

- [ ] `{ doctorId: 1, status: 1 }`
- [ ] `{ payoutId: 1 }`

#### 7.3 `commission_payouts` Collection (line 2327)

| Field           | Type     | Notes     |
| :-------------- | :------- | :-------- |
| `_id`           | ObjectId |           |
| `doctorId`      | ObjectId | → doctors |
| `payoutDate`    | Date     |           |
| `periodStart`   | Date     |           |
| `periodEnd`     | Date     |           |
| `totalAmount`   | Number   |           |
| `paymentMethod` | String   |           |
| `reference`     | String   |           |
| `createdBy`     | ObjectId |           |
| `createdAt`     | Date     |           |

**Indexes:**

- [ ] `{ doctorId: 1, payoutDate: -1 }`

#### 7.4 `installment_plans` Collection (line 2372)

| Field                          | Type             | Notes                                                         |
| :----------------------------- | :--------------- | :------------------------------------------------------------ |
| `_id`                          | ObjectId         |                                                               |
| `invoiceId`                    | ObjectId         | → invoices                                                    |
| `patientId`                    | ObjectId         | → patients                                                    |
| `totalAmount`                  | Number           |                                                               |
| `downPayment`                  | Number           |                                                               |
| `remainingAmount`              | Number           |                                                               |
| `numberOfInstallments`         | Number           |                                                               |
| `installmentAmount`            | Number           |                                                               |
| `frequency`                    | String           | enum: `'weekly' \| 'biweekly' \| 'monthly'`                   |
| `status`                       | String           | enum: `'active' \| 'completed' \| 'defaulted' \| 'cancelled'` |
| `payments[]`                   | Array (embedded) |                                                               |
| `payments[].installmentNumber` | Number           |                                                               |
| `payments[].dueDate`           | Date             |                                                               |
| `payments[].amountDue`         | Number           |                                                               |
| `payments[].amountPaid`        | Number           |                                                               |
| `payments[].lateFee`           | Number           |                                                               |
| `payments[].status`            | String           | enum: `'pending' \| 'paid' \| 'overdue' \| 'waived'`          |
| `payments[].paidAt`            | Date \| null     |                                                               |
| `payments[].paymentId`         | ObjectId \| null | → payments                                                    |
| `createdBy`                    | ObjectId         |                                                               |
| `createdAt`                    | Date             |                                                               |
| `updatedAt`                    | Date             |                                                               |

**Indexes:**

- [ ] `{ patientId: 1, status: 1 }`
- [ ] `{ invoiceId: 1 }`
- [ ] `{ 'payments.dueDate': 1, 'payments.status': 1 }`

#### 7.5 `insurance_companies` Collection (line 2414)

| Field                | Type                         | Notes      |
| :------------------- | :--------------------------- | :--------- |
| `_id`                | ObjectId                     |            |
| `name`               | `{ en: String, ar: String }` |            |
| `code`               | String                       | **Unique** |
| `contactPerson`      | String                       |            |
| `phone`              | String                       |            |
| `email`              | String                       |            |
| `coveragePercentage` | Number                       |            |
| `maxCoverage`        | Number                       |            |
| `isActive`           | Boolean                      |            |
| `createdAt`          | Date                         |            |
| `updatedAt`          | Date                         |            |

**Indexes:**

- [ ] `{ code: 1 }` — unique
- [ ] `{ isActive: 1 }`

#### 7.5 `insurance_claims` Collection (line 2414)

| Field                   | Type           | Notes                                                                                             |
| :---------------------- | :------------- | :------------------------------------------------------------------------------------------------ |
| `_id`                   | ObjectId       |                                                                                                   |
| `claimNumber`           | String         | Auto: `CLM-YYYY-NNNNN`                                                                            |
| `patientId`             | ObjectId       | → patients                                                                                        |
| `patientInsuranceIndex` | Number         | Index into `patients.insurance[]`                                                                 |
| `invoiceId`             | ObjectId       | → invoices                                                                                        |
| `claimDate`             | Date           |                                                                                                   |
| `serviceDate`           | Date           |                                                                                                   |
| `totalAmount`           | Number         |                                                                                                   |
| `claimedAmount`         | Number         |                                                                                                   |
| `approvedAmount`        | Number         |                                                                                                   |
| `patientResponsibility` | Number         |                                                                                                   |
| `status`                | String         | enum: `'submitted' \| 'under_review' \| 'approved' \| 'partially_approved' \| 'denied' \| 'paid'` |
| `denialReason`          | String \| null |                                                                                                   |
| `documents[]`           | Array          | `{ name, url, type }`                                                                             |
| `createdBy`             | ObjectId       |                                                                                                   |
| `createdAt`             | Date           |                                                                                                   |
| `updatedAt`             | Date           |                                                                                                   |

**Indexes:**

- [ ] `{ claimNumber: 1 }` — unique
- [ ] `{ patientId: 1, createdAt: -1 }`
- [ ] `{ status: 1, claimDate: 1 }`

#### 7.6 `reconciliation` Collection (line 2472)

| Field                | Type             | Notes                                    |
| :------------------- | :--------------- | :--------------------------------------- |
| `_id`                | ObjectId         |                                          |
| `branchId`           | ObjectId         | → branches                               |
| `reconciliationDate` | Date             |                                          |
| `openingBalance`     | Number           |                                          |
| `closingBalance`     | Number           |                                          |
| `cashReceived`       | Number           |                                          |
| `cardReceived`       | Number           |                                          |
| `onlineReceived`     | Number           |                                          |
| `insuranceReceived`  | Number           |                                          |
| `totalReceived`      | Number           |                                          |
| `expenses`           | Number           |                                          |
| `discrepancy`        | Number           |                                          |
| `status`             | String           | enum: `'open' \| 'closed' \| 'reviewed'` |
| `closedBy`           | ObjectId \| null |                                          |
| `reviewedBy`         | ObjectId \| null |                                          |
| `notes`              | String \| null   |                                          |
| `createdAt`          | Date             |                                          |
| `updatedAt`          | Date             |                                          |

**Indexes:**

- [ ] `{ branchId: 1, reconciliationDate: -1 }` — unique

### §11.1 — `settings` Collection — Billing Key (line 3150)

- [ ] Settings key `"billing"` with sub-fields:
  - `invoicePrefix` — String (default: `"INV"`)
  - `invoiceStartNumber` — Number
  - `paymentMethods` — String[]
  - `defaultPaymentTermDays` — Number
  - `enableInstallments` — Boolean
  - `enableInsurance` — Boolean
  - `enableCommissions` — Boolean

### §11.5 — `report_schedules` Collection (line 3310)

| Field                 | Type           | Notes                                                                                                                |
| :-------------------- | :------------- | :------------------------------------------------------------------------------------------------------------------- |
| `_id`                 | ObjectId       |                                                                                                                      |
| `name`                | String         |                                                                                                                      |
| `reportType`          | String         | enum: `'revenue' \| 'appointments' \| 'patients' \| 'inventory' \| 'commissions' \| 'insurance' \| 'aging' \| 'tax'` |
| `schedule.frequency`  | String         | enum: `'daily' \| 'weekly' \| 'monthly' \| 'quarterly'`                                                              |
| `schedule.dayOfWeek`  | Number \| null |                                                                                                                      |
| `schedule.dayOfMonth` | Number \| null |                                                                                                                      |
| `schedule.time`       | String         | e.g. `"08:00"`                                                                                                       |
| `filters`             | Object         | Dynamic filters per reportType                                                                                       |
| `format`              | String         | enum: `'pdf' \| 'excel' \| 'csv'`                                                                                    |
| `recipients[]`        | Array          | `{ userId, email, name }`                                                                                            |
| `lastRunAt`           | Date \| null   |                                                                                                                      |
| `lastStatus`          | String \| null |                                                                                                                      |
| `isActive`            | Boolean        |                                                                                                                      |
| `createdBy`           | ObjectId       |                                                                                                                      |
| `createdAt`           | Date           |                                                                                                                      |
| `updatedAt`           | Date           |                                                                                                                      |

**Indexes:**

- [ ] `{ isActive: 1, 'schedule.frequency': 1 }`

### §12 — Index Strategy: Financial Indexes

- [ ] Compound index: `invoices { status, dueDate }` — for overdue queries
- [ ] Unique constraint: `invoices.invoiceNumber` per tenant DB
- [ ] Unique constraint: `insurance_companies.code` per tenant DB

---

## 4. TECH_REQUIREMENTS.md

### Financial Dependencies

- [ ] `stripe` (Latest) — International payments
- [ ] `paymob-node` (Latest) — Egyptian payments
- [ ] `@react-pdf/renderer` (Latest) — PDF generation (invoices, prescriptions, treatment plans, reports)
- [ ] `@fast-csv/format` (Latest) — CSV export
- [ ] `exceljs` (Latest) — Excel export
- [ ] `recharts` 2.x — Chart library for reports

---

## 5. SECURITY_AND_ENCRYPTION.md

### §5.3 — PII Encryption (AES-256-GCM)

- [ ] Encrypt: `patients.insurance[].policyNumber` — Insurance policy number
- [ ] Encrypt: `patients.nationalId` — National ID (PII)
- [ ] Encrypt: `patients.medicalHistory.notes` — Medical history (PHI)
- [ ] Format: `iv:authTag:ciphertext` (all hex)
- [ ] Key: `ENCRYPTION_MASTER_KEY` env var (64 hex chars = 32 bytes)
- [ ] Key rotation: every 6 months

### §6 — Payment Security

- [ ] **PCI DSS compliance via Stripe/Paymob** — NO card data stored in own database
- [ ] **Webhook signing**: HMAC-SHA256 with timestamp, 5-minute replay window
- [ ] Signature format: `sha256=<HMAC-SHA256 of body using webhook secret>`
- [ ] Reject if signature mismatch OR timestamp > 5 minutes old

### §7 — File Upload Security (Insurance Claims)

- [ ] Insurance claim documents: **PDF only**, 10MB max
- [ ] 6-step upload pipeline: size check → MIME magic bytes → extension whitelist → filename sanitize → virus scan → image processing

### §9 — Audit Logging

- [ ] Every financial mutation logged: `userId`, `action`, `resource`, `before`/`after`, `ipAddress`, `userAgent`
- [ ] Resource types include: `invoices`, `payments`, `insurance_claims`, `installment_plans`, `doctor_commissions`

### §10 — Session & RBAC

- [ ] `authGuard` → `tenantDb` → `roleGuard` chain on all financial routes

### §11 — HIPAA Compliance

- [ ] Access Control: RBAC guards on all financial endpoints
- [ ] Audit Controls: All financial data access logged
- [ ] Transmission Security: TLS for all payment data
- [ ] Encryption at rest: MongoDB Atlas encryption + field-level AES-256-GCM

### §13 — Input Validation

- [ ] Zod `.strict()` on every financial create/update schema — reject unknown keys
- [ ] NoSQL injection prevention: block `$gt`, `$ne`, `$where` in values

### §6.1 — Rate Limiting

- [ ] Global: 100 req/min per IP on all routes
- [ ] Auth: 5 req/min per IP on auth routes
- [ ] Payment webhooks: standard rate limiting applies

---

## 6. V2_DECISION_LOG.md

### Webhook Events (Financial)

- [ ] `invoice.issued` — triggered when invoice status → issued
- [ ] `invoice.paid` — triggered when invoice status → paid
- [ ] `payment.received` — triggered when payment recorded

### Aggregation Pipeline Patterns

- [ ] Revenue Report (monthly) — `$match` status='paid' → `$group` by month → `$sum` totalAmount
- [ ] Insurance Aging Report — `$bucket` by aging days: 0 / 30 / 60 / 90 / 120+
- [ ] Doctor Productivity — `$lookup` appointments + invoices → `$group` by doctor

### Report Caching

- [ ] Redis cache: 5-minute TTL
- [ ] Key format: `report:{tenantSlug}:{reportType}:{hash}`

### Timeline Decision (Decision §8)

- [ ] Phase 4 moved to **Weeks 18-20** (from 14-16) due to 34-week extension
- [ ] 2-week buffer between phases
- [ ] **Risk**: If Phase 4 runs over >2 weeks → cut Insurance module → move to Phase 5

### Migration Order

- [ ] Step 10: `invoices` + `items` (embedded)
- [ ] Step 11: `payments`

### Test Stack

- [ ] Vitest 2.x + supertest + mongodb-memory-server
- [ ] Phase 4 coverage target: **70%**

---

## 7. V2_STRUCTURE.md

### Backend File Structure — Financial Modules

#### Models (`apps/api/src/tenant/models/`)

- [ ] `invoice.model.ts`
- [ ] `payment.model.ts`
- [ ] `insurance-claim.model.ts`
- [ ] `insurance-company.model.ts`
- [ ] `commission.model.ts`
- [ ] `commission-payout.model.ts`
- [ ] `installment-plan.model.ts`

#### Routes (`apps/api/src/tenant/routes/`)

- [ ] `invoices/` — invoice routes folder
- [ ] `payments/` — payment routes folder
- [ ] `insurance/` — insurance routes folder
- [ ] `commissions/` — commissions routes folder
- [ ] `installments/` — installments routes folder
- [ ] `reports/` — reports routes folder with `pipelines/` subfolder

#### Services (`apps/api/src/services/`)

- [ ] `pdf.service.ts` — PDF generation service

#### Workers (`apps/api/src/jobs/workers/`)

- [ ] `report.worker.ts` — report generation BullMQ worker

### Frontend File Structure — Admin Portal

#### `features/invoices/` (Module #8)

- [ ] `pages/InvoiceListPage.tsx`
- [ ] `pages/InvoiceDetailPage.tsx`
- [ ] `components/InvoiceForm.tsx`
- [ ] `components/InvoiceLineItems.tsx`
- [ ] `components/InvoicePDF.tsx` — PDF Preview + Download
- [ ] `hooks/useInvoices.ts`

#### `features/payments/` (Module #9)

- [ ] `pages/PaymentsPage.tsx`
- [ ] `components/PaymentForm.tsx`
- [ ] `components/OnlinePayment.tsx` — Paymob/Stripe integration
- [ ] `components/PaymentReceipt.tsx`
- [ ] `hooks/usePayments.ts`

#### `features/insurance/` (Module #14)

- [ ] `pages/InsurancePage.tsx`
- [ ] `components/ClaimForm.tsx`
- [ ] `components/CompanyList.tsx`
- [ ] `hooks/useInsurance.ts`

#### `features/commissions/` (Module #22)

- [ ] `pages/CommissionsPage.tsx`
- [ ] `components/CommissionConfig.tsx`
- [ ] `components/PayoutTable.tsx`
- [ ] `hooks/useCommissions.ts`

#### `features/installments/` (Module #23)

- [ ] `pages/InstallmentsPage.tsx`
- [ ] `components/InstallmentPlanForm.tsx`
- [ ] `hooks/useInstallments.ts`

#### `features/reports/` (Module #26)

- [ ] `pages/ReportsHub.tsx`
- [ ] `pages/FinancialReports.tsx`
- [ ] `pages/OperationalReports.tsx`
- [ ] `components/ReportCard.tsx`
- [ ] `components/ChartWrapper.tsx` — Recharts wrapper
- [ ] `components/DateRangePicker.tsx`
- [ ] `components/ExportButtons.tsx` — CSV, Excel, PDF
- [ ] `hooks/useReports.ts`

#### `features/patients/` — Insurance Sub-Component

- [ ] `components/PatientInsurance.tsx` — visible only when Insurance module is active

#### Shared Utilities

- [ ] `lib/format.ts` — Currency, Number, Date formatters

---

## 8. PLATFORM_RBAC.md

### Platform Billing Permissions

- [ ] Module: `platform_billing` — Subscription, Payments, Invoices (SaaS-level)
- [ ] `platform_owner`: `*` (full access)
- [ ] `platform_admin`: `read` only
- [ ] `platform_viewer`: `read` only

### Platform Pricing Permissions

- [ ] Module: `platform_pricing`
- [ ] `platform_owner`: `*` (full access)
- [ ] `platform_admin`: `read` only
- [ ] `platform_viewer`: `read` only

### Route-to-Module Mapping (Financial)

- [ ] `payments.route.ts` → `platform_billing` (SaaS payments)
- [ ] `stripe.route.ts` → `platform_billing` (Stripe SaaS integration)

### Developer Portal Sidebar — Billing

- [ ] Sidebar item: `Billing` at `/billing` — requires `platform_billing.read`

---

## 9. BUILD_RULES.md

### §16.1 — PII Encryption for Financial Fields

- [ ] `patients.insurance[].policyNumber` must be encrypted via `encryptField()`
- [ ] NEVER log encrypted field values
- [ ] NEVER return encrypted fields without decryption

### §16.2 — Input Validation (Three Layers)

- [ ] Layer 1: Frontend Zod validation (UX)
- [ ] Layer 2: Backend Zod validation (security) — `.strict()` required
- [ ] Layer 3: Mongoose schema (DB defense)
- [ ] NoSQL injection: block `$gt`, `$ne`, `$where` operators in input values

### §16.3 — Rate Limiting (applies to financial routes)

- [ ] Global: 100 req/min per IP
- [ ] Auth: 5 req/min per IP
- [ ] API Key: 1000 req/min per key

### §16.7 — Audit Logging

- [ ] Resource `'invoices'` in audit log schema
- [ ] Every data mutation MUST be logged

### §21.2 — Logging (Financial)

- [ ] `error` level for: "Payment processing failed"
- [ ] Redacted fields: `policyNumber` (never in logs)

### §23.4 — Webhook Event Catalog (Financial)

- [ ] `invoice.issued` — Financial category
- [ ] `invoice.paid` — Financial category
- [ ] `payment.received` — Financial category

### §23.5 — PII Redaction in Webhook Payloads

- [ ] `phone`: mask to first 3 + last 4 (e.g. `"+20***1234"`)
- [ ] `email`: mask to first char + `***` + domain (e.g. `"a***@gmail.com"`)
- [ ] `nationalId`: completely hidden → `"***"`

### API Naming Convention (applies to all financial routes)

- [ ] Pattern: `/api/{resource}` — plural, kebab-case
- [ ] Model Factory pattern with `Connection` parameter
- [ ] Service Layer: constructor receives `Connection`, methods receive `userId`
- [ ] Soft-delete: `isActive: boolean`
- [ ] Standard fields: `isActive`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

---

## 10. ADMIN_PORTAL_SCREENS.md

### §9 — Invoices Page

- [ ] **Invoice List Page (LTR + RTL wireframes)**
  - Columns: Invoice#, Patient, Amount, Paid, Status, Date
  - Filters: Search, Status dropdown, Date Range, Doctor dropdown, Export button
  - Summary row: Total, Paid, Outstanding
  - Status badges: ✅ Paid, 🟡 Partially Paid, 🔴 Unpaid

- [ ] **Invoice Detail / PDF Preview Page**
  - Clinic header (logo, name, address)
  - Patient info block
  - Line items table: Service, Tooth, Qty, Price, Total
  - Financial summary: Subtotal, VAT (X%), Total, Paid, Balance Due
  - Payment History table
  - Action buttons: **Record Payment**, **Installment Plan**, **Send Payment Link**

### §10 — Payments & Reconciliation Page

- [ ] **Stats Cards**: Total Billed, Collected, Outstanding, Transactions

- [ ] **Payments Tab**
  - Payment list columns: REF, Patient, Amount, Method, Status, Time
  - Method icons: 💵 Cash, 💳 Paymob, 🏦 Transfer

- [ ] **Daily Reconciliation Tab**
  - EOD summary by payment method
  - Expected vs Actual columns
  - Difference column with ⚠️ warning for mismatches
  - **"Mark Day as Reconciled"** button

### §12 — Reports Page

- [ ] **Report Categories**: Revenue Reports (5), Patient Reports (4), Operational Reports (3)
- [ ] **Selected Report layout**: Date range picker, Branch/Doctor filters, Apply/Save/Schedule buttons, 4 KPI cards, Chart area, Detail table
- [ ] **Monthly Revenue example**: Month, Revenue, Expenses, Net Profit columns with trend arrows

### §13 — Settings Page (Billing Tab)

- [ ] Locale settings: Language, Currency, Timezone, Date Format (changeable by Tenant Admin)
- [ ] Locked fields: Phone prefix, Tax Rate, Payment Provider (from `country_config`)

### Sidebar — Financial Section

| Menu Item    | Roles                                        |
| :----------- | :------------------------------------------- |
| Invoices     | `tenant_admin`, `accountant`                 |
| Payments     | `tenant_admin`, `accountant`, `receptionist` |
| Insurance    | `tenant_admin`, `accountant`                 |
| Installments | `tenant_admin`, `accountant`                 |
| Commissions  | `tenant_admin`                               |

---

## 11. PHASE_4_IMPLEMENTATION_PLAN.md

### Executive Summary (line 1)

- [ ] ~80% backend complete, ~9,400+ LOC existing
- [ ] ~3,000-5,000 LOC remaining

### What's Already Built (Implementation Progress Log)

| Module                          | Status      | ~LOC   | Details                                                                                                                     |
| :------------------------------ | :---------- | :----- | :-------------------------------------------------------------------------------------------------------------------------- |
| Invoices                        | ✅ COMPLETE | ~1,500 | model, service, tests, routes, schema, list page, detail page, PDF, hooks                                                   |
| Payments + Reconciliation       | ✅ COMPLETE | ~1,400 | both models, service, tests, routes, schema, pages, receipt PDF, hooks                                                      |
| Paymob + Stripe (SaaS)          | ✅ COMPLETE | ~650   | SaaS-level payment integration                                                                                              |
| Insurance Companies + Claims    | ✅ COMPLETE | ~870   | model (82L), service (176L), routes (135L), schema (125L), claim model (~155L), claim service (~260L), claim routes (~170L) |
| Installment Plans               | ✅ COMPLETE | ~620   | model (~145L), service (~265L), routes (~150L), schema (73L)                                                                |
| Doctor Commissions + Payouts    | ✅ COMPLETE | ~760   | commission model (~85L), payout model (~85L), service (~300L), routes (~170L), schema (~100L)                               |
| Report Pipelines (F1-F7, O1-O2) | ✅ COMPLETE | ~500   | report-pipeline.service.ts with Redis caching                                                                               |
| Reports UI Shell                | ⚠️ PARTIAL  | ~3,100 | model, routes, UI shell, export worker, scheduler worker (uses sample data)                                                 |

### 37 New Files to Create

#### Backend Models (5)

- [ ] `insurance-company.model.ts`
- [ ] `insurance-claim.model.ts`
- [ ] `installment-plan.model.ts`
- [ ] `doctor-commission.model.ts`
- [ ] `commission-payout.model.ts`

#### Backend Services (5)

- [ ] `insurance.service.ts`
- [ ] `insurance-claim.service.ts`
- [ ] `installment.service.ts`
- [ ] `commission.service.ts`
- [ ] `report-pipeline.service.ts`

#### Backend Routes (3)

- [ ] `insurance/` routes
- [ ] `installments/` routes
- [ ] `commissions/` routes

#### Backend Tests (4)

- [ ] `insurance.test.ts`
- [ ] `insurance-claim.test.ts`
- [ ] `installment.test.ts`
- [ ] `commission.test.ts`

#### Shared Schemas (3)

- [ ] `insurance.schema.ts`
- [ ] `installment.schema.ts`
- [ ] `commission.schema.ts`

#### Admin Frontend Pages (8)

- [ ] `InsuranceCompaniesPage.tsx`
- [ ] `InsuranceClaimsPage.tsx`
- [ ] `InsuranceClaimDetailPage.tsx`
- [ ] `InstallmentsPage.tsx`
- [ ] `InstallmentDetailPage.tsx`
- [ ] `CommissionsPage.tsx`
- [ ] `CommissionDetailPage.tsx`
- [ ] `ScheduledReportsPage.tsx`

#### Admin Frontend Hooks (5)

- [ ] `useInsuranceCompanies.ts`
- [ ] `useInsuranceClaims.ts`
- [ ] `useInstallments.ts`
- [ ] `useCommissions.ts`
- [ ] `useReportSchedules.ts`

#### Admin Frontend Components (4)

- [ ] `ClaimForm.tsx`
- [ ] `InstallmentPlanForm.tsx`
- [ ] `PayoutForm.tsx`
- [ ] `DateRangePicker.tsx`

#### PDF Templates (3) — NOT STARTED

- [ ] `PrescriptionPDF.tsx`
- [ ] `TreatmentPlanPDF.tsx`
- [ ] `ReportPDF.tsx`

### 8 Existing Files to Update

- [ ] `server.ts` — register new route plugins
- [ ] `schemas/index.ts` — export new schemas
- [ ] `types/index.ts` — export new types
- [ ] `router.tsx` — add new admin routes
- [ ] `sidebar-config.ts` — add Financial section items
- [ ] `report-export.service.ts` — wire real export
- [ ] `report-scheduler.service.ts` — wire real cron
- [ ] `useReports.ts` — connect to real data

### Day-by-Day Plan — Remaining Work

| Day | Task                                                          | Status      |
| :-: | :------------------------------------------------------------ | :---------- |
|  1  | Insurance Companies: model, service, routes, schema           | ✅ DONE     |
|  2  | Insurance Claims: model, service, routes                      | ✅ DONE     |
|  3  | Admin UI: Insurance Companies + Claims pages                  | ❌ NOT DONE |
|  4  | Installment Plans: model, service, routes, schema             | ✅ DONE     |
|  5  | Admin UI: Installments pages + Tests                          | ❌ NOT DONE |
|  6  | Doctor Commissions + Payouts: models, service, routes, schema | ✅ DONE     |
|  7  | Admin UI: Commissions + Payouts pages                         | ❌ NOT DONE |
|  8  | Financial Report Pipelines: F1-F7 + O1-O2 with Redis cache    | ✅ DONE     |
|  9  | Report UI: real data integration + Charts                     | ❌ NOT DONE |
| 10  | Report Export: real PDF/CSV/Excel generation                  | ❌ NOT DONE |
| 11  | Report Scheduling: wire real cron + email delivery            | ❌ NOT DONE |
| 12  | PDF Templates: Prescription, Treatment Plan, Report           | ❌ NOT DONE |
| 13  | Bulk Notifications: endpoint + UI                             | ❌ NOT DONE |
| 14  | Invoice Overdue Cron Worker + Integration Testing             | ❌ NOT DONE |
| 15  | Sidebar updates, Module Gating, Final Polish                  | ❌ NOT DONE |

### Risk & Rollback Priority

| Priority | Component           | Risk Level | Status                               |
| :------- | :------------------ | :--------- | :----------------------------------- |
| 1        | Invoices + Payments | —          | ✅ COMPLETE                          |
| 2        | Financial Reports   | HIGH       | ⚠️ Pipelines done, UI/Export pending |
| 3        | Commissions         | HIGH       | ⚠️ Backend done, UI pending          |
| 4        | Installments        | MEDIUM     | ⚠️ Backend done, UI pending          |
| 5        | Insurance Claims    | MEDIUM     | ⚠️ Backend done, UI pending          |
| 6        | Report Scheduling   | LOW        | ❌ NOT STARTED (real cron)           |
| 7        | Bulk Notifications  | LOW        | ❌ NOT STARTED                       |
| 8        | Remaining PDFs      | LOW        | ❌ NOT STARTED                       |

### M4 Gate Criteria

- [ ] Invoice → Payment → Insurance full flow working end-to-end
- [ ] Payment Webhook HMAC verified
- [ ] Real report data (not sample data)
- [ ] Zod `.strict()` on all financial endpoints
- [ ] RBAC guards on all financial routes
- [ ] ≥ 65% test coverage

### Security Checklist (Phase 4 Specific — 10 Items)

- [ ] `patients.insurance[].policyNumber` encrypted with AES-256-GCM
- [ ] Insurance claim documents: PDF only, 10MB max
- [ ] Zod `.strict()` on every financial schema
- [ ] `authGuard` + `tenantDb` + `roleGuard` on every route
- [ ] No card data stored (PCI DSS via Provider)
- [ ] Audit logging on all financial mutations
- [ ] Rate limiting on all financial endpoints
- [ ] Webhook HMAC-SHA256 verification
- [ ] RTL support on all financial pages
- [ ] RBAC permissions on report access

### Sidebar Configuration — Financial Section

```
📊 Financial
  ├── Invoices (billing-invoicing module)
  ├── Payments (billing-invoicing module)
  ├── Reconciliation (billing-invoicing module)
  ├── Insurance Companies (insurance-claims module 🔒)
  ├── Insurance Claims (insurance-claims module 🔒)
  ├── Installments (enableInstallments toggle)
  └── Commissions (enableCommissions toggle)

📈 Reports
  ├── Dashboard (Free)
  ├── Reports Hub (Free)
  ├── Financial Reports (Advanced 🔒)
  ├── Operational Reports (Advanced 🔒)
  └── Scheduled Reports (Advanced 🔒)
```

### Dependency Graph

```
Treatment Plan → Invoice → Payment → Reconciliation
                  ↓
              Insurance Claim → Insurance Company
                  ↓
              Installment Plan
                  ↓
              Doctor Commission → Commission Payout
                  ↓
              Financial Reports (F1-F7, O1-O2)
                  ↓
              Report Scheduling → Export (PDF/CSV/Excel)
```

---

## 12. Implementation Status Summary

### Overall Progress: ~60% Complete

| Category                        | Backend  | Frontend | Tests |
| :------------------------------ | :------- | :------- | :---- |
| Invoices                        | ✅       | ✅       | ✅    |
| Payments                        | ✅       | ✅       | ✅    |
| Reconciliation                  | ✅       | ✅       | ✅    |
| Paymob/Stripe (SaaS)            | ✅       | ✅       | ✅    |
| Insurance Companies             | ✅       | ❌       | ❌    |
| Insurance Claims                | ✅       | ❌       | ❌    |
| Installment Plans               | ✅       | ❌       | ❌    |
| Doctor Commissions              | ✅       | ❌       | ❌    |
| Commission Payouts              | ✅       | ❌       | ❌    |
| Report Pipelines (F1-F7, O1-O2) | ✅       | ❌       | ❌    |
| Report UI (real data)           | ⚠️ Shell | ❌       | ❌    |
| Report Export (real)            | ❌       | ❌       | ❌    |
| Report Scheduling (real cron)   | ❌       | ❌       | ❌    |
| Prescription PDF                | ❌       | ❌       | —     |
| Treatment Plan PDF              | ❌       | ❌       | —     |
| Report PDF                      | ❌       | ❌       | —     |
| Bulk Notifications              | ❌       | ❌       | ❌    |
| Invoice Overdue Cron            | ❌       | —        | ❌    |
| Sidebar + Module Gating         | —        | ❌       | —     |

### Remaining Work Summary

- **Admin UI Pages** (Days 3, 5, 7): Insurance, Installments, Commissions pages
- **Report Integration** (Days 9-11): Real data in reports, real export, real scheduling cron
- **PDF Templates** (Day 12): 3 remaining templates (Prescription, Treatment Plan, Report)
- **Notifications** (Day 13): Bulk notification endpoint + UI
- **Cron + Testing** (Day 14): Invoice overdue worker + integration tests
- **Polish** (Day 15): Sidebar config, module gating, final QA

---

> **Total Unique Requirements Extracted:** ~280+ checkbox items across 11 documents
> **Collections Involved:** invoices, payments, doctor_commissions, commission_payouts, installment_plans, insurance_companies, insurance_claims, reconciliation, report_schedules, alert_rules, saas_payments, settings (billing key)
> **Status Values Tracked:** 7 invoice statuses, 4 payment statuses, 4 commission statuses, 4 installment plan statuses, 4 installment payment statuses, 6 insurance claim statuses, 3 reconciliation statuses
