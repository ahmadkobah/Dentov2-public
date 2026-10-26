# Phase 4 Financial Module — Consolidated Reference Guide

> **Auto-extracted from 9 planning documents.** This guide contains EVERY rule, pattern, field, index, route, and convention relevant to Phase 4 implementation.
>
> **Document Authority Hierarchy** (Decision Log #26):
> `V2_DECISION_LOG.md` > `V2_DATABASE.md` > `SECURITY_AND_ENCRYPTION.md` > `IMPLEMENTATION_ROADMAP.md` > `TECH_REQUIREMENTS.md` > `V2_STRUCTURE.md` > `ADMIN_PORTAL_SCREENS.md` > `DEV_PORTAL_SCREENS.md` > `DENTO_V2_MASTER_PLAN.md`

---

## Table of Contents

1. [DATABASE SCHEMAS](#1-database-schemas)
2. [API ROUTE PATTERNS](#2-api-route-patterns)
3. [FILE NAMING CONVENTIONS](#3-file-naming-conventions)
4. [SECURITY REQUIREMENTS](#4-security-requirements)
5. [UI PATTERNS](#5-ui-patterns)
6. [RBAC RULES](#6-rbac-rules)
7. [BUILD RULES](#7-build-rules)
8. [DECISION LOG OVERRIDES](#8-decision-log-overrides)
9. [TESTING REQUIREMENTS](#9-testing-requirements)
10. [PAYMENT GATEWAY INTEGRATION](#10-payment-gateway-integration)
11. [REPORTS & ANALYTICS](#11-reports--analytics)
12. [WEBHOOK EVENTS](#12-webhook-events)

---

## 1. DATABASE SCHEMAS

> Source: `V2_DATABASE.md` §7 (Billing & Finance), Decision Log #24, #32

### Architecture

- **Database-per-Tenant**: `tenant_{slug}` databases via `mongoose.connection.useDb(slug, { useCache: true })`
- **Platform DB**: `dento_platform` (22 collections + 4 globals)
- **Tenant DB**: 56 collections per tenant (includes all financial collections below)
- **maxPoolSize**: 50
- **Embedding Strategy**: Embed when child data is always loaded with parent AND child count is bounded

### Standard Fields (EVERY Collection)

Every collection MUST include:

```typescript
{
  isActive:    { type: Boolean, default: true },  // Soft-delete (BUT SEE Decision #32 below)
  createdBy:   { type: ObjectId, ref: 'User' },
  updatedBy:   { type: ObjectId, ref: 'User' },
  timestamps:  true,                               // Mongoose auto: createdAt + updatedAt
}
```

> **CRITICAL — Decision #32**: Financial collections (`invoices`, `payments`, `reconciliation`) use **STATUS-BASED lifecycle** instead of `isActive` boolean. `status: 'cancelled'` replaces `isActive: false` for invoices. Reconciliations are **IMMUTABLE** once closed.

### Naming Conventions

| Element     | Convention  | Example                          |
| :---------- | :---------- | :------------------------------- |
| Model name  | PascalCase  | `Invoice`, `InsuranceClaim`      |
| Field name  | camelCase   | `invoiceNumber`, `unitPrice`     |
| Boolean     | `is` prefix | `isActive`, `isPaid`             |
| Date        | `At` suffix | `paidAt`, `closedAt`             |
| Reference   | `entityId`  | `patientId`, `invoiceId`         |
| Enum values | snake_case  | `partially_paid`, `under_review` |

---

### 1.1 `invoices`

```typescript
{
  invoiceNumber:        String,    // Auto-generated: "INV-{YYYY}-{00001}" (unique)
  patientId:            ObjectId,  // → patients
  branchId:             ObjectId,  // → branches
  appointmentId:        ObjectId,  // → appointments (optional)
  treatmentPlanId:      ObjectId,  // → treatment_plans (optional)

  items: [{                        // EMBEDDED array
    description:        String,
    treatmentId:        ObjectId,  // → procedure_notes (optional)
    serviceId:          ObjectId,  // → services (optional)
    quantity:           Number,
    unitPrice:          Number,
    discount:           Number,    // per-item discount
    total:              Number,
  }],

  subtotal:             Number,
  discountAmount:       Number,
  discountPercentage:   Number,
  taxAmount:            Number,
  taxPercentage:        Number,    // From country_config
  totalAmount:          Number,
  amountPaid:           Number,
  balanceDue:           Number,

  status:               String,    // Enum: draft | issued | paid | partially_paid | overdue | cancelled | refunded
  issueDate:            Date,
  dueDate:              Date,
  paidAt:               Date,
  notes:                String,
  terms:                String,

  insuranceClaimId:     ObjectId,  // → insurance_claims (optional)
  insuredAmount:        Number,
  patientResponsibility: Number,

  createdBy:            ObjectId,  // → users

  // NO isActive field — uses status-based lifecycle (Decision #32)
  // status: 'cancelled' replaces isActive: false
}
```

**Indexes:**

| Index                             | Type     | Notes                   |
| :-------------------------------- | :------- | :---------------------- |
| `{ invoiceNumber: 1 }`            | unique   | Auto-generated format   |
| `{ patientId: 1, createdAt: -1 }` | compound | Patient invoice history |
| `{ status: 1, dueDate: 1 }`       | compound | Overdue filtering       |
| `{ branchId: 1, issueDate: 1 }`   | compound | Branch revenue reports  |

---

### 1.2 `payments`

```typescript
{
  invoiceId:            ObjectId,  // → invoices
  patientId:            ObjectId,  // → patients
  amount:               Number,
  paymentMethod:        String,    // Enum: cash | card | bank_transfer | cheque | insurance | online | fawry | meeza
  paymentReference:     String,
  status:               String,    // Enum: pending | completed | failed | refunded
  notes:                String,
  receivedBy:           ObjectId,  // → users
  receivedAt:           Date,

  // NO isActive field — uses status-based lifecycle (Decision #32)
}
```

**Indexes:**

| Index                             | Type     |
| :-------------------------------- | :------- |
| `{ invoiceId: 1 }`                | compound |
| `{ patientId: 1, createdAt: -1 }` | compound |
| `{ receivedAt: -1 }`              | single   |

---

### 1.3 `doctor_commissions`

```typescript
{
  doctorId:             ObjectId,  // → users (doctor)
  appointmentId:        ObjectId,  // → appointments
  invoiceId:            ObjectId,  // → invoices
  procedureName:        String,
  procedureAmount:      Number,
  commissionRate:       Number,    // Percentage (from doctor.commissionRate)
  commissionAmount:     Number,    // Calculated: procedureAmount × commissionRate
  status:               String,    // Enum: pending | approved | paid | cancelled
  paidAt:               Date,
  payoutId:             ObjectId,  // → commission_payouts
}
```

**Indexes:**

| Index                        | Type     |
| :--------------------------- | :------- |
| `{ doctorId: 1, status: 1 }` | compound |
| `{ payoutId: 1 }`            | single   |

---

### 1.4 `commission_payouts`

```typescript
{
  doctorId:             ObjectId,  // → users (doctor)
  payoutDate:           Date,
  periodStart:          Date,
  periodEnd:            Date,
  totalAmount:          Number,
  paymentMethod:        String,
  reference:            String,
  createdBy:            ObjectId,  // → users
}
```

**Indexes:**

| Index                             | Type     |
| :-------------------------------- | :------- |
| `{ doctorId: 1, payoutDate: -1 }` | compound |

---

### 1.5 `installment_plans`

```typescript
{
  invoiceId:            ObjectId,  // → invoices
  patientId:            ObjectId,  // → patients
  totalAmount:          Number,
  downPayment:          Number,
  remainingAmount:      Number,
  numberOfInstallments: Number,
  installmentAmount:    Number,
  frequency:            String,    // Enum: weekly | biweekly | monthly

  status:               String,    // Enum: active | completed | defaulted | cancelled

  payments: [{                     // EMBEDDED array
    installmentNumber:  Number,
    dueDate:            Date,
    amountDue:          Number,
    amountPaid:         Number,
    lateFee:            Number,
    status:             String,    // Enum: pending | paid | overdue | waived
    paidAt:             Date,
    paymentId:          ObjectId,  // → payments
  }],
}
```

**Indexes:**

| Index                                             | Type     |
| :------------------------------------------------ | :------- |
| `{ patientId: 1, status: 1 }`                     | compound |
| `{ invoiceId: 1 }`                                | single   |
| `{ 'payments.dueDate': 1, 'payments.status': 1 }` | compound |

---

### 1.6 `insurance_companies`

```typescript
{
  name: {
    en:                 String,
    ar:                 String,
  },
  code:                 String,    // Unique
  contactPerson:        String,
  phone:                String,
  email:                String,
  coveragePercentage:   Number,
  maxCoverage:          Number,
  isActive:             Boolean,   // Standard isActive applies here (not status-based)
}
```

**Indexes:**

| Index             | Type   |
| :---------------- | :----- |
| `{ code: 1 }`     | unique |
| `{ isActive: 1 }` | single |

---

### 1.7 `insurance_claims`

```typescript
{
  claimNumber:          String,    // Auto-generated: "CLM-{YYYY}-{00001}" (unique)
  patientId:            ObjectId,  // → patients
  patientInsuranceIndex: Number,   // Index in patients.insurance[] array
  invoiceId:            ObjectId,  // → invoices
  claimDate:            Date,
  serviceDate:          Date,
  totalAmount:          Number,
  claimedAmount:        Number,
  approvedAmount:       Number,
  patientResponsibility: Number,

  status:               String,    // Enum: submitted | under_review | approved | partially_approved | denied | paid
  denialReason:         String,
  documents:            [String],  // Array of file URLs
  createdBy:            ObjectId,  // → users
}
```

**Indexes:**

| Index                             | Type     |
| :-------------------------------- | :------- |
| `{ claimNumber: 1 }`              | unique   |
| `{ patientId: 1, createdAt: -1 }` | compound |
| `{ status: 1, claimDate: 1 }`     | compound |

> **NOTE — Decision #22**: Insurance module was CUT from Phase 4 → moved to Phase 5. However, `insurance_companies` and `insurance_claims` schemas remain in the database spec for Phase 5 readiness. The `invoices` schema retains `insuranceClaimId`, `insuredAmount`, and `patientResponsibility` fields.

---

### 1.8 `reconciliation`

```typescript
{
  branchId:             ObjectId,  // → branches
  reconciliationDate:   Date,
  openingBalance:       Number,
  closingBalance:       Number,
  cashReceived:         Number,
  cardReceived:         Number,
  onlineReceived:       Number,
  insuranceReceived:    Number,
  totalReceived:        Number,
  expenses:             Number,
  discrepancy:          Number,

  status:               String,    // Enum: open | closed | reviewed
  closedBy:             ObjectId,  // → users (Decision #24 ADD)
  closedAt:             Date,      // Decision #24 ADD
  reviewedBy:           ObjectId,  // Decision #24 ADD
  reviewedAt:           Date,      // Decision #24 ADD
  createdBy:            ObjectId,  // Decision #24 ADD
  notes:                String,

  // NO isActive field — uses status-based lifecycle (Decision #32)
  // IMMUTABLE once status = 'closed'
}
```

**Indexes:**

| Index                                     | Type   |
| :---------------------------------------- | :----- |
| `{ branchId: 1, reconciliationDate: -1 }` | unique |

---

### 1.9 Related Schemas (Non-Financial but Referenced)

#### `patients.insurance[]` (Embedded in patients collection)

```typescript
insurance: [
  {
    companyId: ObjectId, // → insurance_companies
    policyNumber: String, // ENCRYPTED (AES-256-GCM)
    groupNumber: String,
    memberId: String,
    coveragePercentage: Number,
    maxCoverage: Number,
    validFrom: Date,
    validUntil: Date,
    isPrimary: Boolean,
  },
];
```

#### `doctors` (commissionRate field)

```typescript
{
  // ... other fields
  commissionRate:      Number,     // Percentage for commission calculation
  // User ↔ Doctor sync required
}
```

---

### 1.10 Platform-Level Financial Schema (`saas_payments`)

> Source: DENTO_V2_MASTER_PLAN.md §29

```typescript
// In dento_platform database
{
  tenantId:            ObjectId,
  amount:              Number,
  currency:            String,     // 'EGP' | 'USD' | ...
  provider:            String,     // 'stripe' | 'paymob'
  method:              String,     // 'card' | 'fawry' | 'wallet' | 'instapay' | 'valu' | 'meeza'
  methodDetails: {
    cardBrand:         String,     // For cards
    fawryReference:    String,     // For Fawry offline
    walletPhone:       String,     // For mobile wallets
    valuMonths:        Number,     // For ValU BNPL
  },
  providerFee:         Number,
  netAmount:           Number,
  status:              String,     // pending | completed | failed | refunded
  providerPaymentId:   String,
  // ...standard fields
}
```

---

### 1.11 Encryption Fields (Financial)

| Collection | Field                      | Encryption  |
| :--------- | :------------------------- | :---------- |
| `patients` | `insurance[].policyNumber` | AES-256-GCM |
| `patients` | `nationalId`               | AES-256-GCM |
| `patients` | `phone`                    | AES-256-GCM |
| `patients` | `email`                    | AES-256-GCM |
| `patients` | `emergencyContact.phone`   | AES-256-GCM |
| `patients` | `medicalHistory.notes`     | AES-256-GCM |

Format: `iv:authTag:ciphertext` (base64-encoded, stored as String)

---

### 1.12 TTL Indexes (Relevant)

| Collection       | Field       | TTL      | Purpose              |
| :--------------- | :---------- | :------- | :------------------- |
| `audit_logs`     | `createdAt` | 365 days | Audit retention      |
| `webhooks`       | `createdAt` | 30 days  | Webhook log cleanup  |
| `notifications`  | `createdAt` | 90 days  | Notification cleanup |
| `user_sessions`  | `expiresAt` | Auto     | Session cleanup      |
| `login_attempts` | `createdAt` | 90 days  | Brute-force tracking |

---

## 2. API ROUTE PATTERNS

> Source: Decision Log #21, #33, BUILD_RULES §3

### Route Prefix

```
/api/{plural-noun}
```

- **NO version prefix** — private API consumed only by own frontend apps (BUILD_RULES §3.1)
- Decision Log #33: Use `/api/` NOT `/tenant-api/`. Tenant identified via `X-Tenant-Slug` header.
- **Plural nouns**, **kebab-case** for multi-word resources

> **Conflict Note**: Decision Log #21 says `/api/v1/` prefix. BUILD_RULES §3.1 (written later, Phase 3 Week 8) says no version prefix since it's a private API. BUILD_RULES §22 (Decision Log Overrides table) explicitly lists: "API route prefix → `/api/` unversioned (private API, FE+BE deploy together)". Per authority hierarchy, follow BUILD_RULES §22 which codifies the latest decision: **`/api/` without version prefix**.

### Request Headers

```
X-Tenant-Slug: {slug}          // Required for all tenant API calls
Authorization: Bearer {token}   // Required for authenticated endpoints
Content-Type: application/json
X-Request-Id: {uuid}           // Optional, for end-to-end tracing
```

### Financial Endpoints

```
# Invoices
GET    /api/invoices                    → List invoices (paginated, filterable)
POST   /api/invoices                    → Create invoice (draft)
GET    /api/invoices/:id                → Get invoice detail
PATCH  /api/invoices/:id                → Update invoice
DELETE /api/invoices/:id                → Soft-delete (set status: cancelled)
GET    /api/invoices/:id/pdf            → Generate PDF

# Payments
GET    /api/payments                    → List payments
POST   /api/payments                    → Record payment
GET    /api/payments/:id                → Get payment detail

# Commissions
GET    /api/doctor-commissions          → List commissions
POST   /api/doctor-commissions          → Create commission record
PATCH  /api/doctor-commissions/:id      → Update (approve/cancel)

# Commission Payouts
GET    /api/commission-payouts          → List payouts
POST   /api/commission-payouts          → Create payout

# Installment Plans
GET    /api/installment-plans           → List plans
POST   /api/installment-plans           → Create plan
GET    /api/installment-plans/:id       → Get plan detail
PATCH  /api/installment-plans/:id       → Update plan

# Insurance (Phase 5 — but schemas ready)
GET    /api/insurance-companies         → List companies
POST   /api/insurance-companies         → Create company
GET    /api/insurance-claims            → List claims
POST   /api/insurance-claims            → Submit claim

# Reconciliation
GET    /api/reconciliation              → List reconciliation records
POST   /api/reconciliation              → Create daily reconciliation
PATCH  /api/reconciliation/:id          → Update (close/review) — IMMUTABLE once closed

# Reports
GET    /api/reports/revenue             → Revenue summary report
GET    /api/reports/revenue-by-doctor   → Revenue by doctor
GET    /api/reports/revenue-by-service  → Revenue by service
GET    /api/reports/revenue-by-branch   → Revenue by branch
GET    /api/reports/payment-collection  → Payment collection report
GET    /api/reports/outstanding-aging   → Outstanding/aging report
GET    /api/reports/tax                 → Tax report
GET    /api/reports/commission-summary  → Commission summary (Operational)
GET    /api/reports/daily-reconciliation → Daily reconciliation (Operational)
```

### Route Registration Pattern

```typescript
// apps/api/src/tenant/invoices/invoice.route.ts
import { FastifyInstance } from 'fastify';

export default async function invoiceRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [roleGuard('invoices', 'view')] }, listHandler);
  app.post('/', { preHandler: [roleGuard('invoices', 'create')] }, createHandler);
  app.get('/:id', { preHandler: [roleGuard('invoices', 'view')] }, detailHandler);
  app.patch('/:id', { preHandler: [roleGuard('invoices', 'edit')] }, updateHandler);
  app.delete('/:id', { preHandler: [roleGuard('invoices', 'delete')] }, deleteHandler);
  app.get('/:id/pdf', { preHandler: [roleGuard('invoices', 'view')] }, pdfHandler);
}

// Registration in server.ts:
app.register(invoiceRoutes, { prefix: '/api/invoices' });
```

### Middleware Chain (Every Authenticated Route)

```
authGuard → tenantDbMiddleware → roleGuard('module', 'permission') → handler
```

### Response Shapes

**Success:**

```typescript
{
  success: true,
  data: T | T[],
  message: string,
  meta?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
  }
}
```

**Error (Decision Log #2):**

```typescript
{
  statusCode: number,      // 400, 401, 403, 404, 409, 422, 429, 500
  error: string,           // "Bad Request", "Not Found", etc.
  message: string,         // Human-readable
  details?: Array<{        // Validation errors
    field: string,
    message: string,
    code: string,
  }>,
  requestId: string,       // For tracing
  timestamp: string,       // ISO 8601
}
```

### Response Helpers

```typescript
// Always use these helpers — never construct responses manually
apiResponse(reply, statusCode, data, message, meta?)
apiError(reply, statusCode, error, message, details?)
```

---

## 3. FILE NAMING CONVENTIONS

> Source: V2_STRUCTURE.md §12, BUILD_RULES §8

### Backend (apps/api/)

```
apps/api/src/tenant/{feature}/
  ├── {feature}.model.ts          → Mongoose schema + model factory
  ├── {feature}.service.ts        → Business logic class
  ├── {feature}.route.ts          → Fastify route definitions
  ├── {feature}.schema.ts         → (if feature-specific, otherwise in @dento/shared)
  └── {feature}.test.ts           → Tests

# Financial module examples:
apps/api/src/tenant/invoices/
  ├── invoice.model.ts
  ├── invoice.service.ts
  ├── invoice.route.ts
  └── invoice.route.test.ts

apps/api/src/tenant/payments/
  ├── payment.model.ts
  ├── payment.service.ts
  ├── payment.route.ts
  └── payment.route.test.ts

apps/api/src/tenant/commissions/
  ├── commission.model.ts
  ├── commission.service.ts
  ├── commission.route.ts
  └── commission-payout.model.ts
  └── commission-payout.service.ts

apps/api/src/tenant/installments/
  ├── installment-plan.model.ts
  ├── installment-plan.service.ts
  ├── installment-plan.route.ts

apps/api/src/tenant/insurance/           # Phase 5 but schema ready
  ├── insurance-company.model.ts
  ├── insurance-claim.model.ts

apps/api/src/tenant/reconciliation/
  ├── reconciliation.model.ts
  ├── reconciliation.service.ts
  ├── reconciliation.route.ts

apps/api/src/tenant/reports/
  ├── report.service.ts           → Aggregation pipeline builder
  ├── report.route.ts
```

### Frontend (apps/admin/)

```
apps/admin/src/features/{feature}/
  ├── pages/
  │   ├── {Feature}ListPage.tsx
  │   ├── {Feature}DetailPage.tsx
  │   └── {Feature}CreatePage.tsx   (or dialog-based)
  ├── components/
  │   ├── {Feature}Form.tsx
  │   ├── {Feature}Table.tsx
  │   ├── {Feature}Columns.tsx      (TanStack Table column defs)
  │   ├── {Feature}Card.tsx         (mobile view)
  │   └── {Feature}Filters.tsx
  └── hooks/
      ├── use{Feature}List.ts
      ├── use{Feature}Detail.ts
      ├── useCreate{Feature}.ts
      ├── useUpdate{Feature}.ts
      └── useDelete{Feature}.ts

# Financial module examples:
apps/admin/src/features/invoices/
  ├── pages/
  │   ├── InvoiceListPage.tsx
  │   ├── InvoiceDetailPage.tsx
  │   └── InvoiceCreatePage.tsx
  ├── components/
  │   ├── InvoiceForm.tsx
  │   ├── InvoiceTable.tsx
  │   ├── InvoiceColumns.tsx
  │   └── InvoicePdfPreview.tsx
  └── hooks/
      ├── useInvoiceList.ts
      ├── useInvoiceDetail.ts
      ├── useCreateInvoice.ts
      └── useInvoicePdf.ts

apps/admin/src/features/payments/
apps/admin/src/features/commissions/
apps/admin/src/features/installments/
apps/admin/src/features/reconciliation/
apps/admin/src/features/reports/
```

### Shared Package

```
packages/shared/src/schemas/
  ├── invoice.schema.ts           → Zod schemas (create, update, query)
  ├── payment.schema.ts
  ├── commission.schema.ts
  ├── installment-plan.schema.ts
  ├── reconciliation.schema.ts
  └── report.schema.ts            → Report filter/query schemas

packages/shared/src/types/
  ├── invoice.types.ts            → TypeScript interfaces (inferred from Zod)
  ├── payment.types.ts
  ├── ...

packages/shared/src/constants/
  ├── permissions.ts              → RBAC permission definitions
  ├── invoice-statuses.ts
  └── payment-methods.ts
```

### Test Files

```
{feature}.service.test.ts         → Service layer tests
{feature}.route.test.ts           → API route integration tests
{Feature}Page.test.tsx            → Page-level rendering tests
{Feature}Form.test.tsx            → Form interaction tests
use{Feature}.test.ts              → Hook tests
```

---

## 4. SECURITY REQUIREMENTS

> Source: SECURITY_AND_ENCRYPTION.md (all sections), BUILD_RULES §16-17

### 4.1 Authentication

| Aspect           | Requirement                                                                                        |
| :--------------- | :------------------------------------------------------------------------------------------------- |
| Password hashing | **Argon2id** (Decision #1 overrides bcrypt) — memoryCost: 65536, timeCost: 3, parallelism: 4       |
| Access token     | JWT, 15min lifetime, stored in **memory only** (Zustand, NOT persisted)                            |
| Refresh token    | JWT, 7 days, **HttpOnly + Secure + SameSite=Strict** cookie                                        |
| Token rotation   | New refresh token on every refresh; reuse detection revokes ALL sessions                           |
| Password policy  | 8+ chars, 1 uppercase + 1 number + 1 special, checked against top-10k list, last 5 hashes blocked  |
| Brute-force      | Progressive cooldown: 1-3 attempts=none, 4-6=5min, 7-9=15min, 10-12=30min, 13-15=1hr, 16+=IP block |
| Sessions         | Max 5 concurrent per user, tracked in `user_sessions` with device info, remote logout supported    |

**Access Token Payload:**

```typescript
{
  userId: string;
  email: string;
  tenantSlug: string;
  role: string;
  sessionId: string;
}
```

### 4.2 Encryption

| Type             | Algorithm                        | Application                                                                                    |
| :--------------- | :------------------------------- | :--------------------------------------------------------------------------------------------- |
| Field-level PII  | AES-256-GCM                      | nationalId, phone, email, emergencyContact.phone, medicalHistory.notes, insurance.policyNumber |
| Encrypted format | `iv:authTag:ciphertext`          | Base64-encoded, stored as String                                                               |
| At-rest          | MongoDB Atlas Encryption at Rest | Entire database                                                                                |
| In-transit       | TLS 1.2+                         | All connections                                                                                |
| Passwords        | Argon2id                         | User passwords                                                                                 |
| Webhooks         | HMAC-SHA256                      | Webhook signature verification                                                                 |
| Reset tokens     | SHA-256                          | Password reset tokens, 1hr TTL, single-use                                                     |

**Key Rotation Schedule:**

| Key                   | Rotation               | Alert Before |
| :-------------------- | :--------------------- | :----------- |
| JWT signing secret    | 90 days                | 7 days       |
| Encryption master key | 6 months               | 14 days      |
| API keys              | Manual (on compromise) | —            |
| Webhook secrets       | Manual (on compromise) | —            |

### 4.3 Input Validation (3-Layer)

```
Frontend Zod (.strict()) → Backend Zod (.strict()) → Mongoose schema validation
```

- ALL Zod schemas use `.strict()` — rejects unknown fields
- Query schemas use `.coerce` for type coercion
- NoSQL injection prevention: never pass raw user input to MongoDB operators
- Rich text sanitized with DOMPurify
- `dangerouslySetInnerHTML` is **FORBIDDEN**

### 4.4 HTTP Security Headers (via @fastify/helmet)

| Header                    | Value                                      |
| :------------------------ | :----------------------------------------- |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains`      |
| Content-Security-Policy   | Strict CSP with nonces                     |
| X-Frame-Options           | `DENY`                                     |
| X-Content-Type-Options    | `nosniff`                                  |
| Referrer-Policy           | `strict-origin-when-cross-origin`          |
| Permissions-Policy        | `geolocation=(), camera=(), microphone=()` |
| X-XSS-Protection          | `0` (CSP handles this)                     |

### 4.5 Rate Limiting (3-Tier)

| Tier    | Limit    | Scope                           |
| :------ | :------- | :------------------------------ |
| Global  | 100/min  | All endpoints                   |
| Auth    | 5/min    | Login, register, password reset |
| API Key | 1000/min | External API integrations       |

### 4.6 File Upload Pipeline (7-Step)

```
1. File type validation (MIME + magic bytes)
2. Size limit enforcement (per category config)
3. File extension whitelist
4. ClamAV virus scan
5. Image metadata stripping
6. Upload to R2 with tenant-prefixed path
7. Return pre-signed URL (1hr TTL)
```

Storage path: `tenants/{tenant_slug}/{category}/{filename}`

### 4.7 Audit Logging

```typescript
{
  action:      String,    // 'create' | 'update' | 'delete' | 'login' | 'export' | ...
  resource:    String,    // 'invoice', 'payment', 'patient', etc.
  resourceId:  ObjectId,
  userId:      ObjectId,
  tenantSlug:  String,
  ipAddress:   String,
  userAgent:   String,
  changes:     Object,    // { before, after } for updates
  metadata:    Object,    // Additional info
  createdAt:   Date,      // TTL: 365 days
}
```

**Rules:**

- Audit logs are **append-only** — NEVER update or delete
- NEVER log PII values (encrypted fields, passwords, tokens)
- Every financial mutation (invoice create/update/cancel, payment record, reconciliation close) MUST be audit-logged

### 4.8 Tenant Isolation

| Layer        | Guard                                                                  |
| :----------- | :--------------------------------------------------------------------- |
| JWT          | Tenant-slug in token payload                                           |
| Middleware   | `tenantDbMiddleware` — `useDb()` from JWT, never from user input alone |
| Route Guard  | Tenant check in every handler                                          |
| File Storage | Path prefix `tenants/{slug}/...`                                       |
| Socket.io    | Room-based `tenant:{slug}`                                             |
| Webhooks     | Tenant-scoped events only                                              |

### 4.9 Frontend Security

| Rule                 | Implementation                                               |
| :------------------- | :----------------------------------------------------------- |
| Access token         | Memory only (Zustand, NOT persisted)                         |
| Refresh token        | HttpOnly + Secure + SameSite cookie                          |
| Source maps          | **Disabled** in production                                   |
| Env variables        | Only `VITE_*` prefix exposed                                 |
| No secrets in bundle | CI check enforced                                            |
| CSRF                 | Bearer token in header (not cookie-based auth for API calls) |

### 4.10 Pino Log Redaction

NEVER log these fields (Pino redaction configured):

```
authorization, cookie, password, refreshToken, accessToken,
nationalId, policyNumber, ENCRYPTION_MASTER_KEY
```

---

## 5. UI PATTERNS

> Source: ADMIN_PORTAL_SCREENS.md, BUILD_RULES §8-15, §24-25

### 5.1 Component Architecture

| Category         | Location                                  | Example                                          |
| :--------------- | :---------------------------------------- | :----------------------------------------------- |
| Primitive        | `@dento/ui`                               | Button, Input, Dialog, Badge, Card               |
| Composite/Shared | `apps/admin/src/components/`              | DataTable, EmptyState, TableSkeleton, PageHeader |
| Feature-specific | `apps/admin/src/features/{x}/components/` | InvoiceForm, InvoiceTable                        |
| Layout           | `apps/admin/src/layouts/`                 | DashboardLayout, AuthLayout                      |

**Component Library:** Shadcn/ui primitives + Lucide React icons + Recharts + FullCalendar 6 (free MIT) + TanStack Table 8

### 5.2 Page Layout

```
┌──────────────────────────────────────────┐
│ Topbar (search, notifications, profile)   │
├────────┬─────────────────────────────────┤
│        │                                  │
│ Sidebar│   Main Content Area              │
│  240px │   (flex-1, min-h-screen)         │
│        │                                  │
│        │   PageHeader + Breadcrumbs       │
│        │   Filters/Search Bar             │
│        │   DataTable / Cards              │
│        │   Pagination                     │
│        │                                  │
└────────┴─────────────────────────────────┘
```

- Sidebar: 240px expanded, 80px collapsed, auto-collapses below `lg` (1024px)
- Content: `px-6 py-6` padding, max-width none (fluid)
- Background: `bg-gray-50 dark:bg-gray-900`
- Cards: `bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700`

### 5.3 DataTable Pattern

```tsx
// Column definitions (separate file: InvoiceColumns.tsx)
export const invoiceColumns: ColumnDef<Invoice>[] = [
  { accessorKey: 'invoiceNumber', header: 'Invoice #' },
  { accessorKey: 'patientId', header: 'Patient', cell: ... },
  { accessorKey: 'totalAmount', header: 'Total', cell: formatCurrency },
  { accessorKey: 'status', header: 'Status', cell: StatusBadge },
  { accessorKey: 'issueDate', header: 'Date', cell: formatDate },
  { id: 'actions', cell: ActionsDropdown },
];

// Page component
const { data, isLoading, isError, refetch } = useInvoiceList(filters);

if (isLoading) return <TableSkeleton columns={6} rows={10} />;
if (isError) return <ErrorState onRetry={refetch} />;
if (!data?.length) return <EmptyState title="No invoices yet" cta="Create Invoice" />;

return (
  <DataTable
    columns={invoiceColumns}
    data={data}
    manualPagination={true}    // Server-side pagination ALWAYS
    pageCount={meta.totalPages}
  />
);
```

### 5.4 Form Pattern

```tsx
// React Hook Form + Zod + @dento/shared schema
import { createInvoiceSchema } from '@dento/shared';

const form = useForm({
  resolver: zodResolver(createInvoiceSchema),
  defaultValues: { ... },
});

const createMutation = useCreateInvoice();

const onSubmit = form.handleSubmit(async (data) => {
  await createMutation.mutateAsync(data);
  toast.success('Invoice created successfully');
  navigate('/invoices');
});
```

**form field name = Zod schema key = API body key = MongoDB field name** (end-to-end, no translation)

### 5.5 React Query Patterns

```typescript
// Query key factory (features/invoices/hooks/invoiceKeys.ts)
export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters: InvoiceFilters) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

// List hook
export function useInvoiceList(filters: InvoiceFilters) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: () => apiClient.get('/api/invoices', { params: filters }),
  });
}

// Mutation hook
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoice) => apiClient.post('/api/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast.success('Invoice created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Something went wrong');
    },
  });
}
```

### 5.6 State Management Rules

| State Type                 | Solution              | Persist?          |
| :------------------------- | :-------------------- | :---------------- |
| Server data                | TanStack Query 5.x    | Cache (memory)    |
| Global UI (theme, sidebar) | Zustand (persisted)   | localStorage      |
| Auth tokens                | Zustand (memory only) | **NEVER persist** |
| Form state                 | React Hook Form       | No                |
| URL state (filters, page)  | Search params         | URL               |
| Local state                | useState              | No                |

### 5.7 Styling & Theming

- **Tailwind CSS v4** utility classes (NO custom CSS files unless absolutely necessary)
- **Brand colors**: Dynamic via `useBrandingTheme()` → CSS custom properties `--color-brand-50` through `--color-brand-950`
- **Dark mode**: `dark` class on `<html>`, every component MUST support `dark:` variants

| Token          | Light             | Dark                   |
| :------------- | :---------------- | :--------------------- |
| Page bg        | `bg-gray-50`      | `dark:bg-gray-900`     |
| Card bg        | `bg-white`        | `dark:bg-gray-800`     |
| Text primary   | `text-gray-900`   | `dark:text-white`      |
| Text secondary | `text-gray-500`   | `dark:text-gray-400`   |
| Border         | `border-gray-200` | `dark:border-gray-700` |
| Brand primary  | `bg-brand-600`    | same                   |
| Success        | `text-green-600`  | `dark:text-green-400`  |
| Warning        | `text-yellow-600` | `dark:text-yellow-400` |
| Danger         | `text-red-600`    | `dark:text-red-400`    |

### 5.8 RTL / Bidirectional (BUILD_RULES §11)

**NEVER use `left`/`right`** — ALWAYS use logical properties:

| Forbidden                  | Use Instead                |
| :------------------------- | :------------------------- |
| `ml-*`, `mr-*`             | `ms-*`, `me-*`             |
| `pl-*`, `pr-*`             | `ps-*`, `pe-*`             |
| `text-left`, `text-right`  | `text-start`, `text-end`   |
| `border-l-*`, `border-r-*` | `border-s-*`, `border-e-*` |
| `left-*`, `right-*`        | `start-*`, `end-*`         |
| `float-left`               | `float-start`              |

- Arabic font: **IBM Plex Sans Arabic**
- Numerals: Western (0-9), NOT Arabic-Indic (٠-٩)
- Date format: DD/MM/YYYY both locales
- Icons: flip with `rtl:rotate-180` where directional context applies
- `dir` attribute set on `<html>` from `theme.store.ts`

### 5.9 Responsive Design (BUILD_RULES §12)

| Breakpoint | Width   | Name    |
| :--------- | :------ | :------ |
| Default    | 0px+    | Mobile  |
| `md`       | 768px+  | Tablet  |
| `lg`       | 1024px+ | Desktop |
| `xl`       | 1440px+ | Wide    |

- **Mobile-first** approach
- Tables → cards on mobile
- Sidebar auto-collapses below `lg`
- Forms: 1-column mobile, 2-column `md`+
- Modals: full-screen on mobile

### 5.10 Loading / Error / Empty States (BUILD_RULES §15)

Every page MUST handle all three states:

```tsx
// Standard pattern:
if (isLoading) return <TableSkeleton columns={N} rows={10} />;
if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
if (!data?.length)
  return <EmptyState title="No X yet" description="..." ctaLabel="Create X" onCta={handleCreate} />;
```

### 5.11 Toast Notifications (BUILD_RULES §24.4)

```typescript
// Every mutation MUST provide feedback:
toast.success('Invoice created successfully'); // On success
toast.error(error.message || 'Something went wrong'); // On error
// NEVER silently succeed or fail
```

### 5.12 Buttons (BUILD_RULES §24.2)

**No placeholder buttons.** Every button MUST have a working handler:

| Button        | Required Behavior                               |
| :------------ | :---------------------------------------------- |
| Add/Create    | Opens form dialog OR navigates to create page   |
| Edit          | Opens pre-filled form OR navigates to edit page |
| Delete        | Confirmation dialog → delete mutation           |
| Save/Submit   | Zod validation → create/update mutation → toast |
| Cancel        | Close dialog/form, reset state                  |
| Retry         | `refetch()` on failed query                     |
| Export        | Trigger CSV/PDF download                        |
| Filter/Search | Update query params → re-fetch                  |

- All destructive actions require confirmation dialog
- If API not ready: `disabled` + tooltip explaining why
- NEVER render button with no `onClick` handler

### 5.13 Invoice PDF Template

> Source: DENTO_V2_MASTER_PLAN.md §15

- Generated with `@react-pdf/renderer` (server-side, NO Puppeteer)
- **Invoice is a CLINIC document** (no doctor name on invoice)
- Layout:
  - `ClinicHeader`: Logo + Clinic Name (EN+AR) + Address + Phone + Email
  - Patient info section
  - Line items table: Description, Qty, Unit Price, Discount, Total
  - Summary: Subtotal, VAT%, Tax Amount, Total, Amount Paid, Balance Due
  - Payment status indicator
  - Terms and notes at bottom

### 5.14 Admin Portal Screens (Financial)

> Source: ADMIN_PORTAL_SCREENS.md

**Module #8 — Invoices:**

- List: Breadcrumbs, search/filter bar, DataTable (Invoice#, Patient, Total, Status badge, Date, Actions), pagination
- Detail: Invoice header, patient info, line items table, totals summary, payment history, action buttons (Edit/Print/Email/Record Payment)
- Create/Edit: Form with patient selector, dynamic item rows (add/remove), auto-calculated totals, tax from config, status selector

**Module #9 — Payments:**

- List: DataTable (Invoice#, Patient, Amount, Method, Status, Date), filters by method/status/date range
- Record: Modal form linked to invoice, amount, method dropdown, reference, notes

**Module #22 — Commissions:**

- List: DataTable grouped by doctor, period filter, status filter
- Payout form: Select doctor, date range, auto-calculated total, payment method

**Module #23 — Installments:**

- Plan detail: Overview card + embedded payments timeline
- Each installment row: number, due date, amount, status badge, pay button

### 5.15 Branding System

- `useBrandingTheme()` hook fires in `DashboardLayout`
- Fetches `GET /api/branding` with `X-Tenant-Slug`
- Generates 25 HSL color shades (50-950) from `primaryColor`
- Sets CSS custom properties on `document.documentElement`
- Updates favicon and document title
- Sidebar reads from `useBrandingStore()`: logo, clinicName
- Default primary: `#4f46e5`, default accent: `#10b981`

---

## 6. RBAC RULES

> Source: SECURITY_AND_ENCRYPTION.md §4, BUILD_RULES §17.4, PLATFORM_RBAC.md

### 6.1 Role Hierarchy

```
platform_owner > platform_admin >
owner > admin > office_manager > dentist > hygienist > receptionist
```

Higher role includes all permissions of lower roles.

### 6.2 Permission Structure

```typescript
// packages/shared/src/constants/permissions.ts
const PERMISSIONS = {
  invoices:      { view: [...], create: [...], edit: [...], delete: [...] },
  payments:      { view: [...], create: [...], edit: [...], delete: [...] },
  commissions:   { view: [...], create: [...], edit: [...], delete: [...] },
  installments:  { view: [...], create: [...], edit: [...], delete: [...] },
  reconciliation:{ view: [...], create: [...], edit: [...], delete: [...] },
  reports:       { financial: { view: [...] }, operational: { view: [...] } },
  // ...other modules
};
```

### 6.3 Financial Module Permissions Matrix

| Module                   | owner | admin | office_manager | dentist  | hygienist | receptionist |
| :----------------------- | :---: | :---: | :------------: | :------: | :-------: | :----------: |
| invoices.view            |  ✅   |  ✅   |       ✅       | Own only |     —     |      ✅      |
| invoices.create          |  ✅   |  ✅   |       ✅       |    —     |     —     |      ✅      |
| invoices.edit            |  ✅   |  ✅   |       ✅       |    —     |     —     |      —       |
| invoices.delete          |  ✅   |  ✅   |       —        |    —     |     —     |      —       |
| payments.view            |  ✅   |  ✅   |       ✅       |    —     |     —     |      ✅      |
| payments.create          |  ✅   |  ✅   |       ✅       |    —     |     —     |      ✅      |
| commissions.view         |  ✅   |  ✅   |       ✅       | Own only |     —     |      —       |
| commissions.edit         |  ✅   |  ✅   |       —        |    —     |     —     |      —       |
| reconciliation.view      |  ✅   |  ✅   |       ✅       |    —     |     —     |      —       |
| reconciliation.create    |  ✅   |  ✅   |       ✅       |    —     |     —     |      —       |
| reports.financial.view   |  ✅   |  ✅   |  ✅ (manager)  |    —     |     —     |      —       |
| reports.operational.view |  ✅   |  ✅   |       ✅       |    —     |     —     |      —       |

> **"accountant" role** referenced in Master Plan §26 → maps to `office_manager` with financial permissions.

### 6.4 Row-Level Security

```typescript
// Dentists see ONLY their own records:
if (role === 'dentist' || role === 'hygienist') {
  query.doctorId = userId;
}
// Admins/owners see all records — no filter
```

### 6.5 Frontend RBAC Hook

```tsx
const { canView, canEdit, canCreate, canDelete } = useRBAC('invoices');

if (!canView) return <AccessDenied />;

// Conditionally render buttons:
{
  canCreate && <Button onClick={handleCreate}>New Invoice</Button>;
}
{
  canEdit && <Button onClick={handleEdit}>Edit</Button>;
}
{
  canDelete && (
    <Button onClick={handleDelete} variant="destructive">
      Delete
    </Button>
  );
}
```

### 6.6 Backend RBAC Guard

```typescript
// Route-level:
app.get('/', { preHandler: [roleGuard('invoices', 'view')] }, listHandler);

// Service-level row filtering:
async list(filters, userId, role) {
  const query = { ...filters };
  if (role === 'dentist') query.doctorId = userId;
  return this.InvoiceModel.find(query);
}
```

---

## 7. BUILD RULES

> Source: BUILD_RULES.md (all sections)

### 7.1 Monorepo Structure

```
Turborepo + pnpm 9.x workspaces
├── apps/admin      → React 19 + Vite 7.x    (Admin Portal)
├── apps/api        → Fastify 5.x             (Tenant API)
├── apps/developer  → React 19 + Vite 7.x    (Dev Portal)
├── packages/shared → @dento/shared           (Zod, types, constants)
└── packages/ui     → @dento/ui               (Shadcn components)
```

- `workspace:*` protocol for internal deps
- `strict-peer-dependencies=true`
- Build order managed by `turbo.json` (shared → ui → apps)

### 7.2 Model Factory Pattern

```typescript
// invoice.model.ts
import { Connection, Schema, Model } from 'mongoose';

const invoiceSchema = new Schema(
  {
    // ... all fields
  },
  { timestamps: true },
);

export function getInvoiceModel(connection: Connection): Model<IInvoice> {
  return connection.models.Invoice || connection.model<IInvoice>('Invoice', invoiceSchema);
}
```

**Rules:**

- Check `connection.models` first (prevent OverwriteModelError)
- Always `{ timestamps: true }`
- Soft-delete via `isActive: true` (EXCEPT financial collections → status-based per Decision #32)

### 7.3 Service Layer Pattern

```typescript
// invoice.service.ts
export class InvoiceService {
  private InvoiceModel: Model<IInvoice>;

  constructor(connection: Connection) {
    this.InvoiceModel = getInvoiceModel(connection);
  }

  async create(data: CreateInvoice, userId: string) {
    const invoiceNumber = await this.generateInvoiceNumber();
    return this.InvoiceModel.create({ ...data, invoiceNumber, createdBy: userId });
  }

  async list(filters: InvoiceFilters, userId: string, role: string) {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.patientId) query.patientId = filters.patientId;
    if (role === 'dentist') query.doctorId = userId; // Row-level security

    const [data, total] = await Promise.all([
      this.InvoiceModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.InvoiceModel.countDocuments(query),
    ]);

    return { data, total };
  }
}
```

**Rules:**

- Service receives `Connection` in constructor (NOT a global connection)
- Every write method takes `userId` for audit
- Business logic lives in service, NEVER in route handler
- Route handlers are thin: get db, get userId, call service, return response

### 7.4 Route Handler Pattern

```typescript
// invoice.route.ts
async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const db = getTenantDb(request);
  const userId = getUserId(request);
  const data = request.body as CreateInvoice;

  const service = new InvoiceService(db);
  const invoice = await service.create(data, userId);

  return apiResponse(reply, 201, invoice, 'Invoice created');
}
```

### 7.5 Zod Schema Rules (@dento/shared)

```typescript
// packages/shared/src/schemas/invoice.schema.ts
import { z } from 'zod';

export const createInvoiceSchema = z
  .object({
    patientId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentId: z.string().optional(),
    treatmentPlanId: z.string().optional(),
    items: z
      .array(
        z
          .object({
            description: z.string().min(1),
            treatmentId: z.string().optional(),
            serviceId: z.string().optional(),
            quantity: z.number().min(1),
            unitPrice: z.number().min(0),
            discount: z.number().min(0).default(0),
          })
          .strict(),
      )
      .min(1),
    notes: z.string().optional(),
    terms: z.string().optional(),
    dueDate: z.string().datetime(),
  })
  .strict(); // ALWAYS .strict()

export const invoiceQuerySchema = z
  .object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    status: z
      .enum(['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'])
      .optional(),
    patientId: z.string().optional(),
    branchId: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .strict();

export type CreateInvoice = z.infer<typeof createInvoiceSchema>;
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
```

**Rules:**

- ALL schemas use `.strict()` — rejects unknown fields
- Query schemas use `.coerce` for type coercion
- Types inferred via `z.infer<>` (NEVER duplicate type definitions)
- Same schema used in BOTH frontend form validation AND backend route validation

### 7.6 Build Verification (After EVERY Implementation Session)

```bash
# Step 1: Build all packages
pnpm turbo build          # Must pass with 0 errors

# Step 2: Lint
pnpm turbo lint           # 0 new errors

# Step 3: Type check
pnpm turbo typecheck      # 0 TypeScript errors

# Step 4: Run tests
pnpm turbo test           # All tests pass

# Step 5: Cross-layer integration check
# ✅ Zod schema in @dento/shared compiles
# ✅ Backend route uses schema for validation
# ✅ Backend service called by route handler
# ✅ Frontend hook calls correct API endpoint
# ✅ Frontend page uses hook and renders data
# ✅ Sidebar link routes to page
# ✅ All buttons have working handlers
# ✅ Loading/Error/Empty states handled
```

### 7.7 ESLint Rules (Non-Negotiable)

| Ruleset              | Package          | Key Rules                                                |
| :------------------- | :--------------- | :------------------------------------------------------- |
| `@typescript-eslint` | All              | `no-explicit-any` (warn), `no-unused-vars` (error)       |
| `jsx-a11y`           | Admin, Developer | `alt-text`, `aria-props`, `click-events-have-key-events` |
| `react-hooks`        | Admin, Developer | `rules-of-hooks` (error), `exhaustive-deps` (warn)       |
| `import`             | All              | `no-duplicates`, `order` (builtin → external → internal) |
| Custom               | API              | `no-console` (error) — use Pino                          |

- NEVER disable ESLint rules inline without documented reason

### 7.8 Accessibility (WCAG 2.1 AA)

- Color contrast: 4.5:1 minimum
- Focus rings on all interactive elements
- Keyboard navigation for all actions
- `aria-label` on icon-only buttons
- Form inputs linked to labels
- `eslint-plugin-jsx-a11y` enforced

### 7.9 Animation & Motion

| Animation         | Duration         |
| :---------------- | :--------------- |
| Tooltip, dropdown | 150ms            |
| Modal, dialog     | 200ms            |
| Page transition   | NONE (forbidden) |
| Sidebar collapse  | 200ms            |

- **transform-based only** (translate, scale, opacity)
- `prefers-reduced-motion` respected
- CSS transitions preferred over Framer Motion

### 7.10 Integration Connectivity

Every feature MUST be fully connected end-to-end:

```
Sidebar link → Route (router.tsx) → Page → Hook → apiClient → /api/{resource} → Service → Model → MongoDB
```

- No dead sidebar links (404)
- No placeholder buttons without handlers
- No pages without API connections
- No hooks without working endpoints

---

## 8. DECISION LOG OVERRIDES

> Source: V2_DECISION_LOG.md — These OVERRIDE all other documents

| #      | Topic                 | Override                                                        | What It Overrides             |
| :----- | :-------------------- | :-------------------------------------------------------------- | :---------------------------- |
| **1**  | Password hashing      | **Argon2id**                                                    | SECURITY doc says bcrypt      |
| **2**  | API error shape       | Standard `ApiError` with requestId, timestamp                   | Any ad-hoc error format       |
| **5**  | Aggregation pipelines | MongoDB aggregation (not Mongoose virtuals) for reports         | Simple queries                |
| **10** | Test coverage Phase 4 | **70%** for invoice calc + payment reconciliation               | Default 60%                   |
| **21** | Route naming          | Plural nouns, kebab-case, `/api/v1/` prefix                     | Any other pattern             |
| **22** | Phase 4 scope CUT     | Insurance → Phase 5. Keep Invoices + Payments as MVP must-have  | Original Phase 4 scope        |
| **24** | reconciliation schema | ADD `createdBy`, `closedAt`, `reviewedAt`                       | Original schema missing these |
| **32** | Financial isActive    | **STATUS-BASED lifecycle** for invoices/payments/reconciliation | Standard `isActive` boolean   |
| **33** | Route prefix          | `/api/` NOT `/tenant-api/`. Tenant via `X-Tenant-Slug` header   | Master Plan's `/tenant-api/`  |

### Clarification: Route Prefix Resolution

- Decision #21 says `/api/v1/`
- Decision #33 says `/api/` (not `/tenant-api/`)
- BUILD_RULES §3.1 says no version prefix (private API)
- BUILD_RULES §22 explicitly resolves: **`/api/` unversioned**
- **Use `/api/` without version prefix** (BUILD_RULES codifies latest resolution)

---

## 9. TESTING REQUIREMENTS

> Source: Decision Log #10, BUILD_RULES §18

### Test Stack

| Tool                  | Purpose                        |
| :-------------------- | :----------------------------- |
| Vitest 2.x            | Runner + assertions            |
| MSW 2.x               | Mock API (frontend)            |
| Testing Library 16.x  | React component testing        |
| supertest             | HTTP integration tests         |
| mongodb-memory-server | In-memory MongoDB for services |
| @faker-js/faker       | Realistic test data            |

### Coverage Targets — Phase 4

| Metric     | General | Invoice Calc + Payment Reconciliation |
| :--------- | :------ | :------------------------------------ |
| Statements | 65%     | **70%** (Decision #10)                |
| Functions  | 65%     | **70%**                               |
| Lines      | 65%     | **70%**                               |
| Branches   | 55%     | **60%**                               |

### What to Test per Layer

| Layer     | Test                                               | Don't Test             |
| :-------- | :------------------------------------------------- | :--------------------- |
| Service   | Business logic, validation, edge cases, encryption | Mongoose internals     |
| Route     | HTTP status, auth enforcement, response shape      | Business logic         |
| Component | Rendering, interactions, a11y                      | Implementation details |
| Hook      | Return values, loading/error states                | React Query internals  |

### Critical Financial Test Cases

```typescript
describe('InvoiceService', () => {
  describe('create', () => {
    it('should auto-generate invoiceNumber in INV-YYYY-NNNNN format');
    it('should calculate subtotal from items');
    it('should apply discount correctly');
    it('should calculate tax from country_config');
    it('should set balanceDue = totalAmount - amountPaid');
    it('should default status to draft');
    it('should reject empty items array');
    it('should reject negative amounts');
  });

  describe('cancel', () => {
    it('should set status to cancelled (NOT isActive false)');
    it('should reject cancellation of already-paid invoice');
  });
});

describe('ReconciliationService', () => {
  describe('close', () => {
    it('should be immutable once closed');
    it('should reject edits to closed reconciliation');
    it('should set closedBy and closedAt');
  });
});

describe('PaymentService', () => {
  describe('recordPayment', () => {
    it('should update invoice amountPaid and balanceDue');
    it('should set invoice status to paid when fully paid');
    it('should set invoice status to partially_paid when partial');
  });
});
```

---

## 10. PAYMENT GATEWAY INTEGRATION

> Source: DENTO_V2_MASTER_PLAN.md §29

### Provider Selection

Auto-selected by tenant country:

- **Egypt (EG)** → Paymob
- **All others** → Stripe

### Paymob Methods (Egypt)

| Method         | Fee          | Notes                                                           |
| :------------- | :----------- | :-------------------------------------------------------------- |
| Cards          | 2.5% + 1 EGP | Visa/Mastercard/Meeza                                           |
| Fawry          | 2% + 2 EGP   | **Offline**: 48hr reference code, customer pays at Fawry outlet |
| Mobile Wallets | 1.5%         | Vodafone Cash, Orange Money, etc.                               |
| InstaPay       | 3 EGP flat   | Bank transfer                                                   |
| ValU           | 0%           | BNPL (3/6/12 months), ValU takes a cut from merchant later      |
| Meeza          | 1%           | National payment scheme                                         |

### Paymob Integration Flow

```
1. Auth Request → Paymob API → Get auth_token
2. Order Registration → Create order with auth_token → Get order_id
3. Payment Key → Generate payment key (auth_token + order_id + amount + billing) → Get payment_key
4. Frontend → Embed Paymob iframe with payment_key
5. Customer completes payment in iframe
6. Paymob → Webhook POST to /api/webhooks/paymob → HMAC-SHA256 verified
7. Update saas_payments record with result
```

### Fawry Special Flow (Offline)

```
1. Customer selects "Pay with Fawry"
2. System generates Fawry reference code (valid 48h)
3. Display reference code to customer
4. Customer goes to ANY Fawry outlet and pays with reference
5. Fawry → Webhook notification → Update payment status
6. If 48h expires with no payment → Auto-cancel, offer retry
```

### Stripe (International)

Standard Stripe Checkout / Payment Intents flow. Cards, Apple Pay, Google Pay.

---

## 11. REPORTS & ANALYTICS

> Source: DENTO_V2_MASTER_PLAN.md §26

### Financial Reports (7)

| Code | Report             | Key Metrics                                |
| :--- | :----------------- | :----------------------------------------- |
| F1   | Revenue Summary    | Total revenue, period comparison, growth % |
| F2   | Revenue by Doctor  | Per-doctor revenue breakdown               |
| F3   | Revenue by Service | Per-service/procedure revenue              |
| F4   | Revenue by Branch  | Per-branch revenue comparison              |
| F5   | Payment Collection | Cash/card/online/insurance breakdown       |
| F6   | Outstanding/Aging  | 30/60/90/120+ day aging buckets            |
| F7   | Tax Report         | VAT collected, taxable amounts             |

### Operational Reports (Financial-Related)

| Code | Report               |
| :--- | :------------------- |
| O1   | Commission Summary   |
| O2   | Daily Reconciliation |

### Aggregation Pipeline Example — Revenue Summary (F1)

```javascript
[
  {
    $match: {
      status: { $in: ['paid', 'partially_paid'] },
      issueDate: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$issueDate' } },
      totalRevenue: { $sum: '$amountPaid' },
      invoiceCount: { $sum: 1 },
      avgInvoiceValue: { $avg: '$totalAmount' },
    },
  },
  { $sort: { _id: 1 } },
];
```

### Aggregation Pipeline Example — Outstanding Aging (F6)

```javascript
[
  { $match: { status: { $in: ['issued', 'partially_paid', 'overdue'] }, balanceDue: { $gt: 0 } } },
  {
    $addFields: {
      daysPastDue: { $dateDiff: { startDate: '$dueDate', endDate: '$$NOW', unit: 'day' } },
    },
  },
  {
    $bucket: {
      groupBy: '$daysPastDue',
      boundaries: [0, 30, 60, 90, 120, Infinity],
      default: '120+',
      output: { count: { $sum: 1 }, totalOutstanding: { $sum: '$balanceDue' } },
    },
  },
];
```

### Export System

| Format | Library               | Use Case                   |
| :----- | :-------------------- | :------------------------- |
| CSV    | `@fast-csv/format`    | Data export for accounting |
| Excel  | `exceljs`             | Formatted spreadsheets     |
| PDF    | `@react-pdf/renderer` | Printable reports          |

### Dashboard Widgets (8)

Revenue chart, appointment stats, patient growth, outstanding balance, today's schedule, low inventory alerts, pending tasks, recent activity feed.

### Report RBAC

```
reports.financial.view → owner, admin, office_manager (accountant)
reports.operational.view → owner, admin, office_manager
```

---

## 12. WEBHOOK EVENTS

> Source: BUILD_RULES §23, V2_DECISION_LOG.md #3

### Financial Webhook Events

| Event              | Trigger                            |
| :----------------- | :--------------------------------- |
| `invoice.issued`   | Invoice status changes to `issued` |
| `invoice.paid`     | Invoice fully paid                 |
| `payment.received` | Payment recorded                   |

### Webhook Envelope

```typescript
{
  id: string,           // UUID v4
  type: 'invoice.issued',
  tenantSlug: string,
  apiVersion: '2026-03-01',
  createdAt: string,    // ISO 8601
  data: { ... },        // Event payload
}
```

### Webhook Headers

```
X-Webhook-Id: <event id>
X-Webhook-Signature: sha256=<HMAC-SHA256(secret, `${timestamp}.${body}`)>
X-Webhook-Timestamp: <unix seconds>
Content-Type: application/json
```

### Webhook Rules

- **Signature**: HMAC-SHA256 of `${timestamp}.${body}` using tenant's webhook secret
- **Replay protection**: Reject if timestamp > 5 minutes old
- **Retry**: 3 attempts with exponential backoff (5s, 30s, 5min)
- **Timeout**: 10 seconds per delivery
- **PII Redaction**: phone → `"+20***1234"`, email → `"a***@gmail.com"`, nationalId → `"***"`

---

## Quick Reference Card

```
ROUTE:     /api/{plural-noun}             (kebab-case, no version prefix)
HEADER:    X-Tenant-Slug: {slug}
AUTH:      Bearer {accessToken}
ERROR:     { statusCode, error, message, details?, requestId, timestamp }
SUCCESS:   { success, data, message, meta? }

MODEL:     getXModel(connection)          (factory pattern)
SERVICE:   new XService(connection).method(..., userId)
HANDLER:   getTenantDb(request) + getUserId(request) → apiResponse()

SCHEMA:    z.object({}).strict()          (shared in @dento/shared)
FORM:      useForm + zodResolver          (React Hook Form + Zod)
QUERY:     useQuery/useMutation           (TanStack React Query)
STATE:     useFeatureList → isLoading / isError / data
UI:        <TableSkeleton> / <ErrorState> / <EmptyState>

STYLE:     brand-* classes               (Tailwind, from CSS vars)
RTL:       ms- me- ps- pe- text-start    (NEVER left/right)
DARK:      dark:bg-* dark:text-*         (always supported)
A11Y:      aria-label on icon buttons    (WCAG 2.1 AA)

BUILD:     turbo build → turbo lint → typecheck → test → integration
ENCRYPT:   AES-256-GCM for PII          (iv:authTag:ciphertext format)
PASSWORD:  Argon2id                      (NOT bcrypt)
TOKEN:     15min access (memory) + 7d refresh (HttpOnly cookie)
FINANCIAL: status-based lifecycle        (NOT isActive boolean)
IMMUTABLE: reconciliation once closed    (NEVER edit)
AUDIT:     Every mutation logged          (365-day retention, append-only)
WEBHOOK:   HMAC-SHA256 signed            (PII always redacted)
TEST:      70% coverage for invoice calc + payment reconciliation
```

---

> **Generated from**: V2_DATABASE.md, V2_DECISION_LOG.md, DENTO_V2_MASTER_PLAN.md, V2_STRUCTURE.md, ADMIN_PORTAL_SCREENS.md, SECURITY_AND_ENCRYPTION.md, TECH_REQUIREMENTS.md, IMPLEMENTATION_ROADMAP.md, BUILD_RULES.md
