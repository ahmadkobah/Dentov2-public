# Phase 4 — Financial Module: Complete Requirements Extraction

> **Extracted from ALL 9 planning documents**
> Sources: V2_DATABASE.md, DENTO_V2_MASTER_PLAN.md, IMPLEMENTATION_ROADMAP.md, TECH_REQUIREMENTS.md, BUILD_RULES.md, V2_DECISION_LOG.md, V2_STRUCTURE.md, PLATFORM_RBAC.md, SECURITY_AND_ENCRYPTION.md

---

## Timeline & Gates

| Item              | Detail                                                                                                                                    | Source                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Phase**         | Phase 4 — Financial                                                                                                                       | IMPLEMENTATION_ROADMAP §Phase 4            |
| **Weeks**         | 18–20 (adjusted from original 14–16, +2-week buffer per Decision §8)                                                                      | V2_DECISION_LOG §8                         |
| **Buffer before** | Buffer 2 at Weeks 16–17                                                                                                                   | IMPLEMENTATION_ROADMAP                     |
| **Week 18**       | Invoices CRUD + Items + PDF, Payments + Reconciliation, Paymob/Stripe integration, Payment Receipts                                       | IMPLEMENTATION_ROADMAP                     |
| **Week 19**       | Insurance Companies CRUD, Patient Insurance embedded, Insurance Claims + Status Flow, Claim↔Invoice Linking, Installment Plans + Tracking | IMPLEMENTATION_ROADMAP                     |
| **Week 20**       | Doctor Commissions, Commission Payouts, 7 Financial Reports, PDF Export System, Bulk Notifications, Report Scheduling                     | IMPLEMENTATION_ROADMAP                     |
| **M4 Gate**       | "Invoice → Payment → Insurance, Payment Webhook HMAC verified"                                                                            | IMPLEMENTATION_ROADMAP, V2_DECISION_LOG §8 |
| **Dependency**    | Phase 4 depends on Phase 3 (needs Patients + Appointments + Services)                                                                     | IMPLEMENTATION_ROADMAP Dependency Graph    |
| **Rollback Plan** | If Phase 4 runs over >2 weeks → Cut Insurance module → move to Phase 5. Keep Invoices + Payments as must-haves.                           | V2_DECISION_LOG §22                        |
| **Test Coverage** | 65% Statements/Functions/Lines, 55% Branches                                                                                              | BUILD_RULES §18.2                          |
| **Test Focus**    | Invoice calculation, payment reconciliation                                                                                               | V2_DECISION_LOG §10                        |

---

## 1. Invoices

### 1.1 Database Schema — `invoices` collection (Tenant DB)

> Source: V2_DATABASE.md §7.1

