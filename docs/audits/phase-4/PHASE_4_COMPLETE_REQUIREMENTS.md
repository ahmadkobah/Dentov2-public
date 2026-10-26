# Phase 4 — Financial Module: Complete Requirements Extraction

> **Phase:** 4 (Weeks 14–16)
> **Theme:** Financial — Invoices, Payments, Insurance, Installments, Commissions, Reports
> **Sources:** All 9 planning documents in `docs/planning/` + `docs/Screens/ADMIN_PORTAL_SCREENS.md`
> **Extracted:** 2026-06-25

---

## Table of Contents

1. [Database Collections & Fields](#1-database-collections--fields)
2. [API Endpoints](#2-api-endpoints)
3. [Services & Business Logic](#3-services--business-logic)
4. [Frontend Pages & Components](#4-frontend-pages--components)
5. [Schemas (Zod — Shared)](#5-schemas-zod--shared)
6. [Security Requirements](#6-security-requirements)
7. [RBAC Permissions](#7-rbac-permissions)
8. [PDF Templates](#8-pdf-templates)
9. [Payment Gateway Integration](#9-payment-gateway-integration)
10. [Testing Requirements](#10-testing-requirements)
11. [Build Rules](#11-build-rules)
12. [Report Types](#12-report-types)

---

## 1. Database Collections & Fields

### 1.1 `invoices` (Tenant DB)

> Source: V2_DATABASE §7.1, MASTER_PLAN §10 Module #8

| Field                   | Type                            | Notes                                                                                       |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `invoiceNumber`         | `string`                        | Auto-generated: `INV-{YYYY}-{5-digit}` (e.g. `INV-2026-00001`)                              |
| `patientId`             | `ObjectId` → `patients`         | Required                                                                                    |
| `branchId`              | `ObjectId` → `branches`         | Required                                                                                    |
| `appointmentId`         | `ObjectId` → `appointments`     | Optional link                                                                               |
| `treatmentPlanId`       | `ObjectId` → `treatment_plans`  | Optional — set when auto-generated from plan                                                |
| `items[]`               | Embedded array                  | Invoice line items (see below)                                                              |
| `items[].description`   | `string`                        | Line item description                                                                       |
| `items[].treatmentId`   | `ObjectId`                      | Optional link to treatment                                                                  |
| `items[].serviceId`     | `ObjectId` → `services`         | Optional link to service catalog                                                            |
| `items[].toothNumber`   | `string`                        | Optional — tooth reference                                                                  |
| `items[].quantity`      | `number`                        | Default: 1                                                                                  |
| `items[].unitPrice`     | `number`                        | Per-unit price                                                                              |
| `items[].discount`      | `number`                        | Per-item discount amount                                                                    |
| `items[].total`         | `number`                        | Computed: `(quantity × unitPrice) - discount`                                               |
| `subtotal`              | `number`                        | Sum of all item totals                                                                      |
| `discountAmount`        | `number`                        | Invoice-level discount                                                                      |
| `discountPercentage`    | `number`                        | Invoice-level discount %                                                                    |
| `taxAmount`             | `number`                        | Computed from taxPercentage                                                                 |
| `taxPercentage`         | `number`                        | From tenant `country_config.taxRate`                                                        |
| `totalAmount`           | `number`                        | `subtotal - discountAmount + taxAmount`                                                     |
| `amountPaid`            | `number`                        | Updated on each payment                                                                     |
| `balanceDue`            | `number`                        | `totalAmount - amountPaid`                                                                  |
| `status`                | `enum`                          | `draft` \| `issued` \| `paid` \| `partially_paid` \| `overdue` \| `cancelled` \| `refunded` |
| `issueDate`             | `Date`                          | When invoice was issued                                                                     |
| `dueDate`               | `Date`                          | Payment due date                                                                            |
| `paidAt`                | `Date`                          | When fully paid                                                                             |
| `notes`                 | `string`                        | Optional internal notes                                                                     |
| `terms`                 | `string`                        | Payment terms text                                                                          |
| `insuranceClaimId`      | `ObjectId` → `insurance_claims` | Link to insurance claim if applicable                                                       |
| `insuredAmount`         | `number`                        | Amount covered by insurance                                                                 |
| `patientResponsibility` | `number`                        | Amount the patient owes after insurance                                                     |
| `currency`              | `string`                        | Per-invoice currency override (§25)                                                         |
| `exchangeRate`          | `number`                        | Rate to base currency (for reporting)                                                       |
| `originalAmount`        | `number`                        | Amount in base currency                                                                     |
| `originalCurrency`      | `string`                        | Base currency code                                                                          |
| `createdBy`             | `ObjectId` → `users`            | Staff who created                                                                           |
| `createdAt`             | `Date`                          | Auto                                                                                        |
| `updatedAt`             | `Date`                          | Auto                                                                                        |

**Indexes:**

- `{ invoiceNumber: 1 }` — unique
- `{ patientId: 1, createdAt: -1 }`
- `{ status: 1, dueDate: 1 }`
- `{ branchId: 1, issueDate: -1 }`

---

### 1.2 `payments` (Tenant DB)

> Source: V2_DATABASE §7.2, MASTER_PLAN §10 Module #9

| Field              | Type                    | Notes                                                                                            |
| ------------------ | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `invoiceId`        | `ObjectId` → `invoices` | Required                                                                                         |
| `patientId`        | `ObjectId` → `patients` | Required                                                                                         |
| `amount`           | `number`                | Payment amount                                                                                   |
| `paymentMethod`    | `enum`                  | `cash` \| `card` \| `bank_transfer` \| `cheque` \| `insurance` \| `online` \| `fawry` \| `meeza` |
| `paymentReference` | `string`                | External reference number                                                                        |
| `status`           | `enum`                  | `pending` \| `completed` \| `failed` \| `refunded`                                               |
| `notes`            | `string`                | Optional                                                                                         |
| `receivedBy`       | `ObjectId` → `users`    | Staff who recorded                                                                               |
| `receivedAt`       | `Date`                  | When payment received                                                                            |
| `createdAt`        | `Date`                  | Auto                                                                                             |
| `updatedAt`        | `Date`                  | Auto                                                                                             |

**Indexes:**

- `{ invoiceId: 1 }`
- `{ patientId: 1, createdAt: -1 }`
- `{ receivedAt: -1 }`

---

### 1.3 `doctor_commissions` (Tenant DB)

> Source: V2_DATABASE §7.3, MASTER_PLAN §10 Module #22

| Field              | Type                              | Notes                                            |
| ------------------ | --------------------------------- | ------------------------------------------------ |
| `doctorId`         | `ObjectId` → `doctors`            | Required                                         |
| `appointmentId`    | `ObjectId` → `appointments`       | Link to appointment                              |
| `invoiceId`        | `ObjectId` → `invoices`           | Link to invoice                                  |
| `procedureName`    | `string`                          | Name of procedure performed                      |
| `procedureAmount`  | `number`                          | Total procedure charge                           |
| `commissionRate`   | `number`                          | Percentage or fixed rate                         |
| `commissionAmount` | `number`                          | Computed commission                              |
| `status`           | `enum`                            | `pending` \| `approved` \| `paid` \| `cancelled` |
| `paidAt`           | `Date`                            | When commission was paid                         |
| `payoutId`         | `ObjectId` → `commission_payouts` | Link to payout batch                             |
| `createdAt`        | `Date`                            | Auto                                             |
| `updatedAt`        | `Date`                            | Auto                                             |

**Valid Status Transitions:**

- `pending` → `approved` \| `cancelled`
- `approved` → `paid` \| `cancelled`

---

### 1.4 `commission_payouts` (Tenant DB)

> Source: V2_DATABASE §7.3

| Field           | Type                   | Notes                                            |
| --------------- | ---------------------- | ------------------------------------------------ |
| `doctorId`      | `ObjectId` → `doctors` | Required                                         |
| `payoutDate`    | `Date`                 | When payout was made                             |
| `periodStart`   | `Date`                 | Start of commission period                       |
| `periodEnd`     | `Date`                 | End of commission period                         |
| `totalAmount`   | `number`               | Sum of all commissions in payout                 |
| `paymentMethod` | `enum`                 | `cash` \| `bank_transfer` \| `cheque` \| `other` |
| `reference`     | `string`               | External payment reference                       |
| `createdBy`     | `ObjectId` → `users`   | Staff who initiated payout                       |
| `createdAt`     | `Date`                 | Auto                                             |

---

### 1.5 `installment_plans` (Tenant DB)

> Source: V2_DATABASE §7.4, MASTER_PLAN §10 Module #23

| Field                          | Type                    | Notes                                                 |
| ------------------------------ | ----------------------- | ----------------------------------------------------- |
| `invoiceId`                    | `ObjectId` → `invoices` | Required                                              |
| `patientId`                    | `ObjectId` → `patients` | Required                                              |
| `totalAmount`                  | `number`                | Total plan amount                                     |
| `downPayment`                  | `number`                | Initial payment                                       |
| `remainingAmount`              | `number`                | `totalAmount - downPayment`                           |
| `numberOfInstallments`         | `number`                | 1–24                                                  |
| `installmentAmount`            | `number`                | Per-installment amount                                |
| `frequency`                    | `enum`                  | `weekly` \| `biweekly` \| `monthly`                   |
| `startDate`                    | `Date`                  | First installment date                                |
| `status`                       | `enum`                  | `active` \| `completed` \| `defaulted` \| `cancelled` |
| `notes`                        | `string`                | Optional                                              |
| `payments[]`                   | Embedded array          | Installment payment records (see below)               |
| `payments[].installmentNumber` | `number`                | 1, 2, 3...                                            |
| `payments[].dueDate`           | `Date`                  | Expected payment date                                 |
| `payments[].amountDue`         | `number`                | Amount expected                                       |
| `payments[].amountPaid`        | `number`                | Actual amount paid                                    |
| `payments[].lateFee`           | `number`                | Late payment penalty                                  |
| `payments[].status`            | `enum`                  | `pending` \| `paid` \| `overdue` \| `waived`          |
| `payments[].paidAt`            | `Date`                  | When actually paid                                    |
| `payments[].paymentId`         | `ObjectId` → `payments` | Link to payment record                                |
| `createdAt`                    | `Date`                  | Auto                                                  |
| `updatedAt`                    | `Date`                  | Auto                                                  |

---

### 1.6 `insurance_companies` (Tenant DB)

> Source: V2_DATABASE §7.5, MASTER_PLAN §10 Module #14

| Field                | Type                         | Notes                      |
| -------------------- | ---------------------------- | -------------------------- |
| `name`               | `{ en: string, ar: string }` | Bilingual name             |
| `code`               | `string`                     | Unique company code        |
| `contactPerson`      | `string`                     | Optional                   |
| `phone`              | `string`                     | Optional                   |
| `email`              | `string`                     | Optional                   |
| `coveragePercentage` | `number`                     | Default coverage % (0–100) |
| `maxCoverage`        | `number`                     | Maximum coverage amount    |
| `isActive`           | `boolean`                    | Active flag                |
| `createdAt`          | `Date`                       | Auto                       |
| `updatedAt`          | `Date`                       | Auto                       |

---

### 1.7 `insurance_claims` (Tenant DB)

> Source: V2_DATABASE §7.5, MASTER_PLAN §10 Module #14

| Field                   | Type                    | Notes                                                                                     |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `claimNumber`           | `string`                | Auto-generated: `CLM-{YYYY}-{5-digit}`                                                    |
| `patientId`             | `ObjectId` → `patients` | Required                                                                                  |
| `patientInsuranceIndex` | `number`                | Index into `patients.insurance[]` array                                                   |
| `invoiceId`             | `ObjectId` → `invoices` | Required — linked invoice                                                                 |
| `claimDate`             | `Date`                  | When claim was filed                                                                      |
| `serviceDate`           | `Date`                  | Date services were rendered                                                               |
| `totalAmount`           | `number`                | Total invoice amount                                                                      |
| `claimedAmount`         | `number`                | Amount being claimed                                                                      |
| `approvedAmount`        | `number`                | Amount approved by insurer                                                                |
| `patientResponsibility` | `number`                | Amount patient must pay                                                                   |
| `status`                | `enum`                  | `submitted` \| `under_review` \| `approved` \| `partially_approved` \| `denied` \| `paid` |
| `denialReason`          | `string`                | If denied                                                                                 |
| `documents[]`           | `string[]`              | Uploaded document URLs                                                                    |
| `notes`                 | `string`                | Optional                                                                                  |
| `createdAt`             | `Date`                  | Auto                                                                                      |
| `updatedAt`             | `Date`                  | Auto                                                                                      |

**Valid Claim Status Transitions:**

- `submitted` → `under_review`
- `under_review` → `approved` \| `partially_approved` \| `denied`
- `approved` → `paid`
- `partially_approved` → `paid`

---

### 1.8 `reconciliation` (Tenant DB)

> Source: V2_DATABASE §7.6, V2_DECISION_LOG §24

| Field                | Type                    | Notes                            |
| -------------------- | ----------------------- | -------------------------------- |
| `branchId`           | `ObjectId` → `branches` | Required                         |
| `reconciliationDate` | `Date`                  | The business day                 |
| `openingBalance`     | `number`                | Start-of-day balance             |
| `closingBalance`     | `number`                | End-of-day balance               |
| `cashReceived`       | `number`                | Cash payments total              |
| `cardReceived`       | `number`                | Card payments total              |
| `onlineReceived`     | `number`                | Online payments total            |
| `insuranceReceived`  | `number`                | Insurance payments total         |
| `totalReceived`      | `number`                | Sum of all received              |
| `expenses`           | `number`                | Daily expenses                   |
| `discrepancy`        | `number`                | Expected vs actual difference    |
| `status`             | `enum`                  | `open` \| `closed` \| `reviewed` |
| `createdBy`          | `ObjectId` → `users`    | ⚠️ Decision Log §24 addition     |
| `closedBy`           | `ObjectId` → `users`    | ⚠️ Decision Log §24 addition     |
| `closedAt`           | `Date`                  | ⚠️ Decision Log §24 addition     |
| `reviewedBy`         | `ObjectId` → `users`    | Staff who reviewed               |
| `notes`              | `string`                | Optional                         |
| `createdAt`          | `Date`                  | Auto                             |
| `updatedAt`          | `Date`                  | Auto                             |

**Indexes:**

- `{ branchId: 1, reconciliationDate: 1 }` — unique compound

---

### 1.9 `patients.insurance[]` (Embedded in patients collection)

> Source: V2_DATABASE §7.5, SECURITY_AND_ENCRYPTION

| Field                | Type                               | Notes                        |
| -------------------- | ---------------------------------- | ---------------------------- |
| `insuranceCompanyId` | `ObjectId` → `insurance_companies` | Required                     |
| `policyNumber`       | `string`                           | 🔒 **AES-256-GCM encrypted** |
| `groupNumber`        | `string`                           | Optional                     |
| `memberId`           | `string`                           | Optional                     |
| `coverageType`       | `enum`                             | `individual` \| `family`     |
| `coveragePercentage` | `number`                           | 0–100                        |
| `maxCoverage`        | `number`                           | Maximum coverage amount      |
| `deductible`         | `number`                           | Deductible amount            |
| `deductibleMet`      | `number`                           | Deductible already met       |
| `effectiveDate`      | `Date`                             | Policy start                 |
| `expiryDate`         | `Date`                             | Policy expiry                |
| `isPrimary`          | `boolean`                          | Primary insurance flag       |
| `isActive`           | `boolean`                          | Active flag                  |

---

### 1.10 `patients.preferredCurrency` (Field addition to patients)

> Source: MASTER_PLAN §25

| Field               | Type     | Notes                                                         |
| ------------------- | -------- | ------------------------------------------------------------- |
| `preferredCurrency` | `string` | Patient's preferred currency for invoices (e.g. `USD`, `EGP`) |

---

### 1.11 `report_schedules` (Tenant DB)

> Source: MASTER_PLAN §21

| Field            | Type                   | Notes                                       |
| ---------------- | ---------------------- | ------------------------------------------- |
| `reportType`     | `string`               | One of the 36 report types                  |
| `reportParams`   | `object`               | `{ period, branchId, doctorId, dateRange }` |
| `frequency`      | `enum`                 | `daily` \| `weekly` \| `monthly`            |
| `dayOfWeek`      | `number`               | 0–6 (for weekly)                            |
| `dayOfMonth`     | `number`               | 1–31 (for monthly)                          |
| `time`           | `string`               | UTC time (e.g. `"08:00"`)                   |
| `deliveryMethod` | `enum`                 | `email` \| `in_app` \| `both`               |
| `recipients`     | `ObjectId[]` → `users` | In-app recipients                           |
| `emailAddresses` | `string[]`             | Email recipients                            |
| `format`         | `enum`                 | `pdf` \| `csv` \| `excel`                   |
| `name`           | `string`               | User-defined schedule name                  |
| `isActive`       | `boolean`              | Active flag                                 |
| `lastRunAt`      | `Date`                 | Last execution time                         |
| `nextRunAt`      | `Date`                 | Next scheduled time                         |
| `createdBy`      | `ObjectId` → `users`   | Creator                                     |
| `createdAt`      | `Date`                 | Auto                                        |
| `updatedAt`      | `Date`                 | Auto                                        |

---

### 1.12 `report_history` (Tenant DB)

> Source: MASTER_PLAN §21 (implied by BullMQ worker flow)

Stores generated report files and delivery results after scheduled runs.

---

### 1.13 `country_config` (Platform DB — Payload Collection)

> Source: MASTER_PLAN §25

| Field             | Type                         | Notes                                                        |
| ----------------- | ---------------------------- | ------------------------------------------------------------ |
| `code`            | `string`                     | ISO 3166-1 alpha-2 (e.g. `EG`, `SA`)                         |
| `name`            | `{ en: string, ar: string }` | Country name                                                 |
| `phoneCode`       | `string`                     | e.g. `+20`                                                   |
| `phoneMask`       | `string`                     | e.g. `### #### ####`                                         |
| `phoneLength`     | `number`                     | Expected phone length                                        |
| `defaultCurrency` | `string`                     | e.g. `EGP`                                                   |
| `defaultLanguage` | `string`                     | `en` \| `ar`                                                 |
| `direction`       | `string`                     | `ltr` \| `rtl`                                               |
| `taxRate`         | `number`                     | Default VAT % (EG: 14, SA: 15, AE: 5, TR: 20, KW: 0, GB: 20) |
| `taxLabel`        | `{ en: string, ar: string }` | e.g. `{ en: "VAT", ar: "ض.ق.م" }`                            |
| `dateFormat`      | `string`                     | e.g. `DD/MM/YYYY`                                            |
| `timeFormat`      | `string`                     | `12h` \| `24h`                                               |
| `numberFormat`    | `string`                     | Locale for number formatting                                 |
| `paymentProvider` | `enum`                       | `paymob` \| `stripe`                                         |
| `isActive`        | `boolean`                    | Active flag                                                  |
| `flag`            | `string`                     | Emoji flag                                                   |

**Pre-seeded Countries:** EG (Egypt), SA (Saudi Arabia), AE (UAE), TR (Turkey), KW (Kuwait), GB (United Kingdom)

---

### 1.14 Global `currencies` Configuration (Platform DB)

> Source: MASTER_PLAN §25

| Field                        | Type     | Notes                                                |
| ---------------------------- | -------- | ---------------------------------------------------- |
| `baseCurrency`               | `string` | `"USD"`                                              |
| `supportedCurrencies[]`      | Array    | 8 currencies: USD, EGP, EUR, GBP, SAR, AED, TRY, KWD |
| `supportedCurrencies[].code` | `string` | ISO 4217                                             |
| `supportedCurrencies[].rate` | `number` | Exchange rate to USD                                 |
| `lastRateUpdate`             | `Date`   | When rates were last updated                         |
| `rateProvider`               | `string` | Rate data source                                     |

---

### 1.15 Tenant Settings — Financial Fields (in `settings` collection)

> Source: settings.schema.ts (existing), MASTER_PLAN §25

| Field                       | Type                         | Notes                               |
| --------------------------- | ---------------------------- | ----------------------------------- |
| `invoicePrefix`             | `string`                     | Default: `"INV"`                    |
| `invoiceStartNumber`        | `number`                     | Default: `1`                        |
| `paymentMethods`            | `string[]`                   | Enabled methods for tenant          |
| `defaultPaymentTermDays`    | `number`                     | Default: `30`                       |
| `enableInstallments`        | `boolean`                    | Feature toggle                      |
| `enableInsurance`           | `boolean`                    | Feature toggle                      |
| `enableCommissions`         | `boolean`                    | Feature toggle                      |
| `country`                   | `string`                     | Tenant country code                 |
| `language`                  | `string`                     | `en` \| `ar`                        |
| `currency`                  | `string`                     | Tenant primary currency             |
| `timezone`                  | `string`                     | e.g. `Africa/Cairo`                 |
| `dateFormat`                | `string`                     | Display format                      |
| `timeFormat`                | `string`                     | `12h` \| `24h`                      |
| `direction`                 | `string`                     | `ltr` \| `rtl`                      |
| `billingCurrency`           | `string`                     | SaaS billing currency               |
| `paymentProvider`           | `enum`                       | `paymob` \| `stripe`                |
| `taxRate`                   | `number`                     | VAT percentage                      |
| `taxLabel`                  | `{ en: string, ar: string }` | VAT label                           |
| `clinicCurrency`            | `string`                     | Clinic-level default currency       |
| `clinicCurrencyOverridable` | `boolean`                    | Allow per-invoice currency override |

---

### 1.16 `saas_payments` (Platform DB — Extended)

> Source: MASTER_PLAN §29

| Field                   | Type     | Notes                                                                                         |
| ----------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `provider`              | `enum`   | `paymob` \| `stripe`                                                                          |
| `providerPaymentId`     | `string` | Paymob/Stripe payment ID                                                                      |
| `providerTransactionId` | `string` | Provider transaction ID                                                                       |
| `method`                | `string` | `card` \| `fawry` \| `wallet` \| `instapay` \| `valu` \| `meeza` \| `sepa` \| `bank_transfer` |
| `methodDetails`         | `object` | Provider-specific metadata                                                                    |
| `providerFee`           | `number` | Gateway fee amount                                                                            |
| `netAmount`             | `number` | Amount after fees                                                                             |
| `amountUSD`             | `number` | Normalized to USD for reporting                                                               |

---

## 2. API Endpoints

### 2.1 Invoice Endpoints

> Source: IMPLEMENTATION_ROADMAP Week 14, V2_STRUCTURE, ADMIN_PORTAL_SCREENS

| Method   | Path                               | Description                               | Auth                    |
| -------- | ---------------------------------- | ----------------------------------------- | ----------------------- |
| `GET`    | `/api/invoices`                    | List invoices (paginated, filterable)     | JWT + `invoices.read`   |
| `GET`    | `/api/invoices/:id`                | Get single invoice with items & payments  | JWT + `invoices.read`   |
| `POST`   | `/api/invoices`                    | Create new invoice                        | JWT + `invoices.create` |
| `PUT`    | `/api/invoices/:id`                | Update invoice (draft/issued only)        | JWT + `invoices.update` |
| `DELETE` | `/api/invoices/:id`                | Delete invoice (draft only)               | JWT + `invoices.delete` |
| `POST`   | `/api/invoices/generate-from-plan` | Auto-generate invoice from treatment plan | JWT + `invoices.create` |
| `POST`   | `/api/invoices/:id/issue`          | Transition: draft → issued                | JWT + `invoices.update` |
| `POST`   | `/api/invoices/:id/cancel`         | Cancel invoice                            | JWT + `invoices.update` |
| `GET`    | `/api/invoices/:id/pdf`            | Generate & stream invoice PDF             | JWT + `invoices.read`   |
| `POST`   | `/api/invoices/:id/email`          | Email invoice PDF to patient              | JWT + `invoices.update` |
| `POST`   | `/api/invoices/:id/payment-link`   | Send online payment link                  | JWT + `invoices.update` |

---

### 2.2 Payment Endpoints

> Source: IMPLEMENTATION_ROADMAP Week 14, V2_STRUCTURE

| Method | Path                        | Description                             | Auth                    |
| ------ | --------------------------- | --------------------------------------- | ----------------------- |
| `GET`  | `/api/payments`             | List payments (paginated, filterable)   | JWT + `payments.read`   |
| `GET`  | `/api/payments/:id`         | Get single payment                      | JWT + `payments.read`   |
| `POST` | `/api/payments`             | Record manual payment (cash/card/etc.)  | JWT + `payments.create` |
| `POST` | `/api/payments/:id/refund`  | Refund a payment                        | JWT + `payments.refund` |
| `POST` | `/api/payments/online`      | Initiate online payment (Paymob/Stripe) | JWT + `payments.create` |
| `GET`  | `/api/payments/:id/receipt` | Generate payment receipt PDF            | JWT + `payments.read`   |

---

### 2.3 Reconciliation Endpoints

> Source: V2_DATABASE §7.6, ADMIN_PORTAL_SCREENS

| Method | Path                             | Description                             | Auth                          |
| ------ | -------------------------------- | --------------------------------------- | ----------------------------- |
| `GET`  | `/api/reconciliation`            | List reconciliation records             | JWT + `reconciliation.read`   |
| `GET`  | `/api/reconciliation/:id`        | Get single reconciliation               | JWT + `reconciliation.read`   |
| `POST` | `/api/reconciliation`            | Create/open day reconciliation          | JWT + `reconciliation.create` |
| `PUT`  | `/api/reconciliation/:id`        | Update (close day, add expenses, notes) | JWT + `reconciliation.update` |
| `POST` | `/api/reconciliation/:id/close`  | Mark day as reconciled                  | JWT + `reconciliation.close`  |
| `POST` | `/api/reconciliation/:id/review` | Review reconciliation                   | JWT + `reconciliation.review` |

---

### 2.4 Insurance Endpoints

> Source: IMPLEMENTATION_ROADMAP Week 15, V2_STRUCTURE

| Method   | Path                               | Description                                  | Auth                     |
| -------- | ---------------------------------- | -------------------------------------------- | ------------------------ |
| `GET`    | `/api/insurance/companies`         | List insurance companies                     | JWT + `insurance.read`   |
| `GET`    | `/api/insurance/companies/:id`     | Get single company                           | JWT + `insurance.read`   |
| `POST`   | `/api/insurance/companies`         | Create insurance company                     | JWT + `insurance.create` |
| `PUT`    | `/api/insurance/companies/:id`     | Update insurance company                     | JWT + `insurance.update` |
| `DELETE` | `/api/insurance/companies/:id`     | Delete insurance company                     | JWT + `insurance.delete` |
| `GET`    | `/api/insurance/claims`            | List claims (paginated, filterable)          | JWT + `insurance.read`   |
| `GET`    | `/api/insurance/claims/:id`        | Get single claim                             | JWT + `insurance.read`   |
| `POST`   | `/api/insurance/claims`            | Create insurance claim (linked to invoice)   | JWT + `insurance.create` |
| `PUT`    | `/api/insurance/claims/:id/status` | Update claim status (transition)             | JWT + `insurance.update` |
| `GET`    | `/api/insurance/claims/aging`      | Claim aging report ($bucket 0-30-60-90-120+) | JWT + `insurance.read`   |

---

### 2.5 Installment Endpoints

> Source: IMPLEMENTATION_ROADMAP Week 15, V2_STRUCTURE

| Method | Path                                  | Description                           | Auth                        |
| ------ | ------------------------------------- | ------------------------------------- | --------------------------- |
| `GET`  | `/api/installments`                   | List installment plans                | JWT + `installments.read`   |
| `GET`  | `/api/installments/:id`               | Get single plan with payment schedule | JWT + `installments.read`   |
| `POST` | `/api/installments`                   | Create installment plan for invoice   | JWT + `installments.create` |
| `PUT`  | `/api/installments/:id`               | Update plan (cancel, notes)           | JWT + `installments.update` |
| `POST` | `/api/installments/:id/payments/:num` | Record installment payment            | JWT + `installments.update` |

---

### 2.6 Commission Endpoints

> Source: IMPLEMENTATION_ROADMAP Week 16, V2_STRUCTURE

| Method | Path                           | Description                                         | Auth                        |
| ------ | ------------------------------ | --------------------------------------------------- | --------------------------- |
| `GET`  | `/api/commissions`             | List commissions (paginated, by doctor/status/date) | JWT + `commissions.read`    |
| `GET`  | `/api/commissions/summary`     | Commission summary by doctor/period                 | JWT + `commissions.read`    |
| `POST` | `/api/commissions/approve`     | Bulk approve commissions (array of IDs)             | JWT + `commissions.approve` |
| `POST` | `/api/commissions/payouts`     | Create payout batch for doctor                      | JWT + `commissions.payout`  |
| `GET`  | `/api/commissions/payouts`     | List payouts                                        | JWT + `commissions.read`    |
| `GET`  | `/api/commissions/payouts/:id` | Get payout detail                                   | JWT + `commissions.read`    |

---

### 2.7 Report Endpoints (16 endpoints)

> Source: MASTER_PLAN §21

| Method   | Path                              | Description                                         | Auth                             |
| -------- | --------------------------------- | --------------------------------------------------- | -------------------------------- |
| `GET`    | `/api/dashboard/stats`            | Dashboard stats (today overview, revenue, patients) | JWT + `reports.dashboard.view`   |
| `GET`    | `/api/dashboard/trends`           | Dashboard trend data (sparklines, 7-day)            | JWT + `reports.dashboard.view`   |
| `GET`    | `/api/reports/financial/:type`    | Financial report by type (F1–F7)                    | JWT + `reports.financial.view`   |
| `GET`    | `/api/reports/patients/:type`     | Patient report (P1–P5)                              | JWT + `reports.basic.view`       |
| `GET`    | `/api/reports/appointments/:type` | Appointment report (A1–A6)                          | JWT + `reports.basic.view`       |
| `GET`    | `/api/reports/clinical/:type`     | Clinical report (C1–C4)                             | JWT + `reports.basic.view`       |
| `GET`    | `/api/reports/operational/:type`  | Operational report (O1–O4)                          | JWT + `reports.basic.view`       |
| `POST`   | `/api/reports/export`             | Export any report to CSV/Excel/PDF                  | JWT + `reports.export`           |
| `GET`    | `/api/reports/saved`              | List saved/bookmarked reports                       | JWT + `reports.saved.manage`     |
| `POST`   | `/api/reports/saved`              | Save a report configuration                         | JWT + `reports.saved.manage`     |
| `DELETE` | `/api/reports/saved/:id`          | Delete saved report                                 | JWT + `reports.saved.manage`     |
| `GET`    | `/api/reports/scheduled`          | List scheduled reports                              | JWT + `reports.schedules.manage` |
| `POST`   | `/api/reports/scheduled`          | Create report schedule                              | JWT + `reports.schedules.manage` |
| `PATCH`  | `/api/reports/scheduled/:id`      | Update report schedule                              | JWT + `reports.schedules.manage` |
| `DELETE` | `/api/reports/scheduled/:id`      | Delete report schedule                              | JWT + `reports.schedules.manage` |
| `POST`   | `/api/reports/scheduled/:id/run`  | Manually run a scheduled report                     | JWT + `reports.schedules.manage` |

**All report endpoints accept query params:** `from`, `to`, `branchId`, `doctorId`, `format` (`json` | `csv` | `excel` | `pdf`)

---

### 2.8 Payment Gateway Webhook Endpoints

> Source: MASTER_PLAN §29, SECURITY_AND_ENCRYPTION

| Method | Path                           | Description                 | Auth                          |
| ------ | ------------------------------ | --------------------------- | ----------------------------- |
| `POST` | `/api/payments/paymob/webhook` | Paymob transaction callback | HMAC verification             |
| `POST` | `/api/payments/stripe/webhook` | Stripe webhook              | Stripe signature verification |

---

### 2.9 Financial Report Types

> Source: MASTER_PLAN §21

**7 Financial Reports:**
| Code | Name | Module Tier |
|---|---|---|
| F1 | Revenue Summary | Free (current month), Advanced (historical + chart) |
| F2 | Revenue by Doctor | Advanced |
| F3 | Revenue by Service | Advanced |
| F4 | Revenue by Branch | Advanced |
| F5 | Payment Collection | Advanced |
| F6 | Outstanding Invoices Aging | Advanced (buckets: 0-30, 31-60, 61-90, 90+) |
| F7 | Tax Report | Advanced |

**4 Operational Reports (Financial-Adjacent):**
| Code | Name | Module Tier |
|---|---|---|
| O1 | Commission Summary | Advanced |
| O2 | Daily Reconciliation | Advanced |
| O3 | Wait Time Analysis | Advanced |
| O4 | Staff Productivity | Advanced |

---

## 3. Services & Business Logic

### 3.1 Invoice Service (`invoices.service.ts`)

> Source: IMPLEMENTATION_ROADMAP Week 14, MASTER_PLAN §10, §15, §25

- **CRUD Operations:** Create, Read, Update, Delete invoices
- **Auto-Number Generation:** Sequential `INV-{YYYY}-{5-digit}` based on tenant `settings.invoicePrefix` + `settings.invoiceStartNumber`
- **Status Transitions:** Enforce valid transitions only:
  - `draft` → `issued` \| `cancelled`
  - `issued` → `paid` \| `partially_paid` \| `overdue` \| `cancelled`
  - `partially_paid` → `paid` \| `overdue` \| `cancelled`
  - `overdue` → `paid` \| `partially_paid` \| `cancelled`
  - `paid` → `refunded`
- **Generate from Treatment Plan:** Takes `treatmentPlanId`, maps each treatment plan item to invoice line item, applies service catalog prices, auto-populates patient/branch
- **Currency Override Logic** (§25):
  1. Check patient `preferredCurrency`
  2. Fall back to tenant `clinicCurrency`
  3. Allow manual override dropdown (8 supported currencies)
  4. Store `exchangeRate`, `originalAmount`, `originalCurrency` for unified reporting
- **Payment Tracking:** On each payment, update `amountPaid`, recalculate `balanceDue`, auto-transition status to `paid` or `partially_paid`
- **Insurance Integration:** When claim is linked, update `insuredAmount` and `patientResponsibility`
- **PDF Generation:** Render invoice PDF via `@react-pdf/renderer` (see §8)
- **Email Invoice:** Generate PDF → attach → send via Resend (email.service.ts)
- **Payment Link:** Generate unique payment link for online payment → send via email/SMS

### 3.2 Payment Service (`payments.service.ts`)

> Source: IMPLEMENTATION_ROADMAP Week 14, MASTER_PLAN §29

- **Record Payment:** Create payment record, update parent invoice `amountPaid` and `balanceDue`
- **Online Payment Flow:**
  1. Create payment intent via gateway (Paymob or Stripe — auto-selected by tenant country)
  2. Return payment URL/iframe for frontend
  3. Handle webhook callback to confirm payment status
- **Refund:** Mark payment as refunded, reverse invoice amounts, create refund via gateway if online
- **Payment Receipt PDF:** Generate via `@react-pdf/renderer`
- **Reconciliation Service:** Auto-calculate daily totals by method, detect discrepancies between expected and actual

### 3.3 Insurance Service (`insurance.service.ts`)

> Source: IMPLEMENTATION_ROADMAP Week 15

- **Company CRUD:** Standard CRUD for insurance companies
- **Patient Insurance Management:** Add/update/remove insurance entries in `patients.insurance[]` embedded array
- **Claim Creation:** Auto-populate from invoice, calculate `claimedAmount` based on `coveragePercentage`
- **Claim Status Flow:** Enforce 6-status transition chain:
  - `submitted` → `under_review` → `approved` | `partially_approved` | `denied` → `paid`
- **Coverage Calculation:** When claim approved, update invoice `insuredAmount` and `patientResponsibility`
- **Claim Aging Query:** MongoDB `$bucket` aggregation: 0–30, 31–60, 61–90, 91–120, 120+ days
- **Policy Number Encryption:** All `policyNumber` values stored/retrieved with AES-256-GCM encryption

### 3.4 Installment Service (`installments.service.ts`)

> Source: IMPLEMENTATION_ROADMAP Week 15

- **Create Plan:** Calculate installment schedule from `totalAmount`, `downPayment`, `numberOfInstallments`, `frequency`, `startDate`
- **Auto-Generate Payment Schedule:** Populate `payments[]` embedded array with calculated `dueDate` and `amountDue` for each installment
- **Record Installment Payment:** Update specific installment payment entry, create corresponding `payments` record, update parent invoice
- **Auto-Reminder:** BullMQ job checks upcoming installment due dates → sends notification (email/SMS/push) — configured via `reminder.worker.ts`
- **Overdue Detection:** Cron job marks past-due installments as `overdue`, optionally transitions plan to `defaulted` after N missed payments

### 3.5 Commission Service (`commissions.service.ts`)

> Source: IMPLEMENTATION_ROADMAP Week 16

- **Auto-Calculate on Invoice Paid:** When an invoice is paid, for each procedure/service:
  - Look up doctor's commission configuration (percentage or fixed per service)
  - Create `doctor_commissions` record with calculated `commissionAmount`
- **Bulk Approve:** Accept array of commission IDs → transition all from `pending` → `approved`
- **Create Payout:** Group approved commissions by doctor + period → create `commission_payouts` record → mark commissions as `paid`
- **Commission Summary:** Aggregate by doctor, by period, by status

### 3.6 Report Service & Aggregation Pipelines

> Source: MASTER_PLAN §21, V2_DECISION_LOG

**MongoDB Aggregation Pipelines** (in `routes/reports/pipelines/`):

| Pipeline File                      | Report                  | Key Stages                                                            |
| ---------------------------------- | ----------------------- | --------------------------------------------------------------------- |
| `revenue.pipeline.ts`              | F1 Revenue Summary      | `$match` (date range, branch) → `$group` by month → `$project` totals |
| `revenue-by-doctor.pipeline.ts`    | F2 Revenue by Doctor    | Join invoices → doctors → `$group` by doctorId                        |
| `revenue-by-service.pipeline.ts`   | F3 Revenue by Service   | Unwind invoice items → `$group` by serviceId                          |
| `revenue-by-branch.pipeline.ts`    | F4 Revenue by Branch    | `$group` by branchId                                                  |
| `payment-collection.pipeline.ts`   | F5 Payment Collection   | `$group` by paymentMethod                                             |
| `outstanding-aging.pipeline.ts`    | F6 Outstanding Invoices | `$bucket` (0-30, 31-60, 61-90, 90+ days)                              |
| `tax-report.pipeline.ts`           | F7 Tax Report           | Sum `taxAmount` by period                                             |
| `commission-summary.pipeline.ts`   | O1 Commission Summary   | `$group` by doctorId + status                                         |
| `reconciliation-daily.pipeline.ts` | O2 Daily Reconciliation | Reconciliation records by branch                                      |
| `insurance-aging.pipeline.ts`      | Insurance Claim Aging   | `$bucket` (0-30-60-90-120+ days from Decision Log)                    |

### 3.7 Report Scheduling (BullMQ)

> Source: MASTER_PLAN §21

- **Worker:** `report.worker.ts` — processes `report-generation` queue
- **Cron:** Daily at 00:05 UTC → scan `report_schedules` for due reports
- **Flow:**
  1. Find schedules where `nextRunAt <= now` and `isActive = true`
  2. Run the corresponding aggregation pipeline with stored params
  3. Generate output in configured `format` (PDF via `@react-pdf/renderer`, CSV via `@fast-csv/format`, Excel via `exceljs`)
  4. Upload to S3/R2
  5. Deliver via Email (Resend) and/or In-App notification
  6. Update `lastRunAt`, calculate `nextRunAt`
  7. Log in `report_history`

### 3.8 Export Service

> Source: MASTER_PLAN §21

- **Endpoint:** `POST /api/reports/export`
- **Flow:** Run same aggregation pipeline → switch on format:
  - **CSV:** `@fast-csv/format` → stream response
  - **Excel:** `exceljs` (multi-sheet support) → stream response
  - **PDF:** `@react-pdf/renderer` → stream response
- **All report endpoints** accept `format` query param for inline export

### 3.9 Webhook Events (Financial)

> Source: V2_DECISION_LOG, webhook.types.ts

| Event                      | Payload                                | Notes                           |
| -------------------------- | -------------------------------------- | ------------------------------- |
| `invoice.created`          | Full invoice object                    | Triggered on create             |
| `invoice.issued`           | Full invoice object                    | When draft → issued             |
| `invoice.paid`             | `{ invoiceId, paidAt, paymentMethod }` | Minimal payload                 |
| `invoice.overdue`          | Invoice summary                        | When status → overdue           |
| `payment.received`         | Full payment object                    | On payment creation             |
| `report.generated`         | Report metadata                        | When scheduled report completes |
| `report.generation_failed` | Error details                          | When report generation fails    |
| `report.exported`          | Export metadata                        | When manual export completes    |
| `report.schedule.created`  | Schedule details                       | On schedule creation            |
| `report.schedule.deleted`  | Schedule ID                            | On schedule deletion            |

**PII Redaction:** Phone/email masked, nationalId hidden in webhook payloads.

---

## 4. Frontend Pages & Components

### 4.1 Invoice Feature (`features/invoices/`)

> Source: V2_STRUCTURE Module #8, ADMIN_PORTAL_SCREENS

**Pages:**
| Page | Route | Description |
|---|---|---|
| `InvoiceListPage.tsx` | `/admin/invoices` | Table with search, status filter, date range, doctor filter, export button. Summary row: Total / Paid / Outstanding. LTR + RTL wireframes. |
| `InvoiceDetailPage.tsx` | `/admin/invoices/:id` | Full invoice view with PDF preview. Sections: ClinicHeader, Bill To, Line Items Table (#, Service, Qty, Unit Price, Total), Subtotal/VAT/Total/Paid/Balance Due, Payment History. Actions: 📄 PDF, 📧 Email, 🖨 Print, 💳 Record Payment, 📅 Installment Plan, 🔗 Send Payment Link |

**Components:**
| Component | Description |
|---|---|
| `InvoiceForm.tsx` | Create/edit form with patient select, branch select, line items editor, dates, currency dropdown |
| `InvoiceLineItems.tsx` | Dynamic line items table: add rows, service autocomplete, auto-calculate totals |
| `InvoicePDF.tsx` | `@react-pdf/renderer` component for PDF preview & download |

**Hooks:**
| Hook | Description |
|---|---|
| `useInvoices.ts` | TanStack Query: list, get, create, update, delete, generate-from-plan |

---

### 4.2 Payment Feature (`features/payments/`)

> Source: V2_STRUCTURE Module #9, ADMIN_PORTAL_SCREENS

**Pages:**
| Page | Route | Description |
|---|---|---|
| `PaymentsPage.tsx` | `/admin/payments` | Two tabs: Payments List + Daily Reconciliation. 4 summary cards: Total Billed, Collected, Outstanding, Transactions. Payment list with Method badges (colored chips). Reconciliation tab: EOD summary with expected vs actual, discrepancy highlight, "Mark Day as Reconciled" button. |

**Components:**
| Component | Description |
|---|---|
| `PaymentForm.tsx` | Record manual payment: amount, method dropdown, reference, notes |
| `OnlinePayment.tsx` | Paymob/Stripe integration — iframe/redirect flow |
| `PaymentReceipt.tsx` | PDF receipt generation & preview |

**Hooks:**
| Hook | Description |
|---|---|
| `usePayments.ts` | TanStack Query: list, get, create, refund, online payment |

---

### 4.3 Insurance Feature (`features/insurance/`)

> Source: V2_STRUCTURE Module #14, ADMIN_PORTAL_SCREENS

**Pages:**
| Page | Route | Description |
|---|---|---|
| `InsurancePage.tsx` | `/admin/insurance` | Two sections: Insurance Companies list + Claims list/management |

**Components:**
| Component | Description |
|---|---|
| `ClaimForm.tsx` | Create claim: select patient → insurance → invoice, auto-calculate coverage |
| `CompanyList.tsx` | CRUD table for insurance companies |
| `PatientInsurance.tsx` | In Patient Detail → Insurance tab: add/edit patient insurance entries |

**Hooks:**
| Hook | Description |
|---|---|
| `useInsurance.ts` | TanStack Query: companies CRUD, claims CRUD, claim status update, aging query |

---

### 4.4 Installments Feature (`features/installments/`)

> Source: V2_STRUCTURE Module #23

**Pages:**
| Page | Route | Description |
|---|---|---|
| `InstallmentsPage.tsx` | `/admin/installments` | List of installment plans with status, patient, invoice link, progress bar |

**Components:**
| Component | Description |
|---|---|
| `InstallmentPlanForm.tsx` | Create plan: select invoice, down payment, number of installments, frequency, start date |

**Hooks:**
| Hook | Description |
|---|---|
| `useInstallments.ts` | TanStack Query: list, get, create, record payment |

---

### 4.5 Commissions Feature (`features/commissions/`)

> Source: V2_STRUCTURE Module #22, ADMIN_PORTAL_SCREENS

**Pages:**
| Page | Route | Description |
|---|---|---|
| `CommissionsPage.tsx` | `/admin/commissions` | Commission list by doctor, bulk approve, payout management |

**Components:**
| Component | Description |
|---|---|
| `CommissionConfig.tsx` | Configure commission rates per doctor/service (percentage or fixed) |
| `PayoutTable.tsx` | Payout history and creation |

**Hooks:**
| Hook | Description |
|---|---|
| `useCommissions.ts` | TanStack Query: list, summary, bulk approve, payouts |

---

### 4.6 Reports Feature (`features/reports/`)

> Source: V2_STRUCTURE Module #26, MASTER_PLAN §21, ADMIN_PORTAL_SCREENS

**Pages (9 total):**
| Page | Route | Description |
|---|---|---|
| `ReportsHub.tsx` | `/admin/reports` | Overview of all 36 reports, categorized cards |
| `FinancialReports.tsx` | `/admin/reports/financial/:type` | F1–F7 financial reports with charts |
| `PatientReports.tsx` | `/admin/reports/patients/:type` | P1–P5 patient reports |
| `AppointmentReports.tsx` | `/admin/reports/appointments/:type` | A1–A6 appointment reports |
| `ClinicalReports.tsx` | `/admin/reports/clinical/:type` | C1–C4 clinical reports |
| `OperationalReports.tsx` | `/admin/reports/operational/:type` | O1–O4 operational reports (incl. commission + reconciliation) |
| `InventoryReports.tsx` | `/admin/reports/inventory/:type` | Inventory reports |
| `SavedReports.tsx` | `/admin/reports/saved` | Saved/bookmarked report configurations |
| `ScheduledReports.tsx` | `/admin/reports/scheduled` | Manage scheduled report delivery |

**Components:**
| Component | Description |
|---|---|
| `ReportCard.tsx` | Report category card with icon, title, description |
| `ChartWrapper.tsx` | Recharts 2.x wrapper (responsive, composable, RTL-compatible) |
| `DateRangePicker.tsx` | Date range selection for report filtering |
| `ExportButtons.tsx` | Export action buttons: CSV, Excel, PDF |

**Hooks:**
| Hook | Description |
|---|---|
| `useReports.ts` | TanStack Query: dashboard stats, financial/patient/appointment/clinical/operational reports, export, saved, scheduled |

---

### 4.7 Dashboard Financial Widgets (`features/dashboard/`)

> Source: MASTER_PLAN §21, ADMIN_PORTAL_SCREENS

| Widget                                   | Description                                            |
| ---------------------------------------- | ------------------------------------------------------ |
| `StatsCard.tsx` — Revenue Today          | Today's revenue with comparison to yesterday           |
| `RevenueChart.tsx` — Revenue Last 7 Days | Sparkline chart (Recharts)                             |
| `QuickActions.tsx`                       | Includes "+ New Invoice" and "📊 Daily Report" buttons |

---

### 4.8 Patient Detail — Financial Tabs

> Source: ADMIN_PORTAL_SCREENS

- **Invoices Tab:** List patient's invoices with Balance column + overdue badge
- **Insurance Display:** `PatientInsurance.tsx` component showing active insurance policies (only visible when Insurance module is active)

---

## 5. Schemas (Zod — Shared)

> All financial schemas **already exist** in `packages/shared/src/schemas/`

### 5.1 `invoice.schema.ts` ✅ EXISTS (137 lines)

| Schema                             | Purpose                                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `INVOICE_STATUS_VALUES`            | `['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded']`                         |
| `VALID_INVOICE_STATUS_TRANSITIONS` | Maps each status → allowed next statuses                                                                    |
| `invoiceItemSchema`                | `{ description, treatmentId?, serviceId?, toothNumber?, quantity, unitPrice, discount, total }`             |
| `createInvoiceSchema`              | Full create payload: patientId, branchId, items[], totals, currency?, dates, insurance fields, status       |
| `updateInvoiceSchema`              | Partial of create (omits patientId, branchId)                                                               |
| `invoiceQuerySchema`               | Pagination + filters: page, limit, search, status, patientId, branchId, dateFrom, dateTo, sortBy, sortOrder |
| `generateInvoiceFromPlanSchema`    | `{ treatmentPlanId, branchId, currency?, notes?, dueDate? }`                                                |

**Types exported:** `InvoiceItemInput`, `CreateInvoiceInput`, `UpdateInvoiceInput`, `InvoiceQuery`, `GenerateInvoiceFromPlanInput`

---

### 5.2 `payment.schema.ts` ✅ EXISTS (131 lines)

| Schema                       | Purpose                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `TENANT_PAYMENT_METHODS`     | `['cash', 'card', 'bank_transfer', 'cheque', 'insurance', 'online', 'fawry', 'meeza']` |
| `TENANT_PAYMENT_STATUSES`    | `['pending', 'completed', 'failed', 'refunded']`                                       |
| `createPaymentSchema`        | `{ invoiceId, patientId, amount, paymentMethod, paymentReference?, notes? }`           |
| `paymentQuerySchema`         | Pagination + filters: invoiceId, patientId, paymentMethod, status, dates               |
| `refundPaymentSchema`        | `{ reason }`                                                                           |
| `createOnlinePaymentSchema`  | `{ invoiceId, amount, currency, method: card\|fawry\|wallet\|meeza }`                  |
| `RECONCILIATION_STATUSES`    | `['open', 'closed', 'reviewed']`                                                       |
| `createReconciliationSchema` | `{ branchId, reconciliationDate, openingBalance }`                                     |
| `updateReconciliationSchema` | `{ closingBalance?, expenses?, status?, notes? }`                                      |
| `reconciliationQuerySchema`  | Pagination + filters: branchId, status, dates                                          |

---

### 5.3 `insurance.schema.ts` ✅ EXISTS (128 lines)

| Schema                                     | Purpose                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `createInsuranceCompanySchema`             | `{ name: { en, ar }, code, contactPerson?, phone?, email?, coveragePercentage, maxCoverage?, isActive }`      |
| `INSURANCE_CLAIM_STATUS_VALUES`            | `['submitted', 'under_review', 'approved', 'partially_approved', 'denied', 'paid']`                           |
| `VALID_INSURANCE_CLAIM_STATUS_TRANSITIONS` | Enforces: submitted→under_review→approved\|partially_approved\|denied→paid                                    |
| `createInsuranceClaimSchema`               | `{ patientId, patientInsuranceIndex, invoiceId, claimDate, serviceDate, totalAmount, claimedAmount, notes? }` |
| `updateClaimStatusSchema`                  | `{ status, approvedAmount?, patientResponsibility?, denialReason? }`                                          |
| `claimAgingQuerySchema`                    | `{ asOfDate?, insuranceCompanyId? }`                                                                          |

---

### 5.4 `installment.schema.ts` ✅ EXISTS (79 lines)

| Schema                              | Purpose                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `INSTALLMENT_FREQUENCY_VALUES`      | `['weekly', 'biweekly', 'monthly']`                                                                             |
| `INSTALLMENT_PLAN_STATUS_VALUES`    | `['active', 'completed', 'defaulted', 'cancelled']`                                                             |
| `INSTALLMENT_PAYMENT_STATUS_VALUES` | `['pending', 'paid', 'overdue', 'waived']`                                                                      |
| `createInstallmentPlanSchema`       | `{ invoiceId, patientId, totalAmount, downPayment, numberOfInstallments (1–24), frequency, startDate, notes? }` |
| `recordInstallmentPaymentSchema`    | `{ amountPaid, paymentId?, lateFee, notes? }`                                                                   |

---

### 5.5 `commission.schema.ts` ✅ EXISTS (82 lines)

| Schema                                | Purpose                                                               |
| ------------------------------------- | --------------------------------------------------------------------- |
| `COMMISSION_STATUS_VALUES`            | `['pending', 'approved', 'paid', 'cancelled']`                        |
| `VALID_COMMISSION_STATUS_TRANSITIONS` | `pending→approved\|cancelled`, `approved→paid\|cancelled`             |
| `PAYOUT_PAYMENT_METHODS`              | `['cash', 'bank_transfer', 'cheque', 'other']`                        |
| `commissionQuerySchema`               | Pagination + filters: doctorId, status, invoiceId, startDate, endDate |
| `approveCommissionsSchema`            | `{ ids: ObjectId[] }` (bulk approve)                                  |
| `createPayoutSchema`                  | `{ doctorId, periodStart, periodEnd, paymentMethod, reference? }`     |
| `commissionSummaryQuerySchema`        | `{ startDate?, endDate? }`                                            |

---

### 5.6 Report Types ✅ EXISTS (`packages/shared/src/types/report.types.ts`)

| Type/Interface          | Purpose                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ReportCategory`        | `'financial' \| 'patient' \| 'appointment' \| 'clinical' \| 'operational' \| 'inventory'`                                             |
| `ReportModule`          | `'dashboard-reports' \| 'advanced-analytics'`                                                                                         |
| `FinancialReportType`   | 7 types: revenue-summary, revenue-by-doctor, revenue-by-service, revenue-by-branch, payment-collection, outstanding-aging, tax-report |
| `OperationalReportType` | 4 types: commission-summary, daily-reconciliation, wait-time, staff-productivity                                                      |
| `IReportDefinition`     | Full report metadata (name, category, description, module tier, chart type, permissions)                                              |
| `ChartType`             | Chart visualization types                                                                                                             |
| `ISummaryCardDef`       | Summary card definitions for dashboard                                                                                                |
| `ReportQueryParams`     | `{ from, to, branchId, doctorId, format }`                                                                                            |

---

### 5.7 Webhook Types ✅ EXISTS (`packages/shared/src/types/webhook.types.ts`)

| Event                     | Source                             |
| ------------------------- | ---------------------------------- |
| `invoice.created`         | Invoice creation                   |
| `invoice.paid`            | Invoice fully paid                 |
| `invoice.overdue`         | Invoice past due date              |
| `TenantWebhookEvent` enum | Union of all tenant webhook events |

---

### 5.8 Settings Schema - Financial Fields ✅ EXISTS

> Source: `settings.schema.ts` grep results

Financial settings fields already in the settings schema:

- `invoicePrefix`, `invoiceStartNumber`
- `paymentMethods` (array)
- `defaultPaymentTermDays`
- `enableInstallments`, `enableInsurance`, `enableCommissions` (boolean toggles)

---

## 6. Security Requirements

### 6.1 Data Encryption

> Source: SECURITY_AND_ENCRYPTION, V2_DATABASE

| Requirement               | Implementation                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| Insurance `policyNumber`  | **AES-256-GCM encrypted** at rest. `encryption.service.ts` handles encrypt/decrypt on read/write. |
| Encryption key per tenant | HKDF derivation from master key + tenant slug                                                     |
| Key rotation              | Support re-encryption on key rotation                                                             |

### 6.2 PCI DSS Compliance

> Source: SECURITY_AND_ENCRYPTION, MASTER_PLAN §29

| Requirement            | Implementation                                                         |
| ---------------------- | ---------------------------------------------------------------------- |
| No card data in DB     | All card handling delegated to Paymob/Stripe (PCI-compliant providers) |
| TLS 1.2+               | All API ↔ Payment Provider communication over TLS 1.2+                 |
| No card numbers logged | Audit logs never contain card numbers                                  |
| Tokenized payments     | Paymob/Stripe return tokens, never raw card data                       |

### 6.3 Webhook Security

> Source: SECURITY_AND_ENCRYPTION, V2_DECISION_LOG

| Requirement          | Implementation                                                                    |
| -------------------- | --------------------------------------------------------------------------------- |
| Outbound signing     | HMAC-SHA256: `signWebhookPayload(payload, secret, timestamp)`                     |
| Signature header     | `X-Dento-Signature: t=<unix_timestamp>,v1=<hmac_hex>` (Stripe-compatible format)  |
| Replay protection    | Reject webhooks older than 5 minutes                                              |
| Inbound verification | Paymob: HMAC verification on callback. Stripe: `stripe.webhooks.constructEvent()` |
| PII redaction        | Phone/email masked, nationalId hidden in webhook payloads                         |

### 6.4 Rate Limiting

> Source: SECURITY_AND_ENCRYPTION

| Tier            | Limit                                |
| --------------- | ------------------------------------ |
| CDN             | 1000 req/min/IP                      |
| API             | 100 req/min/User                     |
| Auth            | 10 req/min/IP                        |
| Webhook inbound | 200 req/min (from payment providers) |

### 6.5 Input Validation & Sanitization

> Source: SECURITY_AND_ENCRYPTION

| Requirement       | Implementation                                             |
| ----------------- | ---------------------------------------------------------- |
| NoSQL injection   | `input-sanitizer.ts` blocks `$`-operator in request bodies |
| Zod validation    | All financial inputs validated through shared Zod schemas  |
| Amount validation | Non-negative numbers, max precision checks                 |

### 6.6 Audit Trail

> Source: SECURITY_AND_ENCRYPTION

| Requirement                                                                   | Implementation                                               |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| All financial mutations logged                                                | `audit-logger.ts` middleware captures before/after snapshots |
| Fields: action, userId, resourceType, resourceId, before/after, IP, timestamp |                                                              |
| Invoice status changes tracked                                                | Full audit trail for status transitions                      |
| Payment records immutable                                                     | Payments cannot be edited, only refunded                     |

---

## 7. RBAC Permissions

### 7.1 Tenant-Level Financial Permissions

> Source: SECURITY_AND_ENCRYPTION, ADMIN_PORTAL_SCREENS sidebar roles

| Permission              | Roles Granted                                | Notes      |
| ----------------------- | -------------------------------------------- | ---------- |
| `invoices.read`         | `tenant_admin`, `accountant`, `receptionist` |            |
| `invoices.create`       | `tenant_admin`, `accountant`, `receptionist` |            |
| `invoices.update`       | `tenant_admin`, `accountant`                 |            |
| `invoices.delete`       | `tenant_admin`                               | Draft only |
| `payments.read`         | `tenant_admin`, `accountant`, `receptionist` |            |
| `payments.create`       | `tenant_admin`, `accountant`, `receptionist` |            |
| `payments.refund`       | `tenant_admin`, `accountant`                 |            |
| `insurance.read`        | `tenant_admin`, `accountant`                 |            |
| `insurance.create`      | `tenant_admin`, `accountant`                 |            |
| `insurance.update`      | `tenant_admin`, `accountant`                 |            |
| `insurance.delete`      | `tenant_admin`                               |            |
| `installments.read`     | `tenant_admin`, `accountant`                 |            |
| `installments.create`   | `tenant_admin`, `accountant`                 |            |
| `installments.update`   | `tenant_admin`, `accountant`                 |            |
| `commissions.read`      | `tenant_admin`                               |            |
| `commissions.approve`   | `tenant_admin`                               |            |
| `commissions.payout`    | `tenant_admin`                               |            |
| `reconciliation.read`   | `tenant_admin`, `accountant`                 |            |
| `reconciliation.create` | `tenant_admin`, `accountant`                 |            |
| `reconciliation.close`  | `tenant_admin`, `accountant`                 |            |
| `reconciliation.review` | `tenant_admin`                               |            |

**Sidebar Route → Role Mapping:**

| Route                 | Allowed Roles                                |
| --------------------- | -------------------------------------------- |
| `/admin/invoices`     | `tenant_admin`, `accountant`                 |
| `/admin/payments`     | `tenant_admin`, `accountant`, `receptionist` |
| `/admin/insurance`    | `tenant_admin`, `accountant`                 |
| `/admin/installments` | `tenant_admin`, `accountant`                 |
| `/admin/commissions`  | `tenant_admin`                               |
| `/admin/reports`      | `tenant_admin`, `accountant`                 |

> **Note:** `dentist` role does NOT have financial permissions (per SECURITY_AND_ENCRYPTION RBAC matrix)

---

### 7.2 Report RBAC Permissions

> Source: MASTER_PLAN §21

| Permission                 | Roles                                             | Module Tier                         |
| -------------------------- | ------------------------------------------------- | ----------------------------------- |
| `reports.dashboard.view`   | All staff                                         | Free (`dashboard-reports`)          |
| `reports.basic.view`       | `tenant_admin`, `manager`, `doctor`, `accountant` | Free (`dashboard-reports`)          |
| `reports.advanced.view`    | `tenant_admin`, `manager`, `accountant`           | Paid (`advanced-analytics` $199/Mo) |
| `reports.financial.view`   | `tenant_admin`, `manager`, `accountant`           | Paid (`advanced-analytics`)         |
| `reports.export`           | `tenant_admin`, `manager`, `accountant`           | Paid (`advanced-analytics`)         |
| `reports.schedules.manage` | `tenant_admin`, `manager`                         | Paid (`advanced-analytics`)         |
| `reports.saved.manage`     | `tenant_admin`, `manager`, `accountant`           | Paid (`advanced-analytics`)         |

---

### 7.3 Platform-Level Financial Permissions

> Source: PLATFORM_RBAC

| Permission         | Owner     | Admin | Viewer |
| ------------------ | --------- | ----- | ------ |
| `platform_billing` | Full CRUD | Read  | Read   |
| `platform_pricing` | Full CRUD | Read  | Read   |

**Platform Route → Permission:**
| Route File | Permission Required |
|---|---|
| `payments.route.ts` (platform) | `platform_billing` |
| `stripe.route.ts` (platform) | `platform_billing` |

---

## 8. PDF Templates

### 8.1 Invoice PDF

> Source: MASTER_PLAN §15, V2_STRUCTURE, ADMIN_PORTAL_SCREENS

**Technology:** `@react-pdf/renderer` (server-side rendering, no Puppeteer)

**Template Structure:**

```
┌─────────────────────────────────────────┐
│  [Logo]  Clinic Name (EN/AR)            │
│          Main Branch Address             │
│          Phone | Email                   │
├─────────────────────────────────────────┤
│  Invoice #: INV-2026-00042              │
│  Date: 15/03/2026    Due: 15/04/2026    │
├─────────────────────────────────────────┤
│  Bill To:                               │
│    Patient Name                         │
│    Phone | Email                        │
├─────────────────────────────────────────┤
│  # │ Service       │ Qty │ Price │ Total│
│  1 │ Root Canal    │   1 │  500  │  500 │
│  2 │ Crown (PFM)  │   1 │  800  │  800 │
├─────────────────────────────────────────┤
│                    Subtotal:    1,300.00 │
│                    VAT (14%):     182.00 │
│                    Total:       1,482.00 │
│                    Paid:          500.00 │
│                    Balance Due:   982.00 │
├─────────────────────────────────────────┤
│  Payment Status: PARTIALLY PAID         │
│  Payment Method: Cash                   │
├─────────────────────────────────────────┤
│  Payment History:                       │
│    - 15/03 Cash ₤500 (by: Reception)   │
└─────────────────────────────────────────┘
```

**Key Rules:**

- **NO doctor name/signature** on invoices (clinic document)
- Uses shared `<ClinicHeader />` component (Logo, Clinic Name EN/AR, Address, Phone, Email)
- Currency symbol from tenant/invoice currency setting
- RTL support for Arabic locale
- `window.print()` + PDF Export button in UI

---

### 8.2 Payment Receipt PDF

> Source: ADMIN_PORTAL_SCREENS, V2_STRUCTURE

- ClinicHeader
- Receipt #, Date
- Patient info
- Payment details: Amount, Method, Reference
- Related Invoice reference

---

### 8.3 Treatment Plan PDF (Financial Adjacent)

> Source: MASTER_PLAN §15

**Includes doctor** (Name, Specialty, License #):

```
┌───────────────────────────────────┐
│  <ClinicHeader />                 │
├───────────────────────────────────┤
│  Doctor: Dr. Ahmad | Endodontics  │
│  License: MED-12345               │
├───────────────────────────────────┤
│  Procedure  │ Tooth │ Est. Cost │ Status    │
│  Root Canal │  #14  │    500    │ Planned   │
│  Crown PFM  │  #14  │    800    │ Planned   │
├───────────────────────────────────┤
│  Estimated Total:        1,300.00 │
├───────────────────────────────────┤
│  Doctor Signature: ______________ │
│  Patient Signature: _____________ │
└───────────────────────────────────┘
```

---

### 8.4 Report PDFs

> Source: MASTER_PLAN §21

- Generated via `@react-pdf/renderer` for scheduled & exported reports
- Includes: Report title, date range, filters applied, data tables, chart images (rendered to PNG via Recharts → embedded in PDF)
- Branded with clinic header

---

## 9. Payment Gateway Integration

### 9.1 Provider Auto-Selection

> Source: MASTER_PLAN §29, §25

| Tenant Country    | Payment Provider |
| ----------------- | ---------------- |
| Egypt (EG)        | **Paymob**       |
| Saudi Arabia (SA) | **Stripe**       |
| UAE (AE)          | **Stripe**       |
| Turkey (TR)       | **Stripe**       |
| Kuwait (KW)       | **Stripe**       |
| UK (GB)           | **Stripe**       |

**Logic:** Auto-selected from `country_config.paymentProvider` based on tenant's registered country. Cannot be manually overridden.

---

### 9.2 Paymob Integration (Egypt/MENA)

> Source: MASTER_PLAN §29

**Plugin:** `apps/api/src/plugins/paymob.ts` using `paymob-node` SDK

**6 Payment Methods:**

| Method          | Fee           | Settlement |
| --------------- | ------------- | ---------- |
| Cards (Visa/MC) | 2.5% + 1 EGP  | T+2        |
| Fawry           | 2% + 2 EGP    | T+2        |
| Mobile Wallets  | 1.5%          | T+1        |
| InstaPay        | 3 EGP flat    | Instant    |
| ValU (BNPL)     | 0% (merchant) | T+7        |
| Meeza Digital   | 1%            | T+1        |

**Payment Flow:**

1. **Auth Request** → Paymob API authentication
2. **Order Registration** → Create order with amount/currency
3. **Payment Key** → Generate payment key for specific method
4. **Frontend** → Iframe or redirect to Paymob payment page
5. **Webhook** → Paymob posts transaction callback → HMAC verification → update payment status

---

### 9.3 Stripe Integration (International)

> Source: MASTER_PLAN §29

**Methods:** Cards, SEPA, Bank Transfer

**Flow:**

1. Create PaymentIntent via Stripe API
2. Return client secret to frontend
3. Frontend uses Stripe Elements / Checkout
4. Webhook confirmation via `stripe.webhooks.constructEvent()`

---

### 9.4 Currency Edge Cases

> Source: V2_DECISION_LOG

| Scenario                    | Rule                                                                             |
| --------------------------- | -------------------------------------------------------------------------------- |
| Currency change             | Next billing cycle only                                                          |
| Mid-cycle upgrade           | Prorated in **current** currency                                                 |
| Dunning (overdue chase)     | Continues in **original invoice** currency                                       |
| Refund                      | Always in **original payment** currency                                          |
| Module activation mid-cycle | Prorated: `(days / total_days) × price`, charged immediately as separate invoice |

---

### 9.5 Pricing Priority

> Source: V2_DECISION_LOG

Resolution order (highest wins):

1. Manual Override
2. Coupon/Discount
3. Country-Specific Price
4. Volume Tier
5. Base Price

---

## 10. Testing Requirements

> **Source:** V2_DECISION_LOG §10 (Test Infrastructure), BUILD_RULES.md §18 (Testing Standards), IMPLEMENTATION_ROADMAP §13 (Definition of Done)

### 10.1 Test Stack

| Tool                       | Version | Purpose                               | Source            |
| -------------------------- | ------- | ------------------------------------- | ----------------- |
| **Vitest**                 | 2.x     | Test runner + assertions              | DECISION_LOG §10  |
| **MSW**                    | 2.x     | Mock API responses for frontend tests | DECISION_LOG §10  |
| **@testing-library/react** | 16.x    | React component testing               | DECISION_LOG §10  |
| **supertest**              | latest  | HTTP integration tests for API routes | DECISION_LOG §10  |
| **mongodb-memory-server**  | latest  | In-memory MongoDB for service tests   | DECISION_LOG §10  |
| **@faker-js/faker**        | latest  | Generate realistic test data          | BUILD_RULES §18.1 |

### 10.2 Phase 4 Coverage Targets

| Metric     | Target  | Source            |
| ---------- | ------- | ----------------- |
| Statements | **65%** | BUILD_RULES §18.2 |
| Functions  | **65%** | BUILD_RULES §18.2 |
| Lines      | **65%** | BUILD_RULES §18.2 |
| Branches   | **55%** | BUILD_RULES §18.2 |

**Critical Path Coverage (70% minimum):**

- Invoice total calculation logic (subtotal, tax, discount, balanceDue)
- Payment reconciliation logic (amountPaid updates, status transitions)
- Commission calculation from invoice items
- Installment schedule generation (auto-calculate dates & amounts)
- Insurance claim status transitions (6-state machine)

> **Source:** V2_DECISION_LOG §10 — "Phase 4 coverage target 70% for invoice calculation/payment reconciliation"

### 10.3 Required Test Files

| Test File                           | Location                                   | Tests                                                                                                               | Source            |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `invoices.service.test.ts`          | `apps/api/src/tenant/routes/invoices/`     | Create, update, cancel, issue, totals recalculation, treatment plan generation, status transitions, overdue marking | BUILD_RULES §18.3 |
| `invoices.route.test.ts`            | `apps/api/src/tenant/routes/invoices/`     | HTTP status codes, auth enforcement, response shape, pagination                                                     | BUILD_RULES §18.3 |
| `payments.service.test.ts`          | `apps/api/src/tenant/routes/payments/`     | Create, refund, auto-reconcile invoice amounts, online payment processing                                           | BUILD_RULES §18.3 |
| `payments.route.test.ts`            | `apps/api/src/tenant/routes/payments/`     | HTTP endpoints, auth, response shape                                                                                | BUILD_RULES §18.3 |
| `insurance-claim.service.test.ts`   | `apps/api/src/tenant/routes/insurance/`    | Create, status transitions (6-state), aging report pipeline                                                         | BUILD_RULES §18.3 |
| `insurance-company.service.test.ts` | `apps/api/src/tenant/routes/insurance/`    | CRUD, code uniqueness, stats aggregation                                                                            | BUILD_RULES §18.3 |
| `installment.service.test.ts`       | `apps/api/src/tenant/routes/installments/` | Create plan, auto-schedule, record payment, waive, cancel, overdue marking                                          | BUILD_RULES §18.3 |
| `commission.service.test.ts`        | `apps/api/src/tenant/routes/commissions/`  | Calculate from invoice, approve, create payout, doctor summary                                                      | BUILD_RULES §18.3 |
| `InvoiceForm.test.tsx`              | `apps/admin/src/features/invoices/`        | Form validation, submit, Zod schema integration                                                                     | BUILD_RULES §18.3 |
| `PaymentForm.test.tsx`              | `apps/admin/src/features/payments/`        | Payment method selection, amount validation                                                                         | BUILD_RULES §18.3 |
| `useInvoices.test.ts`               | `apps/admin/src/features/invoices/`        | Loading states, error handling, cache invalidation                                                                  | BUILD_RULES §18.3 |
| `usePayments.test.ts`               | `apps/admin/src/features/payments/`        | Loading states, error handling                                                                                      | BUILD_RULES §18.3 |

### 10.4 Test Structure Pattern

> **Source:** BUILD_RULES §18.4

```typescript
describe('InvoiceService', () => {
  let connection: Connection;

  beforeAll(async () => {
    connection = await setupTestDb(); // mongodb-memory-server
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('create', () => {
    it('should create an invoice with valid data', async () => { ... });
    it('should auto-generate invoiceNumber INV-YYYY-NNNNN', async () => { ... });
    it('should recalculate totals from items (server-side)', async () => { ... });
    it('should reject overlapping invoiceNumbers', async () => { ... });
  });

  describe('recordPayment', () => {
    it('should update amountPaid and balanceDue', async () => { ... });
    it('should mark as paid when balanceDue = 0', async () => { ... });
    it('should mark as partially_paid when balanceDue > 0', async () => { ... });
  });

  describe('validateStatusTransition', () => {
    it('should allow draft → issued', async () => { ... });
    it('should reject paid → draft', async () => { ... });
  });
});
```

### 10.5 What to Test per Layer

| Layer         | What to Test                                                                           | What NOT to Test                     | Source            |
| ------------- | -------------------------------------------------------------------------------------- | ------------------------------------ | ----------------- |
| **Service**   | Business logic (totals calc, status transitions, commission calc, schedule generation) | Mongoose internals                   | BUILD_RULES §18.5 |
| **Route**     | HTTP status codes, auth check, RBAC enforcement, response shape, pagination            | Business logic (delegate to service) | BUILD_RULES §18.5 |
| **Component** | Rendering, user interactions, form validation, a11y                                    | Implementation details               | BUILD_RULES §18.5 |
| **Hook**      | Return values, loading/error states, cache invalidation on mutation                    | React Query internals                | BUILD_RULES §18.5 |

---

## 11. Build Rules

> **Source:** BUILD_RULES.md §1–§28, V2_STRUCTURE.md §9, IMPLEMENTATION_ROADMAP §13, V2_DECISION_LOG §32

### 11.1 File Naming Conventions

| Type      | Convention               | Example                                            | Source            |
| --------- | ------------------------ | -------------------------------------------------- | ----------------- |
| Model     | `kebab-case.model.ts`    | `invoice.model.ts`, `insurance-claim.model.ts`     | V2_STRUCTURE §5   |
| Route     | `kebab-case.route.ts`    | `invoices.route.ts`, `commissions.route.ts`        | V2_STRUCTURE §5   |
| Service   | `kebab-case.service.ts`  | `invoice.service.ts`, `pdf.service.ts`             | V2_STRUCTURE §5   |
| Schema    | `kebab-case.schema.ts`   | `invoice.schema.ts`, `payment.schema.ts`           | V2_STRUCTURE §9   |
| Pipeline  | `kebab-case.pipeline.ts` | `revenue.pipeline.ts`, `aging.pipeline.ts`         | V2_STRUCTURE §5   |
| Component | `PascalCase.tsx`         | `InvoiceForm.tsx`, `PayoutTable.tsx`               | V2_STRUCTURE §6   |
| Hook      | `camelCase use*.ts`      | `useInvoices.ts`, `usePayments.ts`                 | V2_STRUCTURE §6   |
| Test      | `{name}.test.ts(x)`      | `invoices.service.test.ts`, `InvoiceForm.test.tsx` | BUILD_RULES §18.3 |

### 11.2 File Size Limits

| Type      | Max Lines | Source          |
| --------- | --------- | --------------- |
| Component | 200       | V2_STRUCTURE §9 |
| Page      | 150       | V2_STRUCTURE §9 |
| Hook      | 100       | V2_STRUCTURE §9 |
| Service   | 300       | V2_STRUCTURE §9 |
| Route     | 150       | V2_STRUCTURE §9 |
| Model     | 150       | V2_STRUCTURE §9 |
| Schema    | 100       | V2_STRUCTURE §9 |
| Test      | 300       | V2_STRUCTURE §9 |

### 11.3 Import Rules

| Rule              | Detail                                             | Source          |
| ----------------- | -------------------------------------------------- | --------------- |
| `@dento/shared`   | Importable by ALL packages (api, admin, developer) | V2_STRUCTURE §9 |
| `@dento/ui`       | Importable by admin + developer ONLY (NOT mobile)  | V2_STRUCTURE §9 |
| Cross-app imports | Apps cannot import from each other                 | V2_STRUCTURE §9 |

### 11.4 3-Layer Validation Pattern

> **Source:** BUILD_RULES §16.2, SECURITY_AND_ENCRYPTION §7

| Layer                  | Implementation                                                | Purpose                    |
| ---------------------- | ------------------------------------------------------------- | -------------------------- |
| **1. Frontend Zod**    | React Hook Form + Zod resolver (`@dento/shared` schema)       | Instant user feedback      |
| **2. Backend Zod**     | Route `preValidation` with `.strict()` — rejects unknown keys | Server-side guard          |
| **3. Mongoose Schema** | Model schema definitions                                      | Last line of defense at DB |

**Form Field Mapping (end-to-end):**

```
Form input name="firstName.en" → Zod: firstName: { en: z.string() } → API body: { firstName: { en: "..." } } → MongoDB: { firstName: { en: "..." } }
```

> **Source:** BUILD_RULES §24.5

### 11.5 Required UI States for Every Page

| State   | Component                                 | Source          |
| ------- | ----------------------------------------- | --------------- |
| Loading | `<TableSkeleton />`                       | BUILD_RULES §15 |
| Error   | `<ErrorState onRetry={refetch} />`        | BUILD_RULES §15 |
| Empty   | `<EmptyState title="..." action={...} />` | BUILD_RULES §15 |

### 11.6 Button Requirements

> **Source:** BUILD_RULES §24.2 — Every button MUST have a working handler

| Button        | Required Behavior                                          |
| ------------- | ---------------------------------------------------------- |
| Add/Create    | Opens form dialog or navigates to create page              |
| Edit          | Opens pre-filled form                                      |
| Delete/Cancel | Confirmation dialog → mutation → success toast             |
| Save/Submit   | Zod validation → mutation → success toast → close/navigate |
| Export        | Triggers CSV/PDF/Excel download                            |

### 11.7 RTL / Bidirectional Support

| Rule                 | Detail                                                          | Source          |
| -------------------- | --------------------------------------------------------------- | --------------- |
| **Logical CSS only** | `ms-`, `me-`, `ps-`, `pe-`, `text-start` — NEVER `left`/`right` | BUILD_RULES §11 |
| **Arabic font**      | IBM Plex Sans Arabic                                            | BUILD_RULES §11 |
| **Bilingual text**   | `{ en: String, ar?: String }`                                   | V2_DATABASE §1  |
| **Recharts RTL**     | `reversed` props for RTL axes                                   | MASTER_PLAN §21 |

### 11.8 `isActive` Deviation for Financial Models

> **Source:** V2_DECISION_LOG §32

| Model                 | Soft Delete Method                | Rationale                                    |
| --------------------- | --------------------------------- | -------------------------------------------- |
| `invoices`            | `status: 'cancelled'`             | Financial audit trail                        |
| `payments`            | `status: 'refunded'`              | Cannot delete financial records              |
| `reconciliation`      | Immutable once `status: 'closed'` | Accounting standards                         |
| `insurance_companies` | `isActive: false`                 | Non-financial entity — uses standard pattern |

### 11.9 Build Verification Checklist

> **Source:** BUILD_RULES §19 — Run after EVERY implementation session

```bash
# Step 1: Build all packages
pnpm turbo build         # 0 errors

# Step 2: Lint
pnpm turbo lint          # 0 new errors

# Step 3: Type check
pnpm turbo typecheck     # 0 TS errors

# Step 4: Run tests
pnpm turbo test          # All pass, coverage ≥ 65%

# Step 5: Cross-layer integration check
# Sidebar link → Route → Page → Hook → API → Service → Model → MongoDB
```

### 11.10 Definition of Done (15 Criteria)

> **Source:** IMPLEMENTATION_ROADMAP §13

1. ✅ Build succeeds with 0 errors
2. ✅ Lint passes with 0 new errors
3. ✅ Type check passes
4. ✅ Tests pass (coverage ≥ 65%)
5. ✅ RBAC enforced on all routes
6. ✅ Zod schema in `@dento/shared`
7. ✅ Security checklist complete
8. ✅ RTL verified
9. ✅ Loading/Error/Empty states
10. ✅ Audit logging on all mutations
11. ✅ No regressions
12. ✅ Sidebar link → page connected
13. ✅ All buttons functional
14. ✅ Toast feedback on all mutations
15. ✅ Responsive on all breakpoints

### 11.11 Post-Implementation Compliance Scan

> **Source:** BUILD_RULES §28

After Phase 4 implementation, mandatory scan against ALL 6 core documents:

1. `DENTO_V2_MASTER_PLAN.md` — feature scope
2. `IMPLEMENTATION_ROADMAP.md` — timing, dependencies, DoD
3. `V2_DATABASE.md` — schema compliance
4. `V2_STRUCTURE.md` — file locations, naming
5. `TECH_REQUIREMENTS.md` — package versions
6. `SECURITY_AND_ENCRYPTION.md` — auth, encryption, RBAC, audit

---

## 12. Report Types

> **Source:** DENTO_V2_MASTER_PLAN §21 (Reports & Analytics — full deep dive), V2_DATABASE §11.5 (`report_schedules`), IMPLEMENTATION_ROADMAP §4 (Week 16)

### 12.1 Financial Reports (7 Reports) — Phase 4

| #   | Report                           | Description                                                  | Aggregation Pipeline                                                  | Collection                       | Module Tier                                 |
| --- | -------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| F1  | **Revenue Summary**              | Revenue by period (day/week/month/quarter/year)              | `invoices` → `$group` by period, `$sum` totalAmount WHERE status=paid | `revenue.pipeline.ts`            | Free (current month), Advanced (historical) |
| F2  | **Revenue by Doctor**            | Revenue ranked by doctor with % share                        | `invoices` → `$lookup` appointments → `$group` by doctorId            | `revenue.pipeline.ts`            | Advanced                                    |
| F3  | **Revenue by Service**           | Revenue by service type/category                             | `invoices.items` → `$unwind` → `$group` by serviceId                  | `revenue.pipeline.ts`            | Advanced                                    |
| F4  | **Revenue by Branch**            | Revenue comparison across branches                           | `invoices` → `$group` by branchId                                     | `revenue.pipeline.ts`            | Advanced (Multi-Branch)                     |
| F5  | **Payment Collection**           | Payments grouped by method (Cash/Card/Bank/Insurance)        | `payments` → `$group` by method, `$sum` amount                        | `payment-collection.pipeline.ts` | Advanced                                    |
| F6  | **Outstanding Invoices (Aging)** | Open invoices bucketed by age (0–30, 31–60, 61–90, 90+ days) | `invoices` WHERE status≠paid → `$bucket` by age                       | `aging.pipeline.ts`              | Advanced                                    |
| F7  | **Tax Report**                   | Tax overview by period (for accountants)                     | `invoices` → `$group` by period, `$sum` taxAmount                     | `tax.pipeline.ts`                | Advanced                                    |

### 12.2 Operational Reports — Phase 4 Financial Subset

| #   | Report                   | Description                                               | Aggregation Source                                  | Module Tier |
| --- | ------------------------ | --------------------------------------------------------- | --------------------------------------------------- | ----------- |
| O1  | **Commission Summary**   | Commissions by doctor, status (pending/paid), period      | `doctor_commissions` → `$group` by doctorId, status | Advanced    |
| O2  | **Daily Reconciliation** | Daily close with expected vs actual comparison per branch | `reconciliation` → by date, branch                  | Advanced    |

### 12.3 Chart Visualizations

| Report             | Chart Type                              | Recharts Component |
| ------------------ | --------------------------------------- | ------------------ |
| Revenue Summary    | Line chart (trend over periods)         | `<LineChart>`      |
| Revenue by Doctor  | Bar chart (horizontal, ranked)          | `<BarChart>`       |
| Revenue by Service | Pie chart (% distribution)              | `<PieChart>`       |
| Revenue by Branch  | Bar chart (comparison)                  | `<BarChart>`       |
| Payment Collection | Stacked bar (by method per period)      | `<BarChart>`       |
| Outstanding Aging  | Grouped bar (bucket categories)         | `<BarChart>`       |
| Tax Report         | Line chart (period trend)               | `<LineChart>`      |
| Commission Summary | Stacked bar (pending vs paid by doctor) | `<BarChart>`       |

### 12.4 Export Formats

| Format    | Library               | Use Case                              | Source               |
| --------- | --------------------- | ------------------------------------- | -------------------- |
| **PDF**   | `@react-pdf/renderer` | Formatted reports, invoices, receipts | TECH_REQUIREMENTS §3 |
| **CSV**   | `@fast-csv/format`    | Tabular data, quick export            | TECH_REQUIREMENTS §3 |
| **Excel** | `exceljs`             | Multi-sheet, formatted, formulas      | TECH_REQUIREMENTS §3 |

### 12.5 Scheduled Reports (BullMQ)

> **Source:** DENTO_V2_MASTER_PLAN §21, V2_DATABASE §11.5

| Feature        | Detail                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| Frequencies    | Daily, Weekly, Monthly, Quarterly                                         |
| Delivery       | Email (Resend) + In-App notification                                      |
| Formats        | PDF, CSV, Excel                                                           |
| Storage        | Generated files stored in S3/R2 (Cloudflare)                              |
| BullMQ worker  | `report-generation` — runs pipeline → generates file → delivers           |
| Scheduler cron | `report-scheduler` (daily 00:05 UTC) — finds due schedules, enqueues jobs |
| Collection     | `report_schedules` — stores schedule config, last run, status             |

### 12.6 Standard Report Page Layout

> **Source:** DENTO_V2_MASTER_PLAN §21

Every financial report page follows this layout:

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Reports    [Report Title]            ⬇ Export │
├──────────────────────────────────────────────────────────┤
│  📅 Date Range: [from] - [to]                            │
│  🏥 Branch: [All ▼]   👨‍⚕️ Doctor: [All ▼]                │
│  [Apply Filters]  [Save as Report]  [Schedule]           │
├──────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Total   │ │ Average │ │ Highest │ │ Count   │       │ ← Summary KPI cards
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├──────────────────────────────────────────────────────────┤
│  📊 [Chart Type Toggle: Bar / Line / Pie]                │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Recharts Visualization               │    │
│  └──────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────┤
│  📋 Detail Table (TanStack Table - sortable, paginated)  │
└──────────────────────────────────────────────────────────┘
```

### 12.7 Report RBAC (Quick Reference)

| Permission                 | Allowed Roles              | Source          |
| -------------------------- | -------------------------- | --------------- |
| `reports.dashboard.view`   | ALL staff (Free)           | MASTER_PLAN §21 |
| `reports.financial.view`   | admin, manager, accountant | MASTER_PLAN §21 |
| `reports.export`           | admin, manager, accountant | MASTER_PLAN §21 |
| `reports.schedules.manage` | admin, manager             | MASTER_PLAN §21 |

### 12.8 Sidebar Integration

```
📊 Reports
  ├── Dashboard               ← Free (dashboard-reports)
  ├── Reports Hub             ← Free (overview, locked reports show blur + upgrade CTA)
  ├── Financial               ← Advanced Analytics 🔒 ($199/Mo)
  ├── Patient                 ← Advanced Analytics 🔒
  ├── Appointment             ← Advanced Analytics 🔒
  ├── Clinical                ← Advanced Analytics 🔒
  └── Operational             ← Advanced Analytics 🔒
```

### 12.9 Webhook Events for Reports

| Event                      | Trigger                                 | Source          |
| -------------------------- | --------------------------------------- | --------------- |
| `report.generated`         | Scheduled report successfully generated | MASTER_PLAN §21 |
| `report.generation_failed` | Report generation failed                | MASTER_PLAN §21 |
| `report.exported`          | Manual export performed                 | MASTER_PLAN §21 |

---

## Appendix A: Potential Conflict

> **⚠️ IMPLEMENTATION_ROADMAP vs V2_DECISION_LOG Discrepancy**
>
> The IMPLEMENTATION*ROADMAP lists Insurance (Week 15) as part of Phase 4.
> However, V2_DECISION_LOG §22 mentions: *"Phase 4 Financial delays — Cut: Insurance module → Phase 5. Keep: Invoices + Payments"\_
>
> **Recommendation:** Clarify whether Insurance remains in Phase 4 or has been deferred to Phase 5. All other planning documents (V2_DATABASE, MASTER_PLAN, ADMIN_PORTAL_SCREENS, V2_STRUCTURE) include Insurance in the same scope as other financial modules.

---

## Appendix B: BullMQ Workers & Crons (Phase 4)

| Worker/Cron          | File                              | Schedule              | Purpose                                      |
| -------------------- | --------------------------------- | --------------------- | -------------------------------------------- |
| `report.worker.ts`   | `jobs/workers/report.worker.ts`   | On-demand + scheduled | Generate scheduled reports                   |
| Report cron          | `jobs/crons/`                     | Daily 00:05 UTC       | Scan `report_schedules` for due reports      |
| `reminder.worker.ts` | `jobs/workers/reminder.worker.ts` | Every minute          | Check installment due dates → send reminders |
| `webhook.worker.ts`  | `jobs/workers/webhook.worker.ts`  | On event              | Deliver financial webhooks with retry        |

---

## Appendix C: Libraries & Dependencies

| Library                 | Purpose           | Usage                                                      |
| ----------------------- | ----------------- | ---------------------------------------------------------- |
| `@react-pdf/renderer`   | PDF generation    | Invoice, Receipt, Treatment Plan, Report PDFs              |
| `@fast-csv/format`      | CSV export        | Report CSV export                                          |
| `exceljs`               | Excel export      | Report Excel export (multi-sheet)                          |
| `recharts` 2.x          | Charts            | Dashboard widgets, report visualizations                   |
| `paymob-node`           | Paymob SDK        | Egypt payment gateway                                      |
| `stripe`                | Stripe SDK        | International payments                                     |
| `bullmq`                | Job queue         | Report scheduling, installment reminders, webhook delivery |
| `mongoose`              | MongoDB ODM       | All financial collections                                  |
| `zod`                   | Schema validation | Shared schemas (FE + BE)                                   |
| `@tanstack/react-query` | Data fetching     | All frontend financial hooks                               |
| `resend`                | Email             | Invoice emails, report delivery                            |

---

_End of Phase 4 Complete Requirements Extraction_
