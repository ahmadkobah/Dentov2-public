# Dento v2 — Decision Log & Gap Resolution

> **Datum:** 2026-02-25
> **Zweck:** Beantwortet ALLE offenen Fragen aus dem Cross-Document Review.
> **Für:** Den Build-Agenten im neuen `dento-v2` Repository.
> **Regel:** Bei Widersprüchen zwischen anderen Docs und diesem Dokument gilt **dieses Dokument**.

---

## Inhaltsverzeichnis

1. [Bcrypt vs. Argon2id — ENTSCHEIDUNG](#1-bcrypt-vs-argon2id--entscheidung)
2. [API Contract & Error Handling Standard](#2-api-contract--error-handling-standard)
3. [Webhook Event Payload Schemas](#3-webhook-event-payload-schemas)
4. [Pricing Edge Cases](#4-pricing-edge-cases)
5. [MongoDB Aggregation Pipeline Patterns](#5-mongodb-aggregation-pipeline-patterns)
6. [Sharding & Connection Pool Strategy](#6-sharding--connection-pool-strategy)
7. [v1 → v2 Data Migration Plan](#7-v1--v2-data-migration-plan)
8. [Timeline Adjustment (Buffer)](#8-timeline-adjustment-buffer)
9. [2FA Phase Reassignment](#9-2fa-phase-reassignment)
10. [Test Infrastructure](#10-test-infrastructure)
11. [CI/CD Pipeline Contents](#11-cicd-pipeline-contents)
12. [Accessibility (a11y) Standards](#12-accessibility-a11y-standards)
13. [Loading / Error / Empty States](#13-loading--error--empty-states)
14. [Responsive Breakpoints](#14-responsive-breakpoints)
15. [Animation & Transition Specs](#15-animation--transition-specs)
16. [Missing Dev Portal Screens](#16-missing-dev-portal-screens)
17. [Penetration Testing Strategy](#17-penetration-testing-strategy)
18. [Key Rotation Policy](#18-key-rotation-policy)
19. [ClamAV & File Scanning](#19-clamav--file-scanning)
20. [Peer Dependency Strategy](#20-peer-dependency-strategy)
21. [API Route Naming Convention](#21-api-route-naming-convention)
22. [Phase Rollback Plans](#22-phase-rollback-plans)
23. [DATABASE_SCHEMA_EXTRACT.md Status](#23-database_schema_extractmd-status)
24. [reconciliation.createdBy Fix](#24-reconciliationcreatedby-fix)
25. [FullCalendar License](#25-fullcalendar-license)
26. [Document Authority Hierarchy](#26-document-authority-hierarchy)
27. [Staging Environment & Preview Deployments](#27-staging-environment--preview-deployments)
28. [Structured Logging (Pino)](#28-structured-logging-pino)
29. [DICOM Viewer Component](#29-dicom-viewer-component)
30. [Socket.io Redis Adapter (Multi-Instance)](#30-socketio-redis-adapter-multi-instance)

---

## 1. Bcrypt vs. Argon2id — ENTSCHEIDUNG

**Problem:** SECURITY_AND_ENCRYPTION.md §3.3 specifies `bcrypt (cost 12)`. V2_DATABASE.md §13.1 specifies `Argon2id`. These contradict each other.

### ✅ DECISION: **Argon2id** is the standard for Dento v2.

| Aspect                      | bcrypt           | Argon2id                                         | Winner   |
| --------------------------- | ---------------- | ------------------------------------------------ | -------- |
| OWASP Recommendation (2025) | Legacy           | **Current**                                      | Argon2id |
| Memory-Hard                 | ❌               | ✅ (GPU-resistant)                               | Argon2id |
| HIPAA Compliance            | Acceptable       | **Preferred**                                    | Argon2id |
| Node.js Library             | `bcryptjs`       | `argon2` (C binding, faster)                     | Argon2id |
| Cost Factor Tuning          | `saltRounds: 12` | `memoryCost: 65536, timeCost: 3, parallelism: 4` | Argon2id |

### Implementation

```typescript
// apps/api/src/utils/password.ts
import argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id, // Hybrid: Side-channel + GPU resistant
  memoryCost: 65536, // 64 MB RAM
  timeCost: 3, // 3 iterations
  parallelism: 4, // 4 threads
  hashLength: 32, // 256-bit output
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}
```

### Package Change

```diff
- "bcryptjs": "^2.4.3"        // REMOVED from TECH_REQUIREMENTS.md
+ "argon2": "^0.41.1"         // ADDED — C-based, faster than bcryptjs
```

### What changes in other docs:

- SECURITY_AND_ENCRYPTION.md §3.3: Replace `bcrypt (cost 12)` → `Argon2id (64MB, 3 iterations)`
- TECH_REQUIREMENTS.md §13: Replace `bcryptjs` → `argon2`
- IMPLEMENTATION_ROADMAP.md Wo 3: Replace `bcrypt` → `Argon2id`
- V2_DATABASE.md §13.1: Already correct (Argon2id) — no change needed

> **Note for agent:** When encountering `bcrypt` in any doc, treat it as `Argon2id`. This decision log overrides.

---

## 2. API Contract & Error Handling Standard

**Problem:** No formal API contract exists. Endpoints are mentioned textually but no OpenAPI spec or error response schema.

### ✅ DECISION: Auto-generated OpenAPI 3.1 via `@fastify/swagger` + standardized error schema.

### 2.1 Error Response Schema (all endpoints)

```typescript
// packages/shared/src/types/api-error.ts
export interface ApiError {
  statusCode: number; // HTTP status
  error: string; // Machine-readable: "VALIDATION_ERROR", "NOT_FOUND", etc.
  message: string; // Human-readable (EN), used in UI
  details?: Record<string, string[]>; // Field-level validation errors
  requestId: string; // UUID for tracing (also in X-Request-Id header)
  timestamp: string; // ISO 8601
}
```

### 2.2 HTTP Status Code Usage

| Code  | When                    | Example                               |
| ----- | ----------------------- | ------------------------------------- |
| `200` | Successful read/update  | GET /patients, PUT /patients/:id      |
| `201` | Successful creation     | POST /patients                        |
| `204` | Successful deletion     | DELETE /patients/:id                  |
| `400` | Validation error (Zod)  | Missing required field                |
| `401` | Not authenticated       | No/invalid JWT                        |
| `403` | Not authorized (RBAC)   | Receptionist tries to delete patient  |
| `404` | Resource not found      | GET /patients/nonexistent-id          |
| `409` | Conflict                | Duplicate patientCode, double-booking |
| `422` | Business rule violation | Cannot cancel completed appointment   |
| `429` | Rate limited            | Too many requests                     |
| `500` | Internal server error   | Unhandled exception                   |

### 2.3 Validation Error Format (400)

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "firstName.en": ["Required"],
    "phone": ["Must be a valid phone number"],
    "dateOfBirth": ["Must be in the past"]
  },
  "requestId": "req_abc123",
  "timestamp": "2026-03-15T10:00:00Z"
}
```

### 2.4 OpenAPI Generation

```typescript
// apps/api/src/plugins/swagger.ts
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

app.register(swagger, {
  openapi: {
    openapi: '3.1.0',
    info: {
      title: 'Dento v2 Tenant API',
      version: '1.0.0',
      description: 'Multi-tenant dental clinic management API',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development' },
      { url: 'https://api.dento.app', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
    },
  },
});

app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
});
```

**The OpenAPI spec is auto-generated from Fastify route schemas.** No separate file to maintain. Accessible at `GET /docs` in development.

### 2.5 Zod → Fastify Schema Integration

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// packages/shared/src/schemas/patient.schema.ts
export const createPatientSchema = z.object({
  firstName: z.object({ en: z.string().min(1), ar: z.string().optional() }),
  lastName: z.object({ en: z.string().min(1), ar: z.string().optional() }),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/),
  dateOfBirth: z.string().datetime(),
  gender: z.enum(['male', 'female', 'other']),
});

// apps/api/src/tenant/routes/patients/create.ts
app.post('/patients', {
  schema: {
    body: zodToJsonSchema(createPatientSchema), // → appears in /docs
    response: { 201: zodToJsonSchema(patientSchema) },
  },
  preHandler: [authGuard, roleGuard(['admin', 'doctor', 'receptionist'])],
  handler: createPatientHandler,
});
```

---

## 3. Webhook Event Payload Schemas

**Problem:** Webhook events listed but no complete event payload schema.

### ✅ DECISION: All webhook payloads follow a standard envelope + event-specific `data`.

### 3.1 Webhook Envelope (all events)

```typescript
interface WebhookPayload {
  id: string; // Unique event ID (UUID v4)
  type: string; // "patient.created", "appointment.booked", etc.
  tenantSlug: string;
  apiVersion: '2026-03-01'; // API version (for backward compat)
  createdAt: string; // ISO 8601
  data: Record<string, unknown>; // Event-specific payload (see below)
}

// Headers sent with every webhook:
// X-Webhook-Id: <event id>
// X-Webhook-Signature: sha256=<HMAC>
// X-Webhook-Timestamp: <unix seconds>
// Content-Type: application/json
```

### 3.2 Event Catalog (24 events)

| Event                      | Trigger                 | `data` contains                                             |
| -------------------------- | ----------------------- | ----------------------------------------------------------- |
| `patient.created`          | New patient saved       | Full patient object (PII redacted)                          |
| `patient.updated`          | Patient edited          | `{ before, after }` (changed fields only)                   |
| `patient.deleted`          | Soft-deleted            | `{ patientId, patientCode }`                                |
| `appointment.booked`       | New appointment         | Full appointment object                                     |
| `appointment.confirmed`    | Status → confirmed      | `{ appointmentId, confirmedBy }`                            |
| `appointment.cancelled`    | Status → cancelled      | `{ appointmentId, reason, cancelledBy }`                    |
| `appointment.completed`    | Status → completed      | `{ appointmentId, completedAt }`                            |
| `appointment.no_show`      | Marked as no-show       | `{ appointmentId }`                                         |
| `treatment_plan.created`   | New plan                | Full plan (items included)                                  |
| `treatment_plan.accepted`  | Patient approved        | `{ planId, signedAt }`                                      |
| `invoice.issued`           | Invoice status → issued | Full invoice (items included)                               |
| `invoice.paid`             | Invoice fully paid      | `{ invoiceId, paidAt, paymentMethod }`                      |
| `payment.received`         | New payment             | Full payment object                                         |
| `prescription.created`     | New prescription        | Full prescription (items included)                          |
| `lab_order.created`        | New lab order           | Full lab order                                              |
| `lab_order.status_changed` | Status updated          | `{ orderId, oldStatus, newStatus }`                         |
| `xray.uploaded`            | New X-ray               | `{ xrayId, patientId, imageUrl }`                           |
| `inventory.low_stock`      | Below min quantity      | `{ itemId, currentQty, minQty, branchId }`                  |
| `inventory.expired`        | Batch expired           | `{ itemId, batchNumber, expiryDate }`                       |
| `leave.requested`          | Staff leave request     | `{ leaveRequestId, userId, dates }`                         |
| `leave.approved`           | Leave approved          | `{ leaveRequestId, approvedBy }`                            |
| `chat.message`             | New chat message        | `{ channelId, senderId, preview }` (no content for privacy) |
| `user.created`             | New user added          | `{ userId, role, email }`                                   |
| `user.deactivated`         | User deactivated        | `{ userId }`                                                |

### 3.3 PII Redaction in Webhooks

Fields like `nationalId`, `phone`, `email` are **always** masked in webhook payloads:

- `phone`: `"+20***1234"` (first 3 + last 4 only)
- `email`: `"a***@gmail.com"`
- `nationalId`: `"***"` (completely hidden)

---

## 4. Pricing Edge Cases

**Problem:** Pricing calculation (priority chain) is complex — missing edge-case documentation.

### ✅ DECISION: Documented rules for all edge cases.

### 4.1 Currency Change Mid-Subscription

| Scenario                        | Rule                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Tenant changes default currency | **Takes effect next billing cycle only.** Current cycle remains in old currency. |
| Mid-cycle upgrade               | Prorated amount charged in the **current cycle's currency.**                     |
| Dunning in progress             | Continues in the original invoice's currency — never switches mid-dunning.       |
| Refund                          | Always in the currency of the **original payment.**                              |

### 4.2 Module Activation Mid-Cycle

```
If "insurance-claims" module is activated on Day 15 of a 30-day cycle:
  → Prorated: (15/30) × module_monthly_price
  → Charged immediately as a separate SaaS invoice
  → Next full-cycle: included in regular SaaS invoice
```

### 4.3 Downgrade with Active Data

```
If tenant deactivates "inventory" module:
  → Status → "suspended" (not deleted)
  → Data preserved for 90 days
  → API returns 403 for inventory endpoints ("Module not active")
  → After 90 days: data archived to cold storage (S3)
  → Reactivation within 90 days: data fully restored
```

### 4.4 Pricing Priority Chain

```
1. Manual Override (platform admin sets custom price for tenant)
2. Coupon/Discount (if active, percentage or fixed)
3. Country-Specific Price (from pricing_config.countryOverrides)
4. Volume Tier (from pricing_config.tiers — based on user count)
5. Base Price (from pricing_config.basePrice)
```

If multiple apply, they resolve **top-down** — first match wins. Discounts apply **on top of** the resolved price.

---

## 5. MongoDB Aggregation Pipeline Patterns

**Problem:** Complex aggregation pipelines needed for 36 reports but not documented.

### ✅ DECISION: Standard pipeline patterns defined — agent implements per-report.

### 5.1 Revenue Report (Monthly)

```typescript
db.invoices.aggregate([
  { $match: { issueDate: { $gte: startOfMonth, $lt: endOfMonth }, status: { $ne: 'cancelled' } } },
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$issueDate' } },
      totalRevenue: { $sum: '$totalAmount' },
      totalPaid: { $sum: '$amountPaid' },
      invoiceCount: { $sum: 1 },
    },
  },
  { $sort: { _id: 1 } },
]);
```

### 5.2 Doctor Productivity

```typescript
db.appointments.aggregate([
  { $match: { date: { $gte: start, $lt: end }, status: 'completed' } },
  {
    $group: {
      _id: '$doctorId',
      completedCount: { $sum: 1 },
      totalMinutes: { $sum: '$durationMinutes' },
    },
  },
  { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doctor' } },
  { $unwind: '$doctor' },
  {
    $project: {
      doctorName: '$doctor.name.en',
      completedCount: 1,
      totalMinutes: 1,
      avgMinutes: { $divide: ['$totalMinutes', '$completedCount'] },
    },
  },
  { $sort: { completedCount: -1 } },
]);
```

### 5.3 Insurance Aging Report

```typescript
db.insurance_claims.aggregate([
  { $match: { status: { $in: ['submitted', 'under_review'] } } },
  {
    $addFields: {
      ageDays: { $dateDiff: { startDate: '$claimDate', endDate: '$$NOW', unit: 'day' } },
    },
  },
  {
    $bucket: {
      groupBy: '$ageDays',
      boundaries: [0, 30, 60, 90, 120, Infinity],
      default: '120+',
      output: { count: { $sum: 1 }, totalAmount: { $sum: '$claimedAmount' } },
    },
  },
]);
```

### 5.4 Inventory Valuation

```typescript
db.inventory_stock.aggregate([
  { $lookup: { from: 'inventory_items', localField: 'itemId', foreignField: '_id', as: 'item' } },
  { $unwind: '$item' },
  {
    $group: {
      _id: '$branchId',
      totalValue: { $sum: { $multiply: ['$currentQuantity', '$item.purchasePrice'] } },
      itemCount: { $sum: 1 },
    },
  },
]);
```

### 5.5 General Rule

For all 36 reports:

- **Always filter by tenant DB** (implicit — each report only runs against the tenant's own DB)
- **Always respect RBAC** — doctor sees only their own stats, admin sees all
- **Cache results in Redis** for 5 minutes (key: `report:{tenantSlug}:{reportType}:{hash}`)
- **Use `$facet`** for dashboard widgets that need multiple metrics in one query

---

## 6. Sharding & Connection Pool Strategy

**Problem:** No sharding plan, no connection pool sizing for `useDb()`.

### ✅ DECISION: No sharding needed at launch. Connection pool carefully sized.

### 6.1 Why No Sharding (Yet)

| Metric              | Expected at Launch | Sharding Threshold |
| ------------------- | ------------------ | ------------------ |
| Tenants             | 10-50              | 1,000+             |
| Patients per tenant | 500-5,000          | 100,000+           |
| Total documents     | ~250K              | 100M+              |
| DB size             | ~2-5 GB            | 500 GB+            |

MongoDB Atlas M10 (2 vCPU, 2 GB RAM) handles this easily. Upgrade path: M10 → M20 → M30 → M50 before sharding is considered.

### 6.2 Connection Pool Strategy

```typescript
// apps/api/src/config/database.ts

// ONE connection to Atlas with a shared pool
const MONGOOSE_OPTIONS = {
  maxPoolSize: 50, // Max 50 connections in the pool
  minPoolSize: 5, // Always keep 5 alive
  maxIdleTimeMS: 30000, // Close idle connections after 30s
  serverSelectionTimeoutMS: 5000, // Fail fast if Atlas unreachable
  heartbeatFrequencyMS: 10000, // Check server status every 10s
};

const connection = await mongoose.connect(MONGODB_URI, MONGOOSE_OPTIONS);

// useDb() REUSES the same connection pool — no new connections
function getTenantDb(tenantSlug: string) {
  return connection.useDb(`tenant_${tenantSlug}`, { useCache: true });
}
```

**Key insight:** `mongoose.connection.useDb()` does **not** create new connections. It reuses the existing pool. 50 connections can serve 500+ tenants because each request is short-lived (~50-200ms).

### 6.3 Scaling Milestones

| Tenants  | Pool Size | Atlas Tier | Action                                  |
| -------- | --------- | ---------- | --------------------------------------- |
| 1-100    | 50        | M10        | Default                                 |
| 100-500  | 100       | M20        | Increase `maxPoolSize`                  |
| 500-1000 | 200       | M30        | Multiple read replicas                  |
| 1000+    | —         | M50        | Evaluate sharding OR microservice split |

---

## 7. v1 → v2 Data Migration Plan

**Problem:** No migration script or plan for moving data from v1 Postgres to v2 MongoDB.

### ✅ DECISION: Migration is a **Phase 6 deliverable**, run as a one-time CLI script.

### 7.1 Migration Strategy

```
┌────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Supabase v1   │────►│  Migration CLI   │────►│  MongoDB v2     │
│  (Postgres)    │     │  (Node.js script) │     │  (Atlas)        │
└────────────────┘     └──────────────────┘     └─────────────────┘
        │                      │                         │
   pg_dump JSON           Transform:                Write:
   export per table    - Flatten JOINs → embed     - Platform DB
                       - Rename fields              - Per-tenant DBs
                       - Encrypt PII fields
                       - Generate ObjectIds
                       - Map FKs → ObjectId refs
```

### 7.2 Migration Script Location

```
apps/api/src/scripts/migrate-v1/
├── index.ts                     // CLI entry point
├── extract.ts                   // Read from Supabase (pg client)
├── transform.ts                 // v1 row → v2 document
├── load.ts                      // Write to MongoDB
├── mapping/
│   ├── patients.ts              // patients + allergies + medHistory → patients doc
│   ├── appointments.ts
│   ├── invoices.ts              // invoices + items → invoices doc
│   ├── ...                      // One file per entity
│   └── index.ts                 // Export all mappings
└── verify.ts                    // Post-migration count comparison
```

### 7.3 Migration Order (dependency-aware)

```
1. branches, chairs → branches (embedded)
2. doctors, certificates, assignments → doctors (embedded)
3. services, service_categories → services, service_categories
4. patients, allergies, medHistory, familyLinks, insurance → patients (embedded)
5. dental_charts, dental_chart_history → dental_charts, dental_chart_history
6. appointments → appointments
7. treatment_plans + items → treatment_plans (embedded)
8. procedure_notes → procedure_notes
9. prescriptions + items → prescriptions (embedded)
10. invoices + items → invoices (embedded)
11. payments → payments
12. xrays → xrays
13. lab_orders, dental_labs → lab_orders, dental_labs
14. inventory_* → inventory_* (new structure)
15. settings (various) → settings (key-value)
```

### 7.4 Verification Checklist

```
Post-migration verification:
  ✅ Row count v1 == Document count v2 (per collection)
  ✅ Sample 100 random patients: all fields match
  ✅ All ObjectId references resolve (no orphans)
  ✅ PII fields encrypted in v2
  ✅ Indexes created and functional
  ✅ Login works with migrated user (password hash compatible)
```

### 7.5 Password Compatibility

v1 uses `bcrypt` (Supabase Auth). v2 uses `Argon2id`.

**Solution:** During migration, keep the `bcrypt` hash. On first login in v2, verify with bcrypt, then **re-hash with Argon2id** and save:

```typescript
async function loginWithMigration(email: string, password: string) {
  const user = await User.findOne({ email });

  if (user.passwordHash.startsWith('$2b$')) {
    // Legacy bcrypt hash from v1
    const valid = await bcryptCompare(password, user.passwordHash);
    if (valid) {
      // Re-hash with Argon2id
      user.passwordHash = await argon2Hash(password);
      await user.save();
      return generateTokens(user);
    }
  } else {
    // Native Argon2id hash
    const valid = await argon2Verify(user.passwordHash, password);
    if (valid) return generateTokens(user);
  }

  throw new Error('INVALID_CREDENTIALS');
}
```

---

## 8. Timeline Adjustment (Buffer)

**Problem:** 26 weeks for a solo dev is extremely ambitious. No buffer time.

### ✅ DECISION: Extend to **34 weeks** with 2-week buffers after critical phases.

### Adjusted Timeline

| Phase                       | Original            | Buffer       | New Total    |
| --------------------------- | ------------------- | ------------ | ------------ |
| Phase 0: Foundation         | Wo 1-2              | —            | Wo 1-2       |
| Phase 1: Auth & Tenancy     | Wo 3-4              | —            | Wo 3-4       |
| Phase 2: Dev Portal + Admin | Wo 5-7              | —            | Wo 5-7       |
| **Buffer 1**                | —                   | **2 weeks**  | **Wo 8-9**   |
| Phase 3: Core Clinical      | Wo 8-13 → Wo 10-15  | —            | Wo 10-15     |
| **Buffer 2**                | —                   | **2 weeks**  | **Wo 16-17** |
| Phase 4: Financial          | Wo 14-16 → Wo 18-20 | —            | Wo 18-20     |
| Phase 5: Operational        | Wo 17-19 → Wo 21-23 | —            | Wo 21-23     |
| **Buffer 3**                | —                   | **2 weeks**  | **Wo 24-25** |
| Phase 6: Support & Infra    | Wo 20-21 → Wo 26-27 | —            | Wo 26-27     |
| Phase 7: Mobile             | Wo 22-26 → Wo 28-32 | —            | Wo 28-32     |
| **Buffer 4 (Launch prep)**  | —                   | **2 weeks**  | **Wo 33-34** |
| **TOTAL**                   | **26 weeks**        | **+8 weeks** | **34 weeks** |

### Buffer Usage Rules

1. If a phase finishes on time → buffer becomes **technical debt cleanup / refactoring**
2. If a phase runs over → buffer absorbs the overrun (no cascading delays)
3. If Phase 3 overruns by >2 weeks → **cut scope** from Phase 5 (reports can be post-launch)
4. Phase 7 (Mobile) is the **first to be descoped** if behind — web app is the MVP

---

## 9. 2FA Phase Reassignment

**Problem:** 2FA is in Phase 6+ (Week 20-21). For HIPAA compliance, MFA should come earlier.

### ✅ DECISION: Move 2FA to **Phase 3, Week 13** (end of Core Clinical).

### Rationale

- HIPAA requires "Access Control" including MFA for ePHI access
- Week 13 is when PII encryption + audit logging ship — 2FA completes the auth security triad
- This is already reflected in IMPLEMENTATION_ROADMAP.md Week 13 (🔒 2FA/MFA)
- The roadmap already has it in Phase 3 — no document change needed

### Implementation Scope (Week 13)

| Component                           | Library              | Effort            |
| ----------------------------------- | -------------------- | ----------------- |
| TOTP secret generation              | `otplib`             | 2h                |
| QR code display                     | `qrcode`             | 1h                |
| 6-digit verification endpoint       | Custom               | 2h                |
| Recovery codes (10 one-time)        | Argon2id hashed      | 2h                |
| Login flow modification             | Conditional 2FA step | 3h                |
| Admin setting: require 2FA for role | Settings UI          | 2h                |
| **Total**                           |                      | **~14h (2 days)** |

### 2FA is **optional per user** by default. Tenant admin can **require 2FA** per role:

```typescript
// settings collection, key = "security"
{
  key: "security",
  value: {
    require2FA: false,             // Global toggle
    require2FAForRoles: ["owner", "admin", "doctor"],  // If enabled, these roles MUST have 2FA
    allow2FAMethods: ["totp"],     // Future: ["totp", "sms", "email"]
  }
}
```

---

## 10. Test Infrastructure

**Problem:** Tests mentioned in DoD but no concrete test infrastructure setup documented.

### ✅ DECISION: Vitest + MSW + Testing Library. Config documented here.

### 10.1 Test Stack

| Tool                          | Purpose                            | Scope                      |
| ----------------------------- | ---------------------------------- | -------------------------- |
| `vitest` 2.x                  | Unit + Integration test runner     | All workspaces             |
| `@testing-library/react` 16.x | Component testing                  | apps/admin, apps/developer |
| `@testing-library/user-event` | User interaction simulation        | apps/admin, apps/developer |
| `msw` 2.x                     | API mocking (request interception) | apps/admin, apps/developer |
| `supertest`                   | HTTP endpoint testing              | apps/api                   |
| `mongodb-memory-server`       | In-memory MongoDB for tests        | apps/api                   |

### 10.2 Vitest Config (Root)

```typescript
// vitest.config.ts (root — shared by all workspaces)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Default, overridden per workspace
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 60, // Minimum 60% — realistic for solo dev
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
```

### 10.3 API Test Example

```typescript
// apps/api/src/tenant/routes/patients/__tests__/create.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildApp } from '../../../../app';

let mongo: MongoMemoryServer;
let app: FastifyInstance;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  app = await buildApp({ mongoUri: mongo.getUri() });
});

afterAll(async () => {
  await app.close();
  await mongo.stop();
});

describe('POST /api/v1/patients', () => {
  it('creates a patient with valid data', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        firstName: { en: 'John' },
        lastName: { en: 'Doe' },
        phone: '+201234567890',
        gender: 'male',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().patientCode).toMatch(/^DEN-\d{6}$/);
  });
});
```

### 10.4 Test Strategy by Phase

| Phase | Test Focus                                          | Coverage Target |
| ----- | --------------------------------------------------- | --------------- |
| 0-1   | Auth flows, JWT rotation, RBAC middleware           | 80%             |
| 2     | Tenant CRUD, API key generation                     | 70%             |
| 3     | Patient CRUD, appointment slot engine, dental chart | 60%             |
| 4     | Invoice calculation, payment reconciliation         | 70%             |
| 5     | Inventory movements, stock calculations             | 60%             |
| 6     | Integration tests, E2E smoke                        | —               |
| 7     | Mobile: component snapshots                         | 40%             |

---

## 11. CI/CD Pipeline Contents

**Problem:** `.github/workflows/` listed but without contents.

### ✅ DECISION: 3 workflows defined.

### 11.1 `ci.yml` — Runs on every PR + push to main

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-test-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint
      - run: pnpm turbo test
      - run: pnpm turbo build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high
      - uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

### 11.2 `deploy-api.yml` — Deploys API on push to main

```yaml
name: Deploy API
on:
  push:
    branches: [main]
    paths: ['apps/api/**', 'packages/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=@dento/api
      - run: railway up --service api # OR: fly deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 11.3 `deploy-admin.yml` — Deploys Admin + Developer portals

```yaml
name: Deploy Frontends
on:
  push:
    branches: [main]
    paths: ['apps/admin/**', 'apps/developer/**', 'packages/**']

jobs:
  deploy-admin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=@dento/admin
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          working-directory: apps/admin

  deploy-developer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=@dento/developer
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          working-directory: apps/developer
```

---

## 12. Accessibility (a11y) Standards

**Problem:** No accessibility documentation — ARIA labels, keyboard navigation, screen reader support missing.

### ✅ DECISION: WCAG 2.1 AA compliance minimum. Implemented via Shadcn/Radix primitives.

### 12.1 Rules

| Rule                                       | Implementation                                                     |
| ------------------------------------------ | ------------------------------------------------------------------ |
| All interactive elements have `aria-label` | Enforced via ESLint `jsx-a11y` plugin                              |
| Color contrast ≥ 4.5:1 (normal text)       | Checked via Tailwind `text-foreground` tokens                      |
| Color contrast ≥ 3:1 (large text / icons)  | Shadcn defaults comply                                             |
| Focus indicators visible                   | Tailwind `ring-2 ring-offset-2 ring-primary` on `:focus-visible`   |
| Keyboard navigation                        | All forms navigable with Tab/Shift+Tab/Enter/Space/Escape          |
| Screen reader announcements                | `aria-live="polite"` for toast notifications                       |
| Skip navigation link                       | `<a href="#main-content" class="sr-only focus:not-sr-only">`       |
| Form errors linked to fields               | `aria-describedby={errorId}` + `aria-invalid={true}`               |
| RTL screen readers                         | `dir="rtl"` on `<html>` + `lang="ar"` — screen readers auto-switch |
| Images have alt text                       | All `<img>` require `alt=""` (decorative) or `alt="description"`   |

### 12.2 ESLint a11y Config

```typescript
// eslint.config.js
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'error',
    },
  },
];
```

### 12.3 Why WCAG AA (not AAA)

AAA requires contrast ≥ 7:1, which conflicts with the dark mode design tokens (`#1a1c23` background). AA (≥ 4.5:1) is the industry standard for web apps and satisfies HIPAA technical safeguards.

---

## 13. Loading / Error / Empty States

**Problem:** Only happy-path wireframes documented.

### ✅ DECISION: 3 standard state components, used consistently everywhere.

### 13.1 Standard Components

```typescript
// packages/ui/src/components/states/

// 1. Loading State
<Skeleton className="h-8 w-full" />                 // Table row placeholder
<Spinner size="lg" />                                // Full-page spinner
<TableSkeleton rows={10} columns={6} />              // Table skeleton

// 2. Error State
<ErrorState
  title="Something went wrong"
  message={error.message}
  action={{ label: "Try again", onClick: refetch }}
/>

// 3. Empty State
<EmptyState
  icon={<UsersIcon />}
  title="No patients yet"
  description="Add your first patient to get started"
  action={{ label: "Add Patient", onClick: openCreateDialog }}
/>
```

### 13.2 Usage Rules

| State                | When                                  | Component                                                                   |
| -------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| **Loading**          | `isLoading === true` from React Query | `<TableSkeleton>` for tables, `<Spinner>` for pages, `<Skeleton>` for cards |
| **Error**            | `isError === true` from React Query   | `<ErrorState>` with retry button                                            |
| **Empty**            | `data.length === 0`                   | `<EmptyState>` with create CTA                                              |
| **Not authorized**   | RBAC denies access                    | `<ErrorState title="Access denied" />` — no retry                           |
| **Offline** (mobile) | No network detected                   | `<OfflineBanner>` at top + cached data shown                                |

### 13.3 React Query Pattern

```typescript
function PatientList() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.patients.list(),
  });

  if (isLoading) return <TableSkeleton rows={10} columns={6} />;
  if (isError) return <ErrorState message={error.message} action={{ label: 'Retry', onClick: refetch }} />;
  if (data.length === 0) return <EmptyState icon={<Users />} title="No patients" action={{ label: 'Add Patient', onClick: open }} />;

  return <PatientTable data={data} />;
}
```

---

## 14. Responsive Breakpoints

**Problem:** Only generally mentioned (hamburger for mobile), no tablet layouts.

### ✅ DECISION: 4 breakpoints, sidebar collapses on tablet, full responsive.

### 14.1 Breakpoint System

| Name        | Min Width | Tailwind | Layout                                                  |
| ----------- | --------- | -------- | ------------------------------------------------------- |
| **Mobile**  | 0px       | Default  | Single column, hamburger menu, bottom nav               |
| **Tablet**  | 768px     | `md:`    | 2-column, collapsed sidebar (icons only), no bottom nav |
| **Desktop** | 1024px    | `lg:`    | Full sidebar (expanded), main content area              |
| **Wide**    | 1440px    | `xl:`    | Full sidebar + wider content, 3-column layouts possible |

### 14.2 Sidebar Behavior

```
Mobile (< 768px):     Sidebar hidden → Hamburger opens overlay
Tablet (768-1023px):  Sidebar collapsed (64px, icons only) → hover/click expands
Desktop (1024px+):    Sidebar expanded (256px) → can be manually collapsed
```

### 14.3 Table Behavior on Small Screens

```
Desktop:    Full table with all columns
Tablet:     Key columns only (name, status, date) + expandable row
Mobile:     Card layout — each row becomes a card with stacked fields
```

Implementation: `useBreakpoint()` hook + conditional rendering (not CSS-only hide/show).

---

## 15. Animation & Transition Specs

**Problem:** No animation/transition specs — UX polish deferred.

### ✅ DECISION: Minimal, consistent transitions. Performance-first.

### 15.1 Standard Durations

| Element                 | Duration | Easing      | Tailwind                                              |
| ----------------------- | -------- | ----------- | ----------------------------------------------------- |
| Sidebar expand/collapse | 200ms    | ease-out    | `transition-all duration-200`                         |
| Modal/Dialog open       | 150ms    | ease-out    | `animate-in fade-in-0 zoom-in-95`                     |
| Modal/Dialog close      | 100ms    | ease-in     | `animate-out fade-out-0 zoom-out-95`                  |
| Dropdown open           | 100ms    | ease-out    | Radix built-in                                        |
| Toast appear            | 200ms    | ease-out    | `animate-in slide-in-from-top-5`                      |
| Toast dismiss           | 150ms    | ease-in     | `animate-out slide-out-to-right-5`                    |
| Page transition         | 0ms      | —           | No animation (instant — faster perceived performance) |
| Skeleton pulse          | 1.5s     | ease-in-out | `animate-pulse`                                       |
| Hover effects           | 150ms    | ease        | `transition-colors duration-150`                      |

### 15.2 Rules

1. **No page transition animations** — instant navigation feels faster
2. **`prefers-reduced-motion: reduce`** → all animations disabled (CSS media query)
3. **No animations on tables** — data-heavy views must render instantly
4. **Only Radix/Shadcn built-in animations** — no custom keyframes unless justified
5. **Transform-based animations only** (`transform`, `opacity`) — never animate `width`, `height`, `top`, `left`

---

## 16. Missing Dev Portal Screens

**Problem:** 4 screens identified as missing from DEV_PORTAL_SCREENS.md.

### ✅ DECISION: Add during implementation as part of Phase 2. Specs defined here.

### 16.1 Impersonation Screen

**Location:** Tenant Detail → Tab "Support" → Button "Impersonate"

```
┌────────────────────────────────────────────────┐
│  ⚠️ Impersonation Mode                        │
│                                                │
│  Tenant: Smile Clinic Cairo                    │
│  Impersonating as: [Dropdown: Select Role ▾]   │
│  Duration: [30 min ▾] [60 min ▾] [Custom]     │
│  Reason: [_______________________________]     │
│                                                │
│  ⚠️ All actions will be logged to audit trail  │
│  ⚠️ You will see the Admin Portal as this role │
│                                                │
│  [Cancel]  [Start Impersonation →]             │
└────────────────────────────────────────────────┘
```

**Implementation:**

- Generates a temporary JWT with `impersonatedBy: platformUserId` + `originalRole: super_admin`
- Max duration: 60 minutes (hard limit)
- Audit log: every action during impersonation tagged with `isImpersonated: true`
- UI: Persistent red banner at top: "You are impersonating [role] in [tenant]. [End Session]"

### 16.2 System Health Dashboard

**Location:** Dev Portal → Sidebar → "System Health"

```
┌────────────────────────────────────────────────────────────┐
│  System Health                                              │
├─────────────────┬──────────────────────────────────────────┤
│  Service        │  Status   │  Latency  │  Uptime (30d)   │
├─────────────────┼───────────┼───────────┼─────────────────┤
│  API Server     │  🟢 UP   │  45ms     │  99.9%           │
│  MongoDB Atlas  │  🟢 UP   │  12ms     │  99.99%          │
│  Redis (Upstash)│  🟢 UP   │  8ms      │  99.95%          │
│  S3/R2 Storage  │  🟢 UP   │  22ms     │  99.99%          │
│  BullMQ Workers │  🟢 3/3  │  —        │  99.8%           │
├─────────────────┴───────────┴───────────┴─────────────────┤
│  [Request Latency Chart - p50/p95/p99 - 24h]              │
│  [Active Connections - Websocket + HTTP - 24h]             │
│  [Queue Depth - BullMQ pending jobs - 24h]                 │
│  [Error Rate - 4xx/5xx per hour - 24h]                     │
└────────────────────────────────────────────────────────────┘
```

**Implementation:** Health endpoint `GET /health` returns service statuses. Charts via Recharts. Data from:

- API: Built-in Fastify metrics plugin
- MongoDB: `db.serverStatus()` + Atlas API
- Redis: `redis.ping()` latency
- BullMQ: `queue.getJobCounts()`

### 16.3 Feature Flag Management

**Location:** Dev Portal → Sidebar → "Feature Flags"

```
┌────────────────────────────────────────────────────────────┐
│  Feature Flags                    [+ Create Flag]          │
├────────────────────────────────────────────────────────────┤
│  🟢 dental-chart-perio-data     100%     All tenants      │
│  🟡 chat-voice-notes            25%      Canary (5)       │
│  🔴 ai-treatment-suggestions    0%       Disabled          │
│  🟡 new-invoice-template        50%      Gradual rollout   │
├────────────────────────────────────────────────────────────┤
│  Click flag to edit: enabled %, target tenants, schedule   │
└────────────────────────────────────────────────────────────┘
```

**Implementation:** Uses `feature_flags` collection (V2_DATABASE.md §4.8). CRUD UI + percentage slider + tenant-selector multi-select.

### 16.4 Tenant Onboarding Wizard

**Location:** Dev Portal → Tenant List → [+ Create Tenant] → opens wizard

```
Step 1: Basic Info     → name, slug, country, timezone
Step 2: Plan Selection → choose pricing tier
Step 3: Modules        → select initial modules (checkbox list)
Step 4: Owner Account  → create owner user (email, password)
Step 5: Seed Data      → auto-seed: medications, lab order types, default services
Step 6: Confirmation   → summary + [Create Tenant →]
```

**Implementation:** Multi-step form using React state machine. On submit:

1. Create `tenants` document
2. Create `tenant_{slug}` database
3. Seed collections
4. Create owner user + assign to tenant
5. Send welcome email

---

## 17. Penetration Testing Strategy

**Problem:** Security audit mentioned but no concrete approach.

### ✅ DECISION: Self-service pen-test in Phase 6 + optional external audit pre-launch.

### 17.1 Tools (Phase 6, Week 20)

| Tool                           | Purpose                              | License |
| ------------------------------ | ------------------------------------ | ------- |
| **OWASP ZAP**                  | Automated web app scanner            | Free    |
| **Burp Suite Community**       | Manual request tampering + scanner   | Free    |
| **sqlmap** (adapted for NoSQL) | NoSQL injection testing              | Free    |
| **nuclei**                     | Template-based vulnerability scanner | Free    |
| **checkov**                    | Infrastructure-as-code scanning      | Free    |

### 17.2 Test Checklist (20 items)

```
Authentication:
  □ Brute-force login (verify cooldown kicks in)
  □ JWT tampering (modify payload, verify rejection)
  □ Token reuse after rotation (verify all sessions killed)
  □ Password reset flow (verify token is single-use)

Authorization:
  □ RBAC bypass (receptionist accessing doctor-only endpoints)
  □ Tenant isolation (tenant A accessing tenant B data)
  □ Horizontal privilege escalation (patient A viewing patient B)

Input:
  □ NoSQL injection ($gt, $regex in JSON body)
  □ XSS via patient name / notes fields
  □ File upload: .exe renamed to .jpg
  □ File upload: SVG with embedded JavaScript
  □ Oversized request body (verify 1MB limit)

API:
  □ Rate limit bypass (IP rotation)
  □ API key with expired/revoked status
  □ Webhook HMAC with wrong signature
  □ CORS: request from unauthorized origin

Infrastructure:
  □ MongoDB Atlas: verify no public access
  □ S3/R2: verify no public buckets
  □ Environment variables not in source code (TruffleHog)
  □ Source maps not deployed to production
```

### 17.3 External Audit (Optional, Post-Launch)

Budget $2,000-5,000 for a one-time external pen-test if the product handles >100 tenants. Providers: Cobalt, HackerOne, or a local Egyptian security firm.

---

## 18. Key Rotation Policy

**Problem:** Only yearly key rotation for master key — exposure window too long.

### ✅ DECISION: Tiered rotation schedule.

| Key Type               | Rotation Frequency     | Method                                                                     |
| ---------------------- | ---------------------- | -------------------------------------------------------------------------- |
| JWT Access Secret      | **90 days**            | Blue-green: new secret signs, old secret verifies for 15 min overlap       |
| JWT Refresh Secret     | **90 days**            | Same blue-green. All refresh tokens re-issued at next use                  |
| Master Encryption Key  | **6 months**           | AWS KMS automatic rotation. Re-encryption of PII fields via background job |
| API Keys (tenant)      | **Never auto-rotated** | Tenant can regenerate manually. Old key → 24h grace period                 |
| Webhook Signing Secret | **Never auto-rotated** | Tenant regenerates manually. Old secret → 1h grace period                  |
| MongoDB Atlas Password | **6 months**           | Rotated via Atlas API. Connection string updated in env                    |

### Key Rotation Background Job

```typescript
// Runs monthly via BullMQ scheduled job
// Checks if any key is approaching rotation deadline
// Sends alert to platform admin 7 days before rotation

async function checkKeyRotation() {
  const keys = [
    {
      name: 'JWT_ACCESS_SECRET',
      lastRotated: getEnvDate('JWT_ACCESS_SECRET_ROTATED'),
      maxAgeDays: 90,
    },
    {
      name: 'JWT_REFRESH_SECRET',
      lastRotated: getEnvDate('JWT_REFRESH_SECRET_ROTATED'),
      maxAgeDays: 90,
    },
    {
      name: 'ENCRYPTION_MASTER_KEY',
      lastRotated: getEnvDate('MASTER_KEY_ROTATED'),
      maxAgeDays: 180,
    },
  ];

  for (const key of keys) {
    const ageDays = daysSince(key.lastRotated);
    if (ageDays > key.maxAgeDays - 7) {
      await sendPlatformAlert(
        `⚠️ Key "${key.name}" expires in ${key.maxAgeDays - ageDays} days. Rotate now.`,
      );
    }
  }
}
```

---

## 19. ClamAV & File Scanning

**Problem:** ClamAV listed as "optional, Phase 6+" — should be earlier for medical images.

### ✅ DECISION: **Phase 3, Week 11** (when file uploads ship). Lightweight integration.

### Implementation

```typescript
// Not ClamAV (too heavy for a solo dev). Using clamdscan as a service OR cloud-based:

// Option A: ClamAV Docker sidecar (for self-hosted)
// docker-compose.yml:
//   clamav:
//     image: clamav/clamav:1.3
//     ports: ["3310:3310"]

// Option B: Cloudflare R2 + Cloudflare Workers (for managed)
// → Files uploaded to R2 trigger a Worker that scans via VirusTotal API

// Chosen: Option A for development, Option B for production.
```

### File Upload Pipeline (6 steps, Phase 3)

> **⚠️ KORREKTUR (v1.1):** Ursprünglich 50MB/500MB angegeben. Angepasst an
> SECURITY_AND_ENCRYPTION.md §8.1 und Cloudflare R2 Limits.

#### Upload-Kategorien & Limits (AUTHORITATIVE)

| Kategorie        | Max Size   | MIME Types                                                    | Extensions                             | Hinweise                                              |
| ---------------- | ---------- | ------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| `xray`           | **25 MB**  | `image/jpeg`, `image/png`, `image/dicom`, `application/dicom` | `.jpg`, `.jpeg`, `.png`, `.dcm`        | Übereinstimmung mit SECURITY doc §8.1                 |
| `cbct`           | **150 MB** | `application/dicom`, `application/octet-stream`               | `.dcm`, `.zip`                         | Multipart-Upload >100MB (R2 Limit). ZIP = DICOM-Serie |
| `avatar`         | **5 MB**   | `image/jpeg`, `image/png`, `image/webp`                       | `.jpg`, `.jpeg`, `.png`, `.webp`       | —                                                     |
| `chatAttachment` | **10 MB**  | `image/*`, `application/pdf`, `audio/*`                       | `.jpg`, `.png`, `.pdf`, `.mp3`, `.ogg` | —                                                     |
| `document`       | **10 MB**  | `application/pdf`                                             | `.pdf`                                 | Consent forms, reports                                |
| `stl`            | **50 MB**  | `application/sla`, `model/stl`                                | `.stl`                                 | 3D-Scans (Dental Models)                              |

**Warum 150MB statt 500MB für CBCT:**

- Cloudflare R2 Single-PUT Limit = 5GB, aber **Multipart empfohlen >100MB**
- Typisches CBCT-Volume (Dental FOV): 50-120MB als DICOM-ZIP
- Full-Head CBCT (selten in Dental): bis 300MB → diese gehen über **Multipart Upload** via `@fastify/multipart` mit `tus-js-client` (resumable uploads)
- 150MB deckt 95% der Dental-CBCTs als Single-Upload ab

#### Multipart-Upload für große Dateien (>100MB)

```typescript
// apps/api/src/tenant/routes/uploads/multipart.ts
import { createUpload, completeUpload } from '../../services/r2-multipart';

// 1. Client initiiert Multipart-Upload
app.post('/api/v1/uploads/initiate', {
  schema: { body: zodToJsonSchema(initiateUploadSchema) },
  handler: async (req, reply) => {
    const { fileName, fileSize, category } = req.body;
    if (fileSize > UPLOAD_RULES[category].maxSize) {
      return reply.code(413).send({ error: 'FILE_TOO_LARGE' });
    }
    const uploadId = await createUpload(fileName);
    return reply.send({ uploadId, partSize: 10 * 1024 * 1024 }); // 10MB parts
  },
});

// 2. Client uploads parts → presigned URLs
// 3. Client completes → server verifies + virus scan
```

#### Pipeline (7 steps)

```
1. Size check → per-category limit (see table above)
2. MIME type check → magic bytes, not just extension
3. Extension whitelist → per-category (see table above)
4. EXIF strip → sharp.rotate() for images (xray, avatar)
5. Virus scan → ClamAV (dev) / VirusTotal API (prod)
6. Upload to R2 → UUID filename, no user-controlled path
7. Record in DB → { fileId, tenantSlug, category, size, checksum }
```

If scan fails or is inconclusive → file quarantined, user notified, admin alerted.

---

## 20. Peer Dependency Strategy

**Problem:** pnpm workspace protocol used but peer dependency strategy not documented.

### ✅ DECISION: Strict peer deps with explicit ranges.

### Rules

```yaml
# .npmrc (root)
strict-peer-dependencies=true      # Fail install if peer deps not met
auto-install-peers=true            # Auto-install declared peers
```

### Shared Peer Dependencies

| Package     | Required By                             | Version Range |
| ----------- | --------------------------------------- | ------------- |
| `react`     | packages/ui, apps/admin, apps/developer | `^19.0.0`     |
| `react-dom` | packages/ui, apps/admin, apps/developer | `^19.0.0`     |
| `zod`       | packages/shared, apps/api, apps/admin   | `^3.23.0`     |
| `mongoose`  | packages/shared (types only), apps/api  | `^8.0.0`      |

### Workspace Protocol

```json
// apps/admin/package.json
{
  "dependencies": {
    "@dento/shared": "workspace:*",
    "@dento/ui": "workspace:*"
  }
}
```

`workspace:*` means "always use the local version from the monorepo." No version mismatch possible.

---

## 21. API Route Naming Convention

**Problem:** Route naming (`/api/v1/patients` vs `/api/patients`) is not established.

### ✅ DECISION: Versioned API with `/api/v1/` prefix. RESTful naming.

### 21.1 Route Structure

```
Platform API (Payload CMS — auto-generated):
  /api/users                       → Payload handles users CRUD
  /api/tenants                     → Payload handles tenants CRUD
  /api/modules                     → Payload handles modules CRUD
  /api/globals/system-settings     → Payload globals

Tenant API (Fastify — custom routes):
  /api/v1/patients                 → GET (list), POST (create)
  /api/v1/patients/:id             → GET (detail), PUT (update), DELETE (soft-delete)
  /api/v1/patients/:id/dental-chart → GET (patient's dental chart)
  /api/v1/appointments             → GET, POST
  /api/v1/appointments/:id/status  → PATCH (status change only)
  /api/v1/invoices                 → GET, POST
  /api/v1/invoices/:id/pdf         → GET (generate PDF)
  /api/v1/reports/revenue          → GET (with query params for date range)

Public API (no auth, API key required):
  /api/v1/public/branches          → GET (for online booking widget)
  /api/v1/public/doctors           → GET (for online booking widget)
  /api/v1/public/slots             → GET (available appointment slots)
  /api/v1/public/booking           → POST (create appointment request)

Auth:
  /api/v1/auth/login               → POST
  /api/v1/auth/refresh             → POST
  /api/v1/auth/logout              → POST
  /api/v1/auth/2fa/setup           → POST
  /api/v1/auth/2fa/verify          → POST
  /api/v1/auth/forgot-password     → POST
  /api/v1/auth/reset-password      → POST
```

### 21.2 Naming Rules

| Rule                        | Example                              |
| --------------------------- | ------------------------------------ |
| Plural nouns for resources  | `/patients` not `/patient`           |
| Kebab-case for multi-word   | `/dental-charts` not `/dentalCharts` |
| Nested for sub-resources    | `/patients/:id/dental-chart`         |
| `PATCH` for partial updates | `PATCH /appointments/:id/status`     |
| `PUT` for full replacement  | `PUT /patients/:id`                  |
| Action endpoints use verbs  | `/invoices/:id/pdf`, `/auth/login`   |

### 21.3 Tenant Resolution

Every tenant API request requires the tenant to be identified. Method:

```
Option A: Header → X-Tenant-Slug: smile-clinic    ← CHOSEN
Option B: Subdomain → smile-clinic.api.dento.app
Option C: Path → /api/v1/tenants/smile-clinic/patients
```

**Chosen: Option A (Header)** — simplest for React/Mobile clients using Axios interceptor:

```typescript
// packages/shared/src/api/client.ts
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  config.headers['X-Tenant-Slug'] = getTenantSlug(); // From auth context
  config.headers['Authorization'] = `Bearer ${getAccessToken()}`;
  return config;
});
```

---

## 22. Phase Rollback Plans

**Problem:** No rollback plan per phase — what happens if a phase runs over?

### ✅ DECISION: Each phase has a defined fallback.

| Phase       | If it runs over by >2 weeks | Rollback Action                                                                                              |
| ----------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Phase 0** | Unlikely (pure setup)       | Simplify Docker → run locally without Docker                                                                 |
| **Phase 1** | Auth problems               | Use Payload's built-in auth only (skip custom Fastify auth temporarily)                                      |
| **Phase 2** | Dev Portal delays           | Ship Dev Portal with 8/16 screens (MVP). Remaining 8 → Phase 5                                               |
| **Phase 3** | Core Clinical delays        | Cut: Chat → Phase 5. Cut: Online Booking → Phase 5. Keep: Patients + Appointments + Charts + Treatment Plans |
| **Phase 4** | Financial delays            | Cut: Insurance module → Phase 5. Keep: Invoices + Payments                                                   |
| **Phase 5** | Operational delays          | Cut: 36 reports → ship 10 most essential. Rest → post-launch                                                 |
| **Phase 6** | Infra delays                | Ship without Tailscale. Use basic deploy-via-Railway instead                                                 |
| **Phase 7** | Mobile delays               | **Ship without mobile app.** Web app is the primary product. Mobile → v2.1                                   |

### Scope Priority (what to cut first → last)

```
CUT FIRST (nice-to-have):
  1. Mobile app (Phase 7)
  2. 26 non-essential reports
  3. Staff Chat
  4. Online Booking widget
  5. Insurance module

CUT LAST (must-have MVP):
  1. Auth + Tenant Isolation
  2. Patients + Appointments + Dental Chart
  3. Treatment Plans + Procedure Notes
  4. Invoices + Payments
  5. X-Rays + Prescriptions
```

---

## 23. DATABASE_SCHEMA_EXTRACT.md Status

**Problem:** Redundant with V2_DATABASE.md. Collection count diverges (59 vs 82).

### ✅ DECISION: **Deprecated.** V2_DATABASE.md is the authoritative database document.

The file `DATABASE_SCHEMA_EXTRACT.md` was an intermediate extraction created before V2_DATABASE.md was completed. It will:

- **Not** be copied to the v2 repo
- Be kept in this repo only for historical reference
- Agent in v2 should **never** reference this file — use V2_DATABASE.md exclusively

---

## 24. reconciliation.createdBy Fix

**Problem:** `reconciliation` collection lacks a `createdBy` field.

### ✅ DECISION: Add `createdBy` and `reviewedBy` timestamps.

```typescript
// V2_DATABASE.md §7.6 — reconciliation should include:
{
  // ... existing fields ...

  closedBy: ObjectId | null,
  closedAt: Date | null,            // ← ADD
  reviewedBy: ObjectId | null,
  reviewedAt: Date | null,          // ← ADD
  createdBy: ObjectId,              // ← ADD (who opened the reconciliation)

  // ... rest ...
}
```

The agent should add these fields when implementing the `reconciliation` Mongoose schema.

---

## 25. FullCalendar License

**Problem:** Pro version costs money; Free version limits not verified.

### ✅ DECISION: Use **FullCalendar Standard (free, MIT license)**.

### What's included in free version:

| Feature                      | Free | Pro Only     |
| ---------------------------- | ---- | ------------ |
| Day/Week/Month views         | ✅   | —            |
| Drag & drop                  | ✅   | —            |
| Event resizing               | ✅   | —            |
| RTL support                  | ✅   | —            |
| Timeline view (horizontal)   | ❌   | ✅ ($499/yr) |
| Resource view (multi-column) | ❌   | ✅ ($499/yr) |
| Vertical resource timeline   | ❌   | ✅ ($499/yr) |

### What we need that's NOT in free:

The **Resource/Chair view** (show appointments per chair in columns) is Pro-only.

**Workaround:** Build a custom chair-timeline component using a simple CSS Grid:

```
Chair 1: |─ 09:00 Ahmad ─|     |─ 10:30 Sara ─|
Chair 2:      |─ 09:30 Yusuf ──────────|
Chair 3: |─── 09:00 Free ──────────────────|
```

This is a simple grid component (~200 lines) that reads appointments grouped by `chairNumber`. No FullCalendar Pro needed.

---

## 26. Document Authority Hierarchy

When docs contradict each other, follow this priority order:

```
1. V2_DECISION_LOG.md          ← THIS FILE (highest authority)
2. V2_DATABASE.md              ← Database schemas
3. SECURITY_AND_ENCRYPTION.md  ← Security rules
4. IMPLEMENTATION_ROADMAP.md   ← Timeline & phases
5. TECH_REQUIREMENTS.md        ← Package versions
6. V2_STRUCTURE.md             ← Folder structure
7. ADMIN_PORTAL_SCREENS.md     ← UI specs
8. DEV_PORTAL_SCREENS.md       ← Dev portal UI specs
9. DENTO_V2_MASTER_PLAN.md     ← General reference (may have older info)
```

**Rule:** If V2_DECISION_LOG says Argon2id and SECURITY doc says bcrypt → use Argon2id.

---

## 27. Staging Environment & Preview Deployments

**Problem:** CI/CD (§11) deploys directly to production on push to `main`. No staging URL, no preview deployments on PRs. Any broken build goes live immediately.

### ✅ DECISION: 3-tier deployment with Vercel Preview + Railway staging.

### 27.1 Branch Strategy

```
main          → Production (api.dento.app, admin.dento.app)
staging       → Staging   (staging-api.dento.app, staging-admin.dento.app)
feature/*     → Preview   (auto-generated Vercel Preview URL per PR)
```

### 27.2 Environment Matrix

| Environment    | API Host                  | Frontend Host                   | MongoDB                | Redis             | Trigger           |
| -------------- | ------------------------- | ------------------------------- | ---------------------- | ----------------- | ----------------- |
| **Production** | Railway (prod)            | Vercel (prod)                   | Atlas M10 (prod)       | Upstash (prod)    | Merge to `main`   |
| **Staging**    | Railway (staging service) | Vercel Preview (staging branch) | Atlas M10 (staging DB) | Upstash (staging) | Push to `staging` |
| **Preview**    | — (API mocked via MSW)    | Vercel Preview (auto per PR)    | —                      | —                 | Open PR           |
| **Local**      | localhost:3001            | localhost:5173                  | Docker / Atlas Dev     | Docker Redis      | `pnpm dev`        |

### 27.3 Staging Database

Staging uses a **separate Atlas cluster** (or separate databases on the same cluster):

```
Production: dento-platform, tenant_smile_clinic, tenant_nile_dental, ...
Staging:    dento-platform-staging, tenant_test_clinic_staging, ...
```

Staging is seeded with **anonymized sample data** (no real patient data ever).

### 27.4 Staging Seed Script

**Location:** `apps/api/src/scripts/seed-staging/`

```
apps/api/src/scripts/seed-staging/
├── index.ts                     // CLI entry: pnpm seed:staging
├── platform.ts                  // Seed dento-platform-staging
├── tenant.ts                    // Seed tenant_test_clinic_staging
└── data/
    ├── users.ts                 // 5 users (1 owner, 1 admin, 2 doctors, 1 receptionist)
    ├── patients.ts              // 50 fake patients via @faker-js/faker
    ├── appointments.ts          // 100 appointments across 30 days
    ├── invoices.ts              // 20 invoices (mixed statuses)
    ├── payments.ts              // 15 payments linked to invoices
    ├── services.ts              // 25 default dental services
    ├── medications.ts           // 30 common medications
    └── branches.ts              // 1 branch with 4 chairs
```

**Run:** `pnpm --filter @dento/api seed:staging`

```jsonc
// apps/api/package.json — scripts section
{
  "scripts": {
    "seed:staging": "tsx src/scripts/seed-staging/index.ts",
  },
}
```

**What gets created:**

- 1 test tenant (`test-clinic`, slug: `test-clinic`)
- 5 staff users with different roles (passwords: `Test1234!`)
- 1 branch with 4 chairs + working hours
- 50 patients with realistic Arabic+English names (via `@faker-js/faker` with `ar` locale)
- 25 services across 5 categories
- 100 appointments (past: 60 completed, future: 30 scheduled, 10 cancelled)
- 20 invoices with embedded items, 15 payments
- 30 medications (seeded from defaults)
- Settings (clinic, appointment, billing) pre-configured

**Safety:** Script checks `NODE_ENV !== 'production'` and DB name contains `staging` before running. Hard-fails otherwise.

### 27.5 Updated CI/CD Workflow

```yaml
# .github/workflows/deploy-api.yml — UPDATED
on:
  push:
    branches: [main, staging] # ← staging branch added
    paths: ['apps/api/**', 'packages/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=@dento/api

      # Deploy to correct environment based on branch
      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: railway up --service api-prod
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PROD }}

      - name: Deploy to Staging
        if: github.ref == 'refs/heads/staging'
        run: railway up --service api-staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_STAGING }}
```

### 27.6 Promotion Flow

```
feature/xyz → PR → Vercel Preview (auto) → Review → Merge to staging
staging     → Manual QA test → Merge to main (squash) → Production
```

- **Vercel Preview Deployments** are free (included in Hobby/Pro plan)
- **Railway staging** costs ~$5/mo (shared resources, can sleep when idle)
- Platform admin gets a Slack/Discord notification on each staging deploy

---

## 28. Structured Logging (Pino)

**Problem:** `requestId` is in error responses (§2), but no JSON log format, log levels, or correlation ID propagation defined anywhere.

### ✅ DECISION: Pino (Fastify default) with structured JSON output + `requestId` auto-injection.

### 28.1 Logger Configuration

```typescript
// apps/api/src/config/logger.ts
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

  // Structured JSON in production, pretty-print in dev
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined,

  // Standard fields in every log line
  base: {
    service: 'dento-api',
    version: process.env.APP_VERSION || '0.0.0',
    env: process.env.NODE_ENV,
  },

  // Redact sensitive fields from logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'res.headers["set-cookie"]',
      'body.password',
      'body.currentPassword',
      'body.newPassword',
    ],
    censor: '[REDACTED]',
  },

  // Custom serializers
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      tenantSlug: req.headers['x-tenant-slug'],
      requestId: req.id,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
};
```

### 28.2 Log Levels

| Level   | When                                 | Example                                            |
| ------- | ------------------------------------ | -------------------------------------------------- |
| `fatal` | Process cannot continue              | MongoDB connection lost, uncaught exception        |
| `error` | Operation failed, needs attention    | Payment processing failed, webhook delivery failed |
| `warn`  | Recoverable issue, potential problem | Rate limit approaching, deprecated API usage       |
| `info`  | Significant business event           | User logged in, appointment created, invoice paid  |
| `debug` | Development detail                   | Query timing, cache hit/miss, middleware execution |
| `trace` | Extreme detail (never in prod)       | Full request/response bodies                       |

### 28.3 Correlation ID Propagation

```typescript
// Fastify auto-generates requestId. Propagate it through:

// 1. Fastify → every log line (automatic)
app.register(require('@fastify/request-context'));

// 2. Fastify → Service layer
function createPatient(data: CreatePatientDto, ctx: RequestContext) {
  ctx.log.info({ patientCode: data.patientCode }, 'Creating patient');
  // ctx.log already has requestId bound
}

// 3. Fastify → BullMQ jobs
await queue.add(
  'send-email',
  { to, subject, body },
  {
    jobId: `email-${requestId}`, // Traceable back to original request
  },
);

// 4. Fastify → HTTP response header
app.addHook('onSend', (req, reply, payload, done) => {
  reply.header('X-Request-Id', req.id);
  done();
});

// 5. Frontend → API (pass requestId from client for end-to-end tracing)
api.interceptors.request.use((config) => {
  config.headers['X-Request-Id'] = crypto.randomUUID();
  return config;
});
```

### 28.4 Production Log Output (JSON)

```json
{
  "level": 30,
  "time": 1740000000000,
  "service": "dento-api",
  "version": "1.0.0",
  "env": "production",
  "reqId": "req_abc123",
  "tenantSlug": "smile-clinic",
  "method": "POST",
  "url": "/api/v1/patients",
  "statusCode": 201,
  "responseTime": 45,
  "msg": "request completed"
}
```

### 28.5 Log Aggregation

In production, logs are shipped to **Axiom** (free tier: 500MB/month, 30-day retention) via:

```bash
# Railway → stdout → Axiom integration (one-click)
# OR: pino-axiom transport
npm install pino-axiom
```

Alternative: **Better Stack (Logtail)** — free tier 1GB/month. Both have search + dashboards.

---

## 29. DICOM Viewer Component

**Problem:** CBCT/X-ray files are stored as `.dcm` (DICOM format), but no viewer component is documented in any UI spec. How does a doctor view an X-ray in the Admin Portal?

### ✅ DECISION: `cornerstone3D` for web DICOM viewing + JPEG thumbnail fallback.

### 29.1 Tech Choice

| Library           | Stars | License    | 3D Support       | DICOM Parse      | Size                  |
| ----------------- | ----- | ---------- | ---------------- | ---------------- | --------------------- |
| **cornerstone3D** | 2.5k+ | MIT        | ✅ (Volume, MPR) | ✅ (dicomParser) | ~800KB gzipped        |
| `dwv`             | 1.5k  | GPL-3.0    | ❌ (2D only)     | ✅               | ~400KB                |
| `ami.js`          | 600   | Apache-2.0 | ✅               | ✅               | ~1.2MB                |
| OHIF Viewer       | 3k+   | MIT        | ✅ (full PACS)   | ✅               | Very large (full app) |

**Winner: `cornerstone3D`** — MIT license, active development, 3D volume rendering for CBCT, lightweight enough to embed.

### 29.2 Packages

```json
// apps/admin/package.json — ADD:
{
  "@cornerstonejs/core": "^2.0.0",
  "@cornerstonejs/dicom-image-loader": "^2.0.0",
  "@cornerstonejs/tools": "^2.0.0",
  "@cornerstonejs/streaming-image-volume-loader": "^2.0.0",
  "dicom-parser": "^1.8.0"
}
```

### 29.3 X-Ray Viewer (2D — most common)

```typescript
// apps/admin/src/components/medical/XRayViewer.tsx
import { RenderingEngine, Enums } from '@cornerstonejs/core';
import { init as initDicomImageLoader } from '@cornerstonejs/dicom-image-loader';

interface XRayViewerProps {
  dicomUrl: string;    // Presigned R2 URL to .dcm file
  fallbackJpeg?: string; // JPEG thumbnail if DICOM fails to load
}

export function XRayViewer({ dicomUrl, fallbackJpeg }: XRayViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initDicomImageLoader();
    const engine = new RenderingEngine('xray-engine');
    engine.enableElement({
      viewportId: 'xray-viewport',
      type: Enums.ViewportType.STACK,
      element: viewportRef.current!,
    });
    const viewport = engine.getViewport('xray-viewport');
    viewport.setStack([`wadouri:${dicomUrl}`]);
    viewport.render();

    return () => engine.destroy();
  }, [dicomUrl]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <div ref={viewportRef} className="w-full h-[600px]" />
      {/* Toolbar: Zoom, Pan, Window/Level, Measure, Reset */}
      <ViewerToolbar viewportId="xray-viewport" />
    </div>
  );
}
```

### 29.4 CBCT Volume Viewer (3D — Phase 5+)

```typescript
// Only loaded when user opens a CBCT scan — code-split via React.lazy()
const CBCTViewer = lazy(() => import('./CBCTViewer'));

// CBCTViewer internally uses:
// - cornerstone3D Volume Viewport for MPR (Axial, Sagittal, Coronal)
// - 3D Volume Rendering for full 3D view
// - This is a Phase 5 feature — complex but cornerstone handles the heavy lifting
```

### 29.5 JPEG Thumbnail Fallback

For quick previews in patient lists / thumbnails, a JPEG is generated server-side on upload:

```typescript
// apps/api/src/tenant/services/dicom.service.ts
import { exec } from 'child_process';

// dcmtk must be installed on the server (apt install dcmtk)
// OR: use a Docker sidecar with dcmtk pre-installed
async function generateJpegPreview(dcmPath: string, outputPath: string): Promise<void> {
  // dcmj2pnm converts DICOM to JPEG/PNG
  await exec(`dcmj2pnm +oj +Wi 1 ${dcmPath} ${outputPath}`);
}
```

This runs **once on upload** (BullMQ job). The JPEG is stored alongside the `.dcm` on R2:

```
tenants/smile-clinic/xrays/
  ├── abc123.dcm          ← Original DICOM
  └── abc123_thumb.jpg    ← Auto-generated JPEG preview (max 1024px)
```

### 29.6 Phase Timing

| Feature                                        | Phase                       | Effort |
| ---------------------------------------------- | --------------------------- | ------ |
| JPEG thumbnail generation on upload            | Phase 3 (with X-ray module) | 4h     |
| 2D X-ray Viewer (cornerstone3D stack)          | Phase 3                     | 8h     |
| DICOM tools (zoom, pan, window/level, measure) | Phase 3                     | 4h     |
| CBCT 3D Volume Viewer                          | Phase 5 (operational)       | 16h    |

---

## 30. Socket.io Redis Adapter (Multi-Instance)

**Problem:** Socket.io is used for chat, notifications, queue updates, and calendar sync. If the API scales to multiple instances (Railway auto-scaling), Socket.io payloads only reach clients on the **same instance**. Messages would be lost.

### ✅ DECISION: `@socket.io/redis-adapter` — already in TECH_REQUIREMENTS.md §3.4 line 124. Config documented here.

> **Note:** This is NOT a new addition. TECH_REQUIREMENTS.md already lists:
> `@socket.io/redis-adapter | Latest | Socket.io Horizontale Skalierung via Redis Pub/Sub`
>
> This section provides the **implementation config** that was missing.

### 30.1 Server Configuration

```typescript
// apps/api/src/socket/index.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export async function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [process.env.ADMIN_URL!, process.env.DEVELOPER_URL!],
      credentials: true,
    },
    // Performance tuning
    pingTimeout: 20000,
    pingInterval: 25000,
    transports: ['websocket'], // Skip HTTP long-polling (faster)
  });

  // Redis Adapter — enables cross-instance messaging
  if (process.env.NODE_ENV === 'production') {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  }

  // Auth middleware — verify JWT before allowing Socket connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.tenantSlug = payload.tenantSlug;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  // Room strategy — each user joins their own room + tenant room
  io.on('connection', (socket) => {
    const { userId, tenantSlug } = socket.data;
    socket.join(`user:${userId}`); // Personal notifications
    socket.join(`tenant:${tenantSlug}`); // Tenant-wide broadcasts

    socket.on('disconnect', () => {
      // Cleanup handled automatically by Socket.io
    });
  });

  return io;
}
```

### 30.2 Room Architecture

```
Room Name                          Purpose                         Who Joins
─────────────────────────────────────────────────────────────────────────────
user:{userId}                      Personal notifications           One user
tenant:{tenantSlug}                Tenant-wide (queue updates)      All staff of tenant
chat:{channelId}                   Chat channel                     Channel members
calendar:{tenantSlug}:{branchId}   Appointment changes (per branch) Branch staff
```

### 30.3 Event Types (Server → Client)

```typescript
// packages/shared/src/types/socket-events.ts
export interface ServerToClientEvents {
  'notification:new': (data: { id: string; title: string; body: string; type: string }) => void;
  'appointment:created': (data: {
    appointmentId: string;
    patientName: string;
    time: string;
  }) => void;
  'appointment:updated': (data: {
    appointmentId: string;
    changes: Record<string, unknown>;
  }) => void;
  'appointment:cancelled': (data: { appointmentId: string }) => void;
  'queue:updated': (data: { branchId: string; queue: QueueEntry[] }) => void;
  'chat:message': (data: { channelId: string; message: ChatMessage }) => void;
  'chat:typing': (data: { channelId: string; userId: string; isTyping: boolean }) => void;
  'user:online': (data: { userId: string }) => void;
  'user:offline': (data: { userId: string }) => void;
}

export interface ClientToServerEvents {
  'chat:send': (data: { channelId: string; content: string; attachmentIds?: string[] }) => void;
  'chat:typing': (data: { channelId: string; isTyping: boolean }) => void;
  'chat:read': (data: { channelId: string; lastReadAt: string }) => void;
}
```

### 30.4 Scaling Behavior

| Instances  | Adapter                         | Behavior                                                       |
| ---------- | ------------------------------- | -------------------------------------------------------------- |
| 1 (launch) | In-memory (default)             | All clients on same process — no Redis needed                  |
| 2-4        | Redis Adapter                   | `io.to('user:123').emit()` reaches user on ANY instance        |
| 5+         | Redis Adapter + sticky sessions | Add `sessionAffinity: true` in Railway for WebSocket stability |

**Note:** At launch (1 instance), the Redis adapter is disabled (`if production` check above). It activates automatically when `REDIS_URL` is set and `NODE_ENV=production`.

---

## Quick Reference: All Decisions Summary

| #   | Decision                   | Resolution                                                             |
| --- | -------------------------- | ---------------------------------------------------------------------- |
| 1   | bcrypt vs Argon2id         | **Argon2id** everywhere                                                |
| 2   | API error format           | Standard `ApiError` schema + HTTP codes table                          |
| 3   | OpenAPI spec               | Auto-generated via `@fastify/swagger` at `/docs`                       |
| 4   | Webhook payloads           | Standard envelope + 24 events + PII redaction                          |
| 5   | Pricing edge cases         | Currency change → next cycle. Module mid-cycle → prorated              |
| 6   | Aggregation patterns       | 4 pipeline examples. Cache in Redis 5 min                              |
| 7   | Sharding                   | Not needed until 1000+ tenants. `useDb()` reuses pool                  |
| 8   | v1→v2 migration            | Phase 6 CLI script. Bcrypt→Argon2id on first login                     |
| 9   | Timeline                   | 26 weeks → **34 weeks** (4 × 2-week buffers)                           |
| 10  | 2FA timing                 | Phase 3, Week 13 (already in roadmap)                                  |
| 11  | Test infrastructure        | Vitest + MSW + mongodb-memory-server. 60% coverage                     |
| 12  | CI/CD                      | 3 workflows: ci.yml, deploy-api.yml, deploy-admin.yml                  |
| 13  | Accessibility              | WCAG 2.1 AA. ESLint jsx-a11y. Radix primitives                         |
| 14  | Loading/Error/Empty        | 3 standard components, React Query pattern                             |
| 15  | Responsive                 | 4 breakpoints: 0/768/1024/1440. Sidebar collapses                      |
| 16  | Animations                 | Minimal. 150-200ms. No page transitions. Reduced motion respected      |
| 17  | Missing Dev Portal screens | Impersonation, Health, Feature Flags, Onboarding Wizard                |
| 18  | Pen-test strategy          | OWASP ZAP + Burp + nuclei. 20-item checklist                           |
| 19  | Key rotation               | JWT: 90 days. Master key: 6 months. Alert 7 days before                |
| 20  | ClamAV timing              | Phase 3, Week 11 (with file uploads)                                   |
| 21  | Peer deps                  | `strict-peer-dependencies=true` + `auto-install-peers=true`            |
| 22  | API routes                 | `/api/v1/` prefix. `X-Tenant-Slug` header. Plural nouns                |
| 23  | Phase rollbacks            | Each phase has defined fallback. Mobile = first to cut                 |
| 24  | DATABASE_SCHEMA_EXTRACT.md | **Deprecated.** Use V2_DATABASE.md only                                |
| 25  | reconciliation.createdBy   | Add `createdBy`, `closedAt`, `reviewedAt`                              |
| 26  | FullCalendar license       | Free (MIT). Chair view = custom CSS Grid component                     |
| 27  | Doc authority              | This file > V2_DATABASE > SECURITY > ROADMAP > others                  |
| 28  | Staging environment        | 3-tier: Preview (PR) → Staging → Production. Vercel + Railway          |
| 29  | Structured logging         | Pino JSON + `requestId` propagation + Axiom aggregation                |
| 30  | DICOM viewer               | `cornerstone3D` (2D Phase 3, 3D Phase 5) + JPEG fallback via `dcmtk`   |
| 31  | Socket.io scaling          | `@socket.io/redis-adapter` for multi-instance. Room-based architecture |
| 32  | Financial isActive         | Status-based lifecycle, no `isActive` needed — documented deviation    |
| 33  | Route prefix `/api/`       | Use `/api/` everywhere, tenant via `X-Tenant-Slug` header              |

--- — `isActive` Soft-Delete Deviation

**Problem:** BUILD_RULES §6.4 requires an `isActive: boolean` field on every collection for soft-delete. Invoice, Payment, and Reconciliation models do not have `isActive`.

### ✅ DECISION: **Acceptable deviation — status-based lifecycle for financial records.**

| Aspect                    | Standard Pattern (`isActive`) | Financial Pattern (status)                 |
| ------------------------- | ----------------------------- | ------------------------------------------ |
| Invoice "deletion"        | `isActive: false`             | `status: 'cancelled'`                      |
| Payment "deletion"        | `isActive: false`             | `status: 'refunded'`                       |
| Reconciliation "deletion" | N/A                           | Reconciliations are immutable once closed  |
| Audit trail               | Binary (active/inactive)      | Rich (draft→issued→paid/cancelled/overdue) |
| Financial regulation      | Loses history context         | Preserves complete lifecycle               |

**Rationale:** Financial records must maintain a complete audit trail per accounting standards. A binary `isActive` flag would lose lifecycle context (e.g., was an invoice cancelled before or after payment?). Status-based lifecycle is the industry standard for invoices and payments.

**Impact:** No `isActive` field in `invoice.model.ts`, `payment.model.ts`, or `reconciliation.model.ts`. Queries should filter by status instead.

---

## 33. Route Prefix — `/api/` vs `/tenant-api/`

**Problem:** DENTO_V2_MASTER_PLAN.md uses `/tenant-api/` prefix for tenant routes. Codebase uses `/api/` consistently.

### ✅ DECISION: **Use `/api/` prefix for all routes.**

| Aspect             | `/tenant-api/`            | `/api/` (chosen)                                          |
| ------------------ | ------------------------- | --------------------------------------------------------- |
| Tenant isolation   | Explicit in URL           | Via `X-Tenant-Slug` header                                |
| Simplicity         | Longer URLs               | Standard REST convention                                  |
| Consistency        | Breaks convention         | All routes share `/api/` prefix                           |
| Platform vs Tenant | URL-based differentiation | Route-level differentiation (`/api/platform/` vs `/api/`) |

**Rationale:** `X-Tenant-Slug` header provides tenant context without polluting URLs. All existing routes (health, auth, patients, appointments, etc.) already use `/api/` prefix. Changing to `/tenant-api/` would break existing frontend consumers.

**Impact:** All tenant routes use `/api/{resource}` pattern. Platform routes use `/api/platform/{resource}`. Update MASTER_PLAN references accordingly.

---

> **Erstellt:** 2026-02-25
> **Version:** 1.2 — Updated 2026-02-27 (§32 Financial isActive deviation + §33 Route prefix)
> **Zweck:** Single source of truth for all cross-document decisions
> **Für:** Copy to `dento-v2/docs/` as the first reference for the build agent

---