```typescript
{
  _id: ObjectId,

  // Identifiers
  invoiceNumber: String,       // Auto-generated: "INV-2026-00001" (sequential per tenant)
  patientId: ObjectId,         // → patients
  branchId: ObjectId,          // → branches
  appointmentId: ObjectId,     // → appointments (nullable)
  treatmentPlanId: ObjectId,   // → treatment_plans (nullable)

  // Line Items (embedded array)
  items: [{
    description: String,
    treatmentId: ObjectId,     // → procedure_notes (nullable)
    serviceId: ObjectId,       // → services (nullable)
    quantity: Number,
    unitPrice: Number,
    discount: Number,          // Per-item discount amount
    total: Number              // (unitPrice * quantity) - discount
  }],

  // Totals
  subtotal: Number,            // Sum of items[].total
  discountAmount: Number,      // Invoice-level discount amount
  discountPercentage: Number,  // Invoice-level discount %
  taxAmount: Number,           // Calculated from taxPercentage
  taxPercentage: Number,       // From country_config (e.g., 14% for EG)
  totalAmount: Number,         // subtotal - discountAmount + taxAmount
  amountPaid: Number,          // Sum of linked payments
  balanceDue: Number,          // totalAmount - amountPaid

  // Status
  status: String,              // "draft" | "issued" | "paid" | "partially_paid" | "overdue" | "cancelled" | "refunded"

  // Dates
  issueDate: Date,
  dueDate: Date,
  paidAt: Date,                // When fully paid

  // Notes
  notes: String,
  terms: String,

  // Insurance linkage
  insuranceClaimId: ObjectId,  // → insurance_claims (nullable)
  insuredAmount: Number,       // Amount covered by insurance
  patientResponsibility: Number, // totalAmount - insuredAmount

  // Audit
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- `invoiceNumber`: unique
- `patientId` + `createdAt`
- `status` + `dueDate`
- `branchId` + `issueDate`

**isActive deviation (Decision §32):** Invoices do NOT use `isActive` boolean. They use status-based lifecycle: cancelled invoices have `status: 'cancelled'`. Financial records are immutable once in certain states.

### 1.2 Invoice PDF Template

> Source: DENTO_V2_MASTER_PLAN.md §15

**Layout:**

```
┌──────────────────────────────────────────────────┐
│  [Logo]  Clinic Name                             │
│          Address (always Main Branch)             │
│          Phone | Email                            │
│                                   INV-2026-00001 │
│                                   Date: dd/MM/yy  │
├──────────────────────────────────────────────────┤
│  Patient: Name | ID | Phone                       │
├──────────────────────────────────────────────────┤
│  #  │ Service      │ Qty │ Unit Price │ Total    │
│  1  │ Root Canal   │ 1   │ 5,000 EGP  │ 5,000   │
│  2  │ Crown        │ 1   │ 3,000 EGP  │ 3,000   │
├──────────────────────────────────────────────────┤
│                      Subtotal:   8,000 EGP       │
│                      VAT (14%):  1,120 EGP       │
│                      Total:      9,120 EGP       │
├──────────────────────────────────────────────────┤
│  Payment Status: Paid | Method: Card              │
└──────────────────────────────────────────────────┘
```

**Key rules:**

- Invoice is a **CLINIC document** — NO doctor name on invoice header
- Doctor is tracked internally via `invoice.items[].doctorId` (for commissions)
- Uses shared `<ClinicHeader />` component: `packages/ui/src/composites/ClinicHeader.tsx`
- Logo + ClinicName + Address (Main Branch from `settings.branding.address.branchId`) + Phone + Email
- Optional doctor display = false for invoices
- v1→v2 change: from `window.print()` only → `window.print()` + PDF Export (`@react-pdf/renderer`, server-side)

### 1.3 Per-Invoice Currency Override (v2-only feature)

> Source: DENTO_V2_MASTER_PLAN.md §31

Patient/invoice can use a different currency than the tenant default. Listed as a Phase 4 new feature.

### 1.4 Currency & Tax from Locale System

> Source: DENTO_V2_MASTER_PLAN.md §25

- `taxPercentage` comes from `country_config` (e.g., 14% VAT for Egypt)
- `taxLabel` from `country_config` (e.g., "VAT")
- Currency is tenant-selectable (suggested by country, changeable by admin)
- Tax Rate is **locked** by country — only Developer can change
- Payment Provider is **locked** by country (Paymob for EG, Stripe for others)

### 1.5 File Structure

> Source: V2_STRUCTURE.md

**Backend:**

- `apps/api/src/tenant/routes/invoices/` — route + handler
- `apps/api/src/tenant/models/invoice.model.ts`
- `apps/api/src/tenant/services/invoice.service.ts`

**Frontend:**

- `apps/admin/src/features/invoices/pages/InvoiceListPage.tsx`
- `apps/admin/src/features/invoices/pages/InvoiceDetailPage.tsx`
- `apps/admin/src/features/invoices/components/InvoiceForm.tsx`
- `apps/admin/src/features/invoices/components/InvoiceLineItems.tsx`
- `apps/admin/src/features/invoices/components/InvoicePDF.tsx`
- `apps/admin/src/features/invoices/hooks/useInvoices.ts`

**Shared:**

- `packages/shared/src/schemas/invoice.schema.ts` (Zod)

### 1.6 Webhook Events

> Source: BUILD_RULES.md §23

- `invoice.issued` — when invoice status changes to "issued"
- `invoice.paid` — when invoice is fully paid

All webhooks use HMAC-SHA256, standard envelope, PII always redacted.

---

## 2. Payments

### 2.1 Database Schema — `payments` collection (Tenant DB)

> Source: V2_DATABASE.md §7.2

```typescript
{
  _id: ObjectId,
  invoiceId: ObjectId,         // → invoices
  patientId: ObjectId,         // → patients
  amount: Number,
  paymentMethod: String,       // "cash" | "card" | "bank_transfer" | "cheque" | "insurance" | "online" | "fawry" | "meeza"
  paymentReference: String,    // External reference (e.g., Fawry ref, Stripe PaymentIntent ID)
  status: String,              // "pending" | "completed" | "failed" | "refunded"
  notes: String,
  receivedBy: ObjectId,        // → users (staff who received payment)
  receivedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- `invoiceId`
- `patientId` + `createdAt`
- `receivedAt`

**isActive deviation (Decision §32):** Payments use `status: 'refunded'` instead of `isActive: false`.

### 2.2 Reconciliation Schema — `reconciliation` collection (Tenant DB)

> Source: V2_DATABASE.md §7.6, V2_DECISION_LOG §25

```typescript
{
  _id: ObjectId,
  branchId: ObjectId,          // → branches
  reconciliationDate: Date,
  openingBalance: Number,
  closingBalance: Number,
  cashReceived: Number,
  cardReceived: Number,
  onlineReceived: Number,
  insuranceReceived: Number,
  totalReceived: Number,
  expenses: Number,
  discrepancy: Number,         // closingBalance - (openingBalance + totalReceived - expenses)
  status: String,              // "open" | "closed" | "reviewed"
  closedBy: ObjectId,          // → users
  closedAt: Date,              // Decision §25 addition
  reviewedBy: ObjectId,        // → users
  reviewedAt: Date,            // Decision §25 addition
  createdBy: ObjectId,         // Decision §25 addition
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- `branchId` + `reconciliationDate`: unique

**Immutability:** Reconciliations are immutable once closed (Decision §32).

### 2.3 Online Payment Integration

> Source: DENTO_V2_MASTER_PLAN.md §29, TECH_REQUIREMENTS.md

**Provider selection by country:**

| Country    | Provider   | Methods                                                      |
| ---------- | ---------- | ------------------------------------------------------------ |
| Egypt (EG) | **Paymob** | Cards (Visa/MC/Meeza), Fawry, Mobile Wallets, InstaPay, ValU |
| All others | **Stripe** | Cards (Visa/MC/Amex), SEPA, Bank Transfer                    |

**Paymob Integration (Egypt):**

| Method          | Fee                         | Settlement |
| --------------- | --------------------------- | ---------- |
| Cards (Visa/MC) | 2.5% + 1 EGP                | T+2        |
| Meeza           | 1.0%                        | T+1        |
| Fawry           | 2.0% + 2 EGP                | T+2        |
| Mobile Wallets  | 1.5%                        | T+1        |
| InstaPay        | 3 EGP flat                  | Instant    |
| ValU (BNPL)     | 0% (customer pays interest) | T+7        |

**Paymob plugin location:** `apps/api/src/plugins/paymob.ts`

```typescript
// Payment Flow:
// 1. Auth Request → Paymob Token
// 2. Order Registration → Order ID
// 3. Payment Key → Token for Frontend
// 4. Frontend shows Paymob iframe/redirect
// 5. Webhook → Payment confirmed
```

**Fawry special case (offline):**

1. Tenant/Patient clicks "Fawry" → System generates Fawry Reference (10 digits)
2. Patient sees: "Pay X EGP with reference 1234567890 at any Fawry point"
3. Patient goes to kiosk, provides number, pays cash
4. Fawry Webhook → Paymob Webhook → our server
5. Invoice = paid, confirmation via Push/Email
6. Validity: 48h (then new reference needed)

**Environment Variables:**

- `PAYMOB_API_KEY`
- `PAYMOB_INTEGRATION_ID` (+ per-method: `PAYMOB_CARD_INTEGRATION_ID`, `PAYMOB_FAWRY_INTEGRATION_ID`, `PAYMOB_WALLET_INTEGRATION_ID`, `PAYMOB_VALU_INTEGRATION_ID`)
- `PAYMOB_HMAC_SECRET`
- `PAYMOB_IFRAME_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### 2.4 Webhook Events

> Source: BUILD_RULES.md §23

- `payment.received` — when payment is completed

### 2.5 File Structure

> Source: V2_STRUCTURE.md

**Backend:**

- `apps/api/src/tenant/routes/payments/`
- `apps/api/src/tenant/models/payment.model.ts`
- `apps/api/src/tenant/models/reconciliation.model.ts`
- `apps/api/src/tenant/services/payment.service.ts`
- `apps/api/src/tenant/services/reconciliation.service.ts`

**Frontend:**

- `apps/admin/src/features/payments/pages/PaymentsPage.tsx`
- `apps/admin/src/features/payments/components/PaymentForm.tsx`
- `apps/admin/src/features/payments/components/OnlinePayment.tsx` (Paymob/Stripe)
- `apps/admin/src/features/payments/components/PaymentReceipt.tsx`
- `apps/admin/src/features/payments/hooks/usePayments.ts`

**Shared:**

- `packages/shared/src/schemas/payment.schema.ts` (Zod)

---

## 3. Insurance Claims

### 3.1 Database Schema — `insurance_companies` collection (Tenant DB)

> Source: V2_DATABASE.md §7.5

```typescript
{
  _id: ObjectId,
  name: {
    en: String,
    ar: String
  },
  code: String,                  // Unique company code
  contactPerson: String,
  phone: String,
  email: String,
  coveragePercentage: Number,    // Default for new patients (0-100)
  maxCoverage: Number,           // Maximum coverage amount
  isActive: Boolean,             // NOTE: insurance_companies DO use isActive (unlike invoices/payments)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- `code`: unique
- `isActive`

### 3.2 Database Schema — `insurance_claims` collection (Tenant DB)

> Source: V2_DATABASE.md §7.5

```typescript
{
  _id: ObjectId,
  claimNumber: String,               // Auto-generated: "CLM-2026-00001" (sequential per tenant)
  patientId: ObjectId,               // → patients
  patientInsuranceIndex: Number,     // Index in patients.insurance[] array
  invoiceId: ObjectId,               // → invoices
  claimDate: Date,
  serviceDate: Date,
  totalAmount: Number,
  claimedAmount: Number,
  approvedAmount: Number,            // Set after insurance review
  patientResponsibility: Number,     // totalAmount - approvedAmount
  status: String,                    // "submitted" | "under_review" | "approved" | "partially_approved" | "denied" | "paid"
  denialReason: String,              // Set when status = "denied"
  documents: [{                      // Embedded array — claim attachments
    name: String,
    url: String,
    type: String
  }],
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- `claimNumber`: unique
- `patientId` + `createdAt`
- `status` + `claimDate`

### 3.3 Patient Insurance Embedded Array — `patients.insurance[]`

> Source: DENTO_V2_MASTER_PLAN.md §13, V2_DATABASE.md §5.1

```typescript
// Embedded in patients collection
insurance: [
  {
    insuranceCompanyId: ObjectId, // → insurance_companies
    policyNumber: String, // 🔒 AES-256-GCM ENCRYPTED (PII)
    groupNumber: String,
    memberId: String,
    coverageType: String, // "individual" | "family"
    coveragePercentage: Number, // 0-100, default from insurance_companies.coveragePercentage
    maxCoverage: Number,
    deductible: Number,
    deductibleMet: Number,
    effectiveDate: Date,
    expiryDate: Date,
    isPrimary: Boolean,
    isActive: Boolean, // Auto-set to false when expired
  },
];
```

**Module gating:** Patient insurance fields only visible when `insurance-claims` module is active for tenant.

### 3.4 Insurance Claim Document Attachments

> Source: SECURITY_AND_ENCRYPTION.md §8

- **Allowed format:** PDF only
- **Max size:** 10MB per file
- Stored in S3/R2

### 3.5 PII Encryption

> Source: SECURITY_AND_ENCRYPTION.md §5, BUILD_RULES.md §16

- `patients.insurance[].policyNumber` — encrypted with **AES-256-GCM**
- Encrypted at rest, decrypted only when needed for display
- HIPAA compliant (PHI encryption required)

### 3.6 Insurance Aging Report Aggregation Pipeline

> Source: V2_DECISION_LOG.md §5

```javascript
// Insurance Aging Report pipeline (cached in Redis for 5 minutes)
const pipeline = [
  { $match: { status: { $in: ['submitted', 'under_review', 'approved', 'partially_approved'] } } },
  {
    $addFields: {
      ageDays: { $dateDiff: { startDate: '$claimDate', endDate: '$$NOW', unit: 'day' } },
    },
  },
  {
    $bucket: {
      groupBy: '$ageDays',
      boundaries: [0, 31, 61, 91, Infinity],
      default: '90+',
      output: { count: { $sum: 1 }, totalAmount: { $sum: '$claimedAmount' } },
    },
  },
];
```

### 3.7 Module Pricing

> Source: PLATFORM_RBAC.md

- `billing-invoicing` module: **$39/Mo**
- `insurance-claims` module: **$39/Mo** (depends on billing-invoicing being active)

### 3.8 File Structure

> Source: V2_STRUCTURE.md

**Backend:**

- `apps/api/src/tenant/routes/insurance/`
- `apps/api/src/tenant/models/insurance-company.model.ts`
- `apps/api/src/tenant/models/insurance-claim.model.ts`
- `apps/api/src/tenant/services/insurance.service.ts`

**Frontend:**

- `apps/admin/src/features/insurance/pages/InsurancePage.tsx`
- `apps/admin/src/features/insurance/components/ClaimForm.tsx`
- `apps/admin/src/features/insurance/components/CompanyList.tsx`
- `apps/admin/src/features/insurance/hooks/useInsurance.ts`

**Shared:**

- `packages/shared/src/schemas/insurance.schema.ts` (Zod)

---

## 4. Installment Plans

### 4.1 Database Schema — `installment_plans` collection (Tenant DB)

> Source: V2_DATABASE.md §7.4

```typescript
{
  _id: ObjectId,
  invoiceId: ObjectId,             // → invoices
  patientId: ObjectId,             // → patients
  totalAmount: Number,
  downPayment: Number,
  remainingAmount: Number,         // totalAmount - downPayment
  numberOfInstallments: Number,
  installmentAmount: Number,       // remainingAmount / numberOfInstallments
  frequency: String,               // "weekly" | "biweekly" | "monthly"
  status: String,                  // "active" | "completed" | "defaulted" | "cancelled"

  // Embedded payments array
  payments: [{
    installmentNumber: Number,
    dueDate: Date,
    amountDue: Number,
    amountPaid: Number,
    lateFee: Number,
    status: String,                // "pending" | "paid" | "overdue" | "waived"
    paidAt: Date,
    paymentId: ObjectId            // → payments collection
  }],

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- `patientId` + `status`
- `invoiceId`
- `payments.dueDate` + `payments.status`

### 4.2 File Structure

> Source: V2_STRUCTURE.md

**Backend:**

- `apps/api/src/tenant/routes/installments/`
- `apps/api/src/tenant/models/installment-plan.model.ts`
- `apps/api/src/tenant/services/installment.service.ts`

**Frontend:**

- `apps/admin/src/features/installments/pages/InstallmentsPage.tsx`
- `apps/admin/src/features/installments/components/InstallmentPlanForm.tsx`
- `apps/admin/src/features/installments/hooks/useInstallments.ts`

**Shared:**

- `packages/shared/src/schemas/installment.schema.ts` (Zod)

---

## 5. Doctor Commissions

### 5.1 Database Schema — `doctor_commissions` collection (Tenant DB)

> Source: V2_DATABASE.md §7.3

```typescript
{
  _id: ObjectId,
  doctorId: ObjectId,              // → doctors/users
  appointmentId: ObjectId,         // → appointments
  invoiceId: ObjectId,             // → invoices
  procedureName: String,
  procedureAmount: Number,         // Amount of the procedure on the invoice
  commissionRate: Number,          // Percentage (e.g., 0.30 for 30%)
  commissionAmount: Number,        // procedureAmount * commissionRate
  status: String,                  // "pending" | "approved" | "paid" | "cancelled"
  paidAt: Date,
  payoutId: ObjectId,              // → commission_payouts (set when part of a payout)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- `doctorId` + `status`
- `payoutId`

### 5.2 Database Schema — `commission_payouts` collection (Tenant DB)

> Source: V2_DATABASE.md §7.3

```typescript
{
  _id: ObjectId,
  doctorId: ObjectId,              // → doctors/users
  payoutDate: Date,
  periodStart: Date,               // Commission period start
  periodEnd: Date,                 // Commission period end
  totalAmount: Number,             // Sum of all linked commissions
  paymentMethod: String,           // How the payout was made
  reference: String,               // External reference number
  createdBy: ObjectId,             // → users (admin who processed payout)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- `doctorId` + `payoutDate`

### 5.3 File Structure

> Source: V2_STRUCTURE.md

**Backend:**

- `apps/api/src/tenant/routes/commissions/`
- `apps/api/src/tenant/models/doctor-commission.model.ts`
- `apps/api/src/tenant/models/commission-payout.model.ts`
- `apps/api/src/tenant/services/commission.service.ts`

**Frontend:**

- `apps/admin/src/features/commissions/pages/CommissionsPage.tsx`
- `apps/admin/src/features/commissions/components/CommissionConfig.tsx`
- `apps/admin/src/features/commissions/components/PayoutTable.tsx`
- `apps/admin/src/features/commissions/hooks/useCommissions.ts`

**Shared:**

- `packages/shared/src/schemas/commission.schema.ts` (Zod)

---

## 6. Financial Reports

### 6.1 Two-Tier Model

> Source: DENTO_V2_MASTER_PLAN.md §21

| Module                  | Slug                 | Price   | Content                                                                                         |
| ----------------------- | -------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| **Dashboard & Reports** | `dashboard-reports`  | Free    | Dashboard widgets, basic reports (current period only, no historical)                           |
| **Advanced Analytics**  | `advanced-analytics` | $199/Mo | All reports, custom date ranges, charts, drill-down, exports, scheduled reports, custom reports |

### 6.2 Financial Reports (7 reports)

> Source: DENTO_V2_MASTER_PLAN.md §21

| #   | Report                           | Description                                                      | Aggregation                                                           | Module                                              |
| --- | -------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| F1  | **Revenue Summary**              | Revenue by period (day/week/month/quarter/year) with trend chart | `invoices` → `$group` by period, `$sum` totalAmount WHERE status=paid | Free (current month), Advanced (historical + chart) |
| F2  | **Revenue by Doctor**            | Revenue ranking by doctor with percentage share                  | `invoices` → `$lookup` appointments → `$group` by doctorId            | Advanced                                            |
| F3  | **Revenue by Service**           | Revenue by service type/category                                 | `invoices.items` → `$unwind` → `$group` by serviceId                  | Advanced                                            |
| F4  | **Revenue by Branch**            | Revenue comparison between branches                              | `invoices` → `$group` by branchId                                     | Advanced (Multi-Branch)                             |
| F5  | **Payment Collection**           | Payment receipts by method (Cash/Card/Bank/Insurance)            | `payments` → `$group` by method, `$sum` amount                        | Advanced                                            |
| F6  | **Outstanding Invoices (Aging)** | Open invoices by age (0-30, 31-60, 61-90, 90+ days)              | `invoices` WHERE status≠paid → `$bucket` by age                       | Advanced                                            |
| F7  | **Tax Report**                   | Tax overview by period (for accountant)                          | `invoices` → `$group` by period, `$sum` taxAmount                     | Advanced                                            |

### 6.3 Operational Reports (Financial-related)

> Source: DENTO_V2_MASTER_PLAN.md §21

| #   | Report                   | Description                                          | Aggregation                                         |
| --- | ------------------------ | ---------------------------------------------------- | --------------------------------------------------- |
| O1  | **Commission Summary**   | Commissions by doctor, status (pending/paid), period | `doctor_commissions` → `$group` by doctorId, status |
| O2  | **Daily Reconciliation** | Daily close with expected vs. actual comparison      | `reconciliation` → by date, branch                  |

### 6.4 Aggregation Pipeline Examples

> Source: DENTO_V2_MASTER_PLAN.md §21, V2_DECISION_LOG.md §5

**Revenue Summary (F1):**

```javascript
const pipeline = [
  { $match: { status: 'paid', paidAt: { $gte: startOfYear, $lte: endOfYear } } },
  {
    $group: {
      _id: { $month: '$paidAt' },
      totalRevenue: { $sum: '$totalAmount' },
      invoiceCount: { $sum: 1 },
      avgInvoice: { $avg: '$totalAmount' },
    },
  },
  { $sort: { _id: 1 } },
  {
    $project: {
      month: '$_id',
      totalRevenue: 1,
      invoiceCount: 1,
      avgInvoice: { $round: ['$avgInvoice', 2] },
    },
  },
];
```

**Outstanding Invoices Aging (F6):**

```javascript
const pipeline = [
  { $match: { status: { $in: ['sent', 'overdue', 'partially_paid'] } } },
  {
    $addFields: {
      ageDays: { $dateDiff: { startDate: '$issuedAt', endDate: '$$NOW', unit: 'day' } },
    },
  },
  {
    $bucket: {
      groupBy: '$ageDays',
      boundaries: [0, 31, 61, 91, Infinity],
      default: '90+',
      output: {
        count: { $sum: 1 },
        totalAmount: { $sum: '$balanceDue' },
        invoices: {
          $push: { id: '$_id', patient: '$patientId', amount: '$balanceDue', age: '$ageDays' },
        },
      },
    },
  },
];
```

**Caching:** All report aggregation results cached in Redis for 5 minutes.

### 6.5 Dashboard Widgets (Free tier)

> Source: DENTO_V2_MASTER_PLAN.md §21

| Widget                 | Data                                                     | Visualization         |
| ---------------------- | -------------------------------------------------------- | --------------------- |
| **Revenue This Month** | Current month revenue + trend vs. previous month (↑/↓ %) | Stat-Card + Sparkline |

v2 actually calculates the comparison with previous month via aggregation pipeline (v1 had the prop but never populated it).

### 6.6 Report UI Layout (Standard for all reports)

> Source: DENTO_V2_MASTER_PLAN.md §21

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Reports    [Report Title]          ⬇ Export   │
├──────────────────────────────────────────────────────────┤
│  📅 Date Range: [from] - [to]                             │
│  🏥 Branch: [All Branches ▼]   👨‍⚕️ Doctor: [All ▼]       │
│  [Apply Filters]  [Save as Report]  [Schedule]            │
├──────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Total   │ │ Average │ │ Highest │ │ Count   │       │
│  │ $45,200 │ │ $6,457  │ │ $12,300 │ │ 156     │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├──────────────────────────────────────────────────────────┤
│  📊 [Bar Chart / Line Chart / Pie Chart Toggle]           │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Recharts Visualization               │    │
│  └──────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────┤
│  📋 Detail Table (TanStack Table — sortable)              │
│  Doctor    │ Revenue  │ Patients │ Avg/Visit │ %         │
│  ...       │          │          │           │           │
└──────────────────────────────────────────────────────────┘
```

**All report endpoints accept query parameters:**

- `from`, `to` — Date Range (ISO 8601)
- `branchId` — Branch filter (optional, Multi-Branch module)
- `doctorId` — Doctor filter (optional)
- `format` — Response format: `json` (default) | `csv` | `excel` | `pdf`

### 6.7 Report API Endpoints

> Source: DENTO_V2_MASTER_PLAN.md §21

| #   | Method | Route                            | Module   | Description                                 |
| --- | ------ | -------------------------------- | -------- | ------------------------------------------- |
| 1   | GET    | `/api/dashboard/stats`           | Free     | Dashboard widget data                       |
| 2   | GET    | `/api/dashboard/trends`          | Free     | Trend comparison current vs. previous month |
| 3   | GET    | `/api/reports/financial/:type`   | Advanced | Financial report data (F1-F7)               |
| 7   | GET    | `/api/reports/operational/:type` | Advanced | Operational report data (O1-O4)             |
| 8   | POST   | `/api/reports/export`            | Advanced | Export report (PDF/CSV/Excel)               |
| 9   | GET    | `/api/reports/saved`             | Advanced | List saved reports                          |
| 10  | POST   | `/api/reports/saved`             | Advanced | Save report configuration                   |
| 11  | DELETE | `/api/reports/saved/:id`         | Advanced | Delete saved report                         |
| 12  | GET    | `/api/reports/scheduled`         | Advanced | List scheduled reports                      |
| 13  | POST   | `/api/reports/scheduled`         | Advanced | Create new schedule                         |
| 14  | PATCH  | `/api/reports/scheduled/:id`     | Advanced | Edit schedule                               |
| 15  | DELETE | `/api/reports/scheduled/:id`     | Advanced | Delete schedule                             |
| 16  | POST   | `/api/reports/scheduled/:id/run` | Advanced | Run schedule immediately                    |

### 6.8 Report RBAC Permissions

> Source: DENTO_V2_MASTER_PLAN.md §21

| Permission                 | Roles                                     |
| -------------------------- | ----------------------------------------- |
| `reports.dashboard.view`   | All staff (Free)                          |
| `reports.basic.view`       | admin, manager, doctor, accountant (Free) |
| `reports.advanced.view`    | admin, manager, accountant (Advanced)     |
| `reports.financial.view`   | admin, manager, accountant (Advanced)     |
| `reports.export`           | admin, manager, accountant (Advanced)     |
| `reports.schedules.manage` | admin, manager (Advanced)                 |
| `reports.saved.manage`     | admin, manager, accountant (Advanced)     |

### 6.9 Report Webhook Events

> Source: DENTO_V2_MASTER_PLAN.md §21

- `report.generated` — Scheduled report successfully generated
- `report.generation_failed` — Report generation failed
- `report.exported` — Manual export performed
- `report.schedule.created` — New schedule created
- `report.schedule.deleted` — Schedule deleted

### 6.10 UI Pages

> Source: DENTO_V2_MASTER_PLAN.md §21

| Page                | Route                        | Module   |
| ------------------- | ---------------------------- | -------- |
| Dashboard           | `/`                          | Free     |
| Reports Hub         | `/reports`                   | Free     |
| Financial Reports   | `/reports/financial/:type`   | Advanced |
| Operational Reports | `/reports/operational/:type` | Advanced |
| Saved Reports       | `/reports/saved`             | Advanced |
| Scheduled Reports   | `/reports/scheduled`         | Advanced |

Locked reports show preview with blur + "Upgrade to Advanced Analytics" CTA.

### 6.11 Sidebar Integration

```
📊 Reports
  ├── Dashboard               ← Free (dashboard-reports)
  ├── Reports Hub              ← Free (overview, locked reports marked)
  ├── Financial               ← Advanced Analytics 🔒
  └── Operational             ← Advanced Analytics 🔒
```

### 6.12 File Structure

> Source: V2_STRUCTURE.md

**Backend:**

- `apps/api/src/tenant/routes/reports/` (with `pipelines/` subfolder for aggregation pipelines)
- `apps/api/src/tenant/services/report.worker.ts` (BullMQ report generation worker)

**Frontend:**

- `apps/admin/src/features/reports/pages/ReportsHub.tsx` (36 total reports overview)
- `apps/admin/src/features/reports/pages/FinancialReports.tsx`
- `apps/admin/src/features/reports/components/ChartWrapper.tsx` (Recharts)
- `apps/admin/src/features/reports/components/DateRangePicker.tsx`
- `apps/admin/src/features/reports/components/ExportButtons.tsx` (CSV/Excel/PDF)
- `apps/admin/src/features/reports/hooks/useReports.ts`

---

## 7. PDF Export System

### 7.1 Library

> Source: TECH_REQUIREMENTS.md, DENTO_V2_MASTER_PLAN.md §15, §21

- **Library:** `@react-pdf/renderer` (Latest) — React components → PDF, server-side, no Puppeteer needed
- v1→v2 change: `window.print()` only → `window.print()` + PDF Export

### 7.2 PDF Service

> Source: V2_STRUCTURE.md

- `apps/api/src/tenant/services/pdf.service.ts`
- Handles generation of Invoice PDFs, Payment Receipts, Report PDFs

### 7.3 Export Flow

> Source: DENTO_V2_MASTER_PLAN.md §21

```
POST /api/reports/export
Body: { reportType, params, format }

1. Run aggregation pipeline (same as UI)
2. Switch format:
   csv   → @fast-csv/format → Stream Response
   excel → exceljs Workbook → Stream Response
   pdf   → @react-pdf/renderer → Buffer → Stream
3. Response Headers:
   Content-Disposition: attachment; filename=...
   Content-Type: application/octet-stream
```

### 7.4 Export Libraries

| Format | Library               | Use Case                                  |
| ------ | --------------------- | ----------------------------------------- |
| CSV    | `@fast-csv/format`    | Tabular data, fast, small                 |
| Excel  | `exceljs`             | Multi-sheet, formatting, formulas, charts |
| PDF    | `@react-pdf/renderer` | React components → PDF (server-side)      |

---

## 8. Scheduled & Saved Reports (BullMQ)

### 8.1 `report_schedules` collection (Tenant DB)

> Source: DENTO_V2_MASTER_PLAN.md §21

```typescript
{
  _id: ObjectId,
  tenantId: String,

  // Which report
  reportType: String,              // 'financial.revenue_summary' | 'financial.aging' | ...
  reportParams: {
    period: String,                // 'monthly'
    branchId: ObjectId | null,
    doctorId: ObjectId | null,
    dateRange: { from: Date, to: Date } | null  // null = rolling (last month)
  },

  // Schedule
  frequency: String,               // 'daily' | 'weekly' | 'monthly'
  dayOfWeek: Number | null,        // 0=Sun..6=Sat (for weekly)
  dayOfMonth: Number | null,       // 1-28 (for monthly)
  time: String,                    // '08:00' (UTC)
  timezone: String,                // 'Africa/Cairo'

  // Delivery
  deliveryMethod: String,          // 'email' | 'in_app' | 'both'
  recipients: [ObjectId],          // User IDs
  emailAddresses: [String],        // External emails (accountant, etc.)
  format: String,                  // 'pdf' | 'csv' | 'excel'

  // Meta
  name: String,                    // 'Monthly Revenue Report'
  createdBy: ObjectId,
  isActive: Boolean,
  lastRunAt: Date | null,
  nextRunAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 8.2 BullMQ Worker Architecture

> Source: DENTO_V2_MASTER_PLAN.md §21

```
┌─────────────────────────────────────────────────────┐
│  BullMQ Cron Job: report-scheduler (daily 00:05)    │
├─────────────────────────────────────────────────────┤
│  1. Find all report_schedules WHERE                 │
│     nextRunAt ≤ NOW AND isActive = true             │
│  2. For each: enqueue job in 'report-generation'    │
│  3. Update nextRunAt based on frequency             │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  Worker: report-generation  │
         ├────────────────────────────┤
         │  1. useDb(tenantDbName)     │
         │  2. Run Aggregation Pipeline│
         │  3. Generate PDF/CSV/Excel  │
         │  4. Upload to S3/R2         │
         │  5. Deliver:                │
         │     - Email → Resend        │
         │     - In-App → Notification │
         │  6. Log in report_history   │
         └────────────────────────────┘
```

---

## 9. Bulk Notifications

> Source: DENTO_V2_MASTER_PLAN.md §31

**Phase 4 feature:** Send notifications to groups or all patients. Listed in §31 New Features table as Phase 4.

Channels: SMS, Email, WhatsApp, Push (via BullMQ notification workers from Phase 2/3 infrastructure).

---

## 10. Cross-Cutting Requirements

### 10.1 Security

> Source: SECURITY_AND_ENCRYPTION.md, BUILD_RULES.md §16

| Requirement              | Detail                                                                                       | Source                                    |
| ------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **PII Encryption**       | `patients.insurance[].policyNumber` — AES-256-GCM                                            | SECURITY §5                               |
| **Webhook HMAC**         | HMAC-SHA256, Stripe-compatible format: `X-Dento-Signature: t=<unix_timestamp>,v1=<hmac_hex>` | SECURITY §6.3                             |
| **Replay Protection**    | 5-minute window on webhook signatures                                                        | SECURITY §6.3                             |
| **PCI DSS**              | Via provider (Stripe/Paymob) — no card data stored in our DB                                 | TECH_REQUIREMENTS, IMPLEMENTATION_ROADMAP |
| **Input Validation**     | Zod `.strict()` on every endpoint                                                            | SECURITY §7                               |
| **File Upload Security** | Insurance claim documents: PDF only, 10MB max                                                | SECURITY §8                               |
| **Audit Logging**        | Every financial mutation must be audit logged                                                | BUILD_RULES §16, SECURITY §10             |
| **Rate Limiting**        | 3-tier rate limiting on financial endpoints                                                  | BUILD_RULES §16                           |
| **HIPAA**                | Encryption required for PHI (insurance data)                                                 | SECURITY §14                              |
| **GDPR**                 | Patient data export (JSON/PDF)                                                               | SECURITY §14                              |

### 10.2 RBAC

> Source: BUILD_RULES.md §17.4, PLATFORM_RBAC.md

**Hierarchy:** `platform_owner > platform_admin > owner > admin > office_manager > dentist > hygienist > receptionist`

- Permissions are code-defined (not DB-driven)
- Row-Level Security per role
- Tenant-level financial endpoints use `roleGuard()` middleware (not `platformGuard()`)

### 10.3 RTL Support

> Source: BUILD_RULES.md §11

- All Phase 4 UI must support RTL using **logical CSS properties**
- Recharts uses `reversed` props for RTL axes

### 10.4 Form Pattern

> Source: BUILD_RULES.md §8

- All forms: **React Hook Form + Zod + shared schema**
- Shared schemas in `packages/shared/src/schemas/`
- Form→API field mapping must match end-to-end (BUILD_RULES §24)

### 10.5 Table Pattern

> Source: BUILD_RULES.md §9

- All tables: **TanStack React Table 8**
- All charts: **Recharts 2.x**

### 10.6 Hook Pattern

> Source: BUILD_RULES.md §8

- All data hooks: **React Query** (TanStack Query)
- Hooks: `useInvoices`, `usePayments`, `useInsurance`, `useCommissions`, `useInstallments`, `useReports`

### 10.7 Route Prefix

> Source: V2_DECISION_LOG.md §33

- Use `/api/` for all routes (NOT `/tenant-api/`)

### 10.8 Naming Conventions

> Source: V2_STRUCTURE.md

- Models: `kebab-case.model.ts` (e.g., `invoice.model.ts`, `doctor-commission.model.ts`)
- Routes: `kebab-case.route.ts`
- Services: `kebab-case.service.ts`

### 10.9 NPM Dependencies (Phase 4)

> Source: TECH_REQUIREMENTS.md

| Package               | Version | Purpose                              |
| --------------------- | ------- | ------------------------------------ |
| `stripe`              | Latest  | Stripe payment integration           |
| `paymob-node`         | Latest  | Paymob payment integration (Egypt)   |
| `@react-pdf/renderer` | Latest  | React components → PDF (server-side) |
| `@fast-csv/format`    | Latest  | CSV export                           |
| `exceljs`             | Latest  | Excel export                         |

### 10.10 Environment Variables (Phase 4)

> Source: TECH_REQUIREMENTS.md

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYMOB_API_KEY=
PAYMOB_INTEGRATION_ID=
PAYMOB_HMAC_SECRET=
```

Additional Paymob-specific (from §29):

```env
PAYMOB_CARD_INTEGRATION_ID=
PAYMOB_FAWRY_INTEGRATION_ID=
PAYMOB_WALLET_INTEGRATION_ID=
PAYMOB_VALU_INTEGRATION_ID=
PAYMOB_IFRAME_ID=
```

### 10.11 Every Button Must Be Functional

> Source: BUILD_RULES.md §24

- Every route connected, every button functional
- Form→API field mapping must match end-to-end
- No mock buttons, no placeholder pages

---

## Summary: Phase 4 Deliverables Checklist

### Week 18 (Invoices + Payments)

- [ ] `invoices` collection + model + schema + service + routes
- [ ] Invoice CRUD (create draft, issue, cancel, refund)
- [ ] Invoice line items (embedded array)
- [ ] Invoice PDF generation (`@react-pdf/renderer`)
- [ ] Invoice number auto-generation (INV-YYYY-NNNNN)
- [ ] Tax calculation from `country_config`
- [ ] Per-invoice currency override
- [ ] `payments` collection + model + schema + service + routes
- [ ] Payment CRUD (record cash/card/cheque/bank_transfer/insurance)
- [ ] Payment→Invoice linking (update `amountPaid`, `balanceDue`, `status`)
- [ ] `reconciliation` collection + model + service + routes
- [ ] Daily reconciliation workflow (open → close → review)
- [ ] Paymob plugin (`apps/api/src/plugins/paymob.ts`)
- [ ] Stripe integration
- [ ] Online payment flow (Paymob iframe, Stripe Checkout)
- [ ] Fawry offline payment flow (reference generation, 48h expiry)
- [ ] Payment webhook HMAC-SHA256 verification (5-min replay protection)
- [ ] Payment receipts
- [ ] Webhook events: `invoice.issued`, `invoice.paid`, `payment.received`
- [ ] Frontend: InvoiceListPage, InvoiceDetailPage, InvoiceForm, InvoiceLineItems, InvoicePDF
- [ ] Frontend: PaymentsPage, PaymentForm, OnlinePayment, PaymentReceipt

### Week 19 (Insurance + Installments)

- [ ] `insurance_companies` collection + model + service + routes
- [ ] Insurance company CRUD (name {en,ar}, code, coverage %, max coverage)
- [ ] Patient insurance embedded array (with policyNumber AES-256-GCM encryption)
- [ ] `insurance_claims` collection + model + schema + service + routes
- [ ] Insurance claim CRUD + status flow (submitted → under_review → approved/denied → paid)
- [ ] Claim number auto-generation (CLM-YYYY-NNNNN)
- [ ] Claim↔Invoice linking
- [ ] Claim document attachments (PDF only, 10MB max, S3/R2)
- [ ] `installment_plans` collection + model + schema + service + routes
- [ ] Installment plan creation (down payment, frequency, auto-calculate amounts)
- [ ] Installment payment tracking (embedded payments array)
- [ ] Late fee handling
- [ ] Installment status management (active → completed/defaulted/cancelled)
- [ ] Frontend: InsurancePage, ClaimForm, CompanyList
- [ ] Frontend: InstallmentsPage, InstallmentPlanForm

### Week 20 (Commissions + Reports + PDF + Notifications)

- [ ] `doctor_commissions` collection + model + schema + service + routes
- [ ] Commission calculation from invoice procedure amounts
- [ ] Commission rate configuration per doctor
- [ ] `commission_payouts` collection + model + service + routes
- [ ] Payout workflow (select period → approve commissions → create payout)
- [ ] 7 Financial Reports (F1-F7) with aggregation pipelines
- [ ] 2 Operational Reports (O1-O2: Commission Summary, Daily Reconciliation)
- [ ] Report aggregation pipeline caching (Redis, 5 min)
- [ ] PDF export system (`@react-pdf/renderer`, server-side)
- [ ] CSV export (`@fast-csv/format`)
- [ ] Excel export (`exceljs`)
- [ ] `POST /api/reports/export` endpoint
- [ ] `report_schedules` collection + BullMQ cron worker
- [ ] Scheduled report generation + delivery (email via Resend, in-app notification)
- [ ] Saved report configurations CRUD
- [ ] Bulk notifications (to groups/all patients)
- [ ] Report UI: ReportsHub, FinancialReports, ChartWrapper, DateRangePicker, ExportButtons
- [ ] Frontend: CommissionsPage, CommissionConfig, PayoutTable
- [ ] Sidebar Reports section with locked preview for unpaid modules

### Cross-Cutting (All Weeks)

- [ ] All schemas in `packages/shared/src/schemas/` (invoice, payment, insurance, commission, installment)
- [ ] Zod `.strict()` validation on every endpoint
- [ ] Audit logging on every financial mutation
- [ ] 3-tier rate limiting on financial endpoints
- [ ] RTL support on all UI (logical CSS properties)
- [ ] RBAC permissions (`reports.financial.view`, `reports.export`, `reports.schedules.manage`, etc.)
- [ ] 65% test coverage (statements/functions/lines), 55% branches
- [ ] React Query hooks (useInvoices, usePayments, useInsurance, useCommissions, useInstallments, useReports)
- [ ] TanStack React Table 8 for all tables
- [ ] Recharts 2.x for all charts
- [ ] Module gating: `billing-invoicing` ($39/Mo), `insurance-claims` ($39/Mo, depends on billing), `advanced-analytics` ($199/Mo)
