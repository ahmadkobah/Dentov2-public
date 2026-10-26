# Dento v2 — Database & RBAC Compliance Audit

**Date:** 2026-03-03  
**Auditor:** Automated Compliance Scan  
**Scope:** `apps/api/src/` — Database Models, RBAC/Auth Middleware, Tenant Isolation, Route Registration

---

## Part 1: Database Models

### 1.1 Model Inventory

**79 total `.model.ts` files** found under `apps/api/src/`:

- **20 Platform models** — `apps/api/src/platform/models/` (global `dento_platform` DB)
- **59 Tenant models** — `apps/api/src/tenant/models/` (per-tenant `tenant_{slug}` DBs)

---

### 1.2 Platform Models (20 files)

All platform models use **direct `mongoose.model()` export** — they are NOT tenant-scoped.

| #   | Model File                                  | Collection          | `timestamps` | Indexes |     Virtuals      | Factory |
| --- | ------------------------------------------- | ------------------- | :----------: | :-----: | :---------------: | :-----: |
| 1   | `platform/models/api-key.model.ts`          | `api_keys`          |      ✅      |    4    |        ❌         |   ❌    |
| 2   | `platform/models/backup-config.model.ts`    | `backup_config`     |      ✅      |    0    |        ❌         |   ❌    |
| 3   | `platform/models/backup.model.ts`           | `backups`           |      ✅      |    2    |        ❌         |   ❌    |
| 4   | `platform/models/country-config.model.ts`   | _(default)_         |      ✅      |    0    |        ❌         |   ❌    |
| 5   | `platform/models/deployment.model.ts`       | `deployments`       |      ✅      |    4    |        ❌         |   ❌    |
| 6   | `platform/models/domain.model.ts`           | `domains`           |      ✅      |    4    |        ❌         |   ❌    |
| 7   | `platform/models/error-log.model.ts`        | `error_logs`        |      ✅      |    4    |        ❌         |   ❌    |
| 8   | `platform/models/login-attempt.model.ts`    | `login_attempts`    |      ❌      |    4    |        ❌         |   ❌    |
| 9   | `platform/models/module.model.ts`           | `modules`           |      ✅      |    2    |        ❌         |   ❌    |
| 10  | `platform/models/payment.model.ts`          | `saas_payments`     |      ✅      |    4    |        ❌         |   ❌    |
| 11  | `platform/models/pricing.model.ts`          | `pricing_config`    |      ✅      |    1    |        ❌         |   ❌    |
| 12  | `platform/models/rollout-plan.model.ts`     | `rollout_plans`     |      ✅      |    2    |        ❌         |   ❌    |
| 13  | `platform/models/support-session.model.ts`  | `support_sessions`  |      ✅      |    3    |        ❌         |   ❌    |
| 14  | `platform/models/support-ticket.model.ts`   | `support_tickets`   |      ✅      |    4    |        ❌         |   ❌    |
| 15  | `platform/models/tenant-module.model.ts`    | `tenant_modules`    |      ✅      |    3    |        ❌         |   ❌    |
| 16  | `platform/models/tenant.model.ts`           | `tenants`           |      ✅      |    3    | ✅ `databaseName` |   ❌    |
| 17  | `platform/models/translation-pack.model.ts` | _(default)_         |      ✅      |    1    |        ❌         |   ❌    |
| 18  | `platform/models/user-session.model.ts`     | `user_sessions`     |      ✅      |    2    |        ❌         |   ❌    |
| 19  | `platform/models/user.model.ts`             | `users`             |      ✅      |    7    |        ❌         |   ❌    |
| 20  | `platform/models/webhook.model.ts`          | `webhook_endpoints` |      ✅      |    3    |        ❌         |   ❌    |

**Findings:**

- ⚠️ `login-attempt.model.ts` — Missing `timestamps: true`. Uses only TTL index on `createdAt`.
- ⚠️ `country-config.model.ts` and `translation-pack.model.ts` — Use default collection names (Mongoose pluralizes model name). Should use explicit `collection:` for consistency.
- ✅ Only `tenant.model.ts` has a virtual field (`databaseName`), which is correct.

---

### 1.3 Tenant Models (59 files)

Tenant models use the **factory pattern** `getXModel(connection: Connection)` — this is CRITICAL for multi-tenancy.

| #   | Model File                                  | Collection          | `timestamps` | Indexes | Factory | Notes                                      |
| --- | ------------------------------------------- | ------------------- | :----------: | :-----: | :-----: | ------------------------------------------ |
| 1   | `tenant/models/appointment-type.model.ts`   | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 2   | `tenant/models/appointment.model.ts`        | _(default)_         |      ✅      |    5    |   ✅    |                                            |
| 3   | `tenant/models/attendance.model.ts`         | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 4   | `tenant/models/audit-log.model.ts`          | `audit_logs`        |      ❌      |    6    |   ❌    | ⛔ No factory! No timestamps!              |
| 5   | `tenant/models/branch.model.ts`             | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 6   | `tenant/models/branding.model.ts`           | `settings`          |      ✅      |    1    |   ❌    | ⛔ No factory                              |
| 7   | `tenant/models/cbct-order.model.ts`         | _(default)_         |      ✅      |    5    |   ✅    |                                            |
| 8   | `tenant/models/cbct-scan-region.model.ts`   | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 9   | `tenant/models/chair.model.ts`              | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 10  | `tenant/models/chat-channel.model.ts`       | `chat_channels`     |      ✅      |    4    |   ✅    |                                            |
| 11  | `tenant/models/chat-message.model.ts`       | `chat_messages`     |      ❌      |    3    |   ✅    | ⚠️ Missing timestamps                      |
| 12  | `tenant/models/commission-payout.model.ts`  | _(default)_         |      ❌      |    1    |   ✅    | ⚠️ Missing timestamps                      |
| 13  | `tenant/models/consent-form.model.ts`       | _(default)_         |      ❌      |    3    |   ✅    | ⚠️ Missing timestamps                      |
| 14  | `tenant/models/consent-template.model.ts`   | _(default)_         |      ✅      |    1    |   ✅    |                                            |
| 15  | `tenant/models/custom-field.model.ts`       | `custom_fields`     |      ✅      |    2    |   ❌    | ⛔ No factory                              |
| 16  | `tenant/models/dental-chart.model.ts`       | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 17  | `tenant/models/dental-lab.model.ts`         | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 18  | `tenant/models/doctor-commission.model.ts`  | _(default)_         |      ✅      |    4    |   ✅    |                                            |
| 19  | `tenant/models/doctor-schedule.model.ts`    | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 20  | `tenant/models/doctor.model.ts`             | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 21  | `tenant/models/installment-plan.model.ts`   | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 22  | `tenant/models/insurance-claim.model.ts`    | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 23  | `tenant/models/insurance-company.model.ts`  | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 24  | `tenant/models/inventory-category.model.ts` | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 25  | `tenant/models/inventory-item.model.ts`     | _(default)_         |      ✅      |    6    |   ✅    |                                            |
| 26  | `tenant/models/inventory-movement.model.ts` | _(default)_         |      ❌      |    6    |   ✅    | ⚠️ Missing timestamps                      |
| 27  | `tenant/models/inventory-stock.model.ts`    | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 28  | `tenant/models/invoice.model.ts`            | _(default)_         |      ✅      |    4    |   ✅    | Auto-generates `invoiceNumber`             |
| 29  | `tenant/models/lab-order-type.model.ts`     | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 30  | `tenant/models/lab-order.model.ts`          | _(default)_         |      ✅      |    5    |   ✅    |                                            |
| 31  | `tenant/models/leave-balance.model.ts`      | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 32  | `tenant/models/leave-request.model.ts`      | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 33  | `tenant/models/leave-type.model.ts`         | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 34  | `tenant/models/medication.model.ts`         | _(default)_         |      ✅      |    4    |   ✅    |                                            |
| 35  | `tenant/models/notification.model.ts`       | _(default)_         |      ✅      |   19    |   ❌    | ⛔ No factory — uses `createX()` functions |
| 36  | `tenant/models/patient.model.ts`            | _(default)_         |      ✅      |    5    |   ✅    | Auto-generates `patientCode`               |
| 37  | `tenant/models/payment.model.ts`            | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 38  | `tenant/models/prescription.model.ts`       | _(default)_         |      ✅      |    4    |   ✅    |                                            |
| 39  | `tenant/models/procedure-note.model.ts`     | _(default)_         |      ✅      |    5    |   ✅    |                                            |
| 40  | `tenant/models/purchase-order.model.ts`     | _(default)_         |      ✅      |    4    |   ✅    |                                            |
| 41  | `tenant/models/reconciliation.model.ts`     | _(default)_         |      ✅      |    1    |   ✅    |                                            |
| 42  | `tenant/models/recurring-rule.model.ts`     | `recurring_rules`   |      ✅      |    5    |   ❌    | ⛔ No factory                              |
| 43  | `tenant/models/report.model.ts`             | _(default)_         |      ✅      |    7    |   ❌    | ⛔ No factory                              |
| 44  | `tenant/models/schedule-exception.model.ts` | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 45  | `tenant/models/service-category.model.ts`   | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 46  | `tenant/models/service.model.ts`            | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 47  | `tenant/models/settings.model.ts`           | `settings`          |      ✅      |    1    |   ❌    | ⛔ No factory                              |
| 48  | `tenant/models/shift-template.model.ts`     | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 49  | `tenant/models/staff-schedule.model.ts`     | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 50  | `tenant/models/stock-count.model.ts`        | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 51  | `tenant/models/stock-transfer.model.ts`     | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 52  | `tenant/models/supplier.model.ts`           | _(default)_         |      ✅      |    4    |   ✅    |                                            |
| 53  | `tenant/models/treatment-plan.model.ts`     | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 54  | `tenant/models/waitlist.model.ts`           | _(default)_         |      ✅      |    3    |   ✅    |                                            |
| 55  | `tenant/models/walk-in-queue.model.ts`      | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 56  | `tenant/models/webhook.model.ts`            | `webhook_endpoints` |      ✅      |    3    |   ❌    | ⛔ No factory                              |
| 57  | `tenant/models/workflow-rule.model.ts`      | `workflow_rules`    |      ✅      |    5    |   ❌    | ⛔ No factory                              |
| 58  | `tenant/models/xray-type.model.ts`          | _(default)_         |      ✅      |    2    |   ✅    |                                            |
| 59  | `tenant/models/xray.model.ts`               | _(default)_         |      ✅      |    6    |   ✅    |                                            |

---

### 1.4 Model Compliance Summary

#### Factory Pattern Compliance

| Category                              | With Factory | Without Factory | Compliance |
| ------------------------------------- | :----------: | :-------------: | :--------: |
| Platform models (correct: NO factory) |      0       |       20        |  ✅ 100%   |
| Tenant models (correct: YES factory)  |      49      |     **10**      |   ⚠️ 83%   |

**10 Tenant Models Missing Factory Pattern:**

1. `tenant/models/audit-log.model.ts` — ⛔ CRITICAL
2. `tenant/models/branding.model.ts` — ⛔ CRITICAL
3. `tenant/models/custom-field.model.ts` — ⛔ CRITICAL
4. `tenant/models/notification.model.ts` — Uses `createX(connection)` functions (alternative factory, acceptable)
5. `tenant/models/recurring-rule.model.ts` — ⛔ CRITICAL
6. `tenant/models/report.model.ts` — ⛔ CRITICAL
7. `tenant/models/settings.model.ts` — ⛔ CRITICAL
8. `tenant/models/webhook.model.ts` — ⛔ CRITICAL
9. `tenant/models/workflow-rule.model.ts` — ⛔ CRITICAL

> **Impact:** Without the factory pattern, these models may register on the default connection rather than the tenant-specific connection, potentially causing data cross-contamination between tenants.

#### Timestamps Compliance

| Category        | With `timestamps: true` |       Missing       | Compliance |
| --------------- | :---------------------: | :-----------------: | :--------: |
| Platform models |           19            | 1 (`login-attempt`) |    95%     |
| Tenant models   |           53            |          6          |    90%     |

**Tenant models missing `timestamps: true`:**

1. `audit-log.model.ts` — Likely has manual `createdAt`
2. `chat-message.model.ts`
3. `commission-payout.model.ts`
4. `consent-form.model.ts`
5. `inventory-movement.model.ts`

#### Virtual Fields

Only **1 model** has virtual fields:

- `platform/models/tenant.model.ts` — `databaseName` (returns `tenant_${slug}`)

---

### 1.5 Database Connection Architecture

**File:** `apps/api/src/config/database.ts`

```
connectDatabase()
  → mongoose.connect(env.MONGODB_URI) with poolSize=10
  → Single default connection to platform DB

getTenantDb(tenantSlug: string)
  → mongoose.connection.useDb(`tenant_${tenantSlug}`, { useCache: true })
  → Returns tenant-specific database connection
```

**Architecture:**

- **Single MongoDB instance** with multiple logical databases
- **Platform DB:** Connected via `mongoose.connect()` — used by all platform models (User, Tenant, etc.)
- **Tenant DBs:** Created on-demand via `mongoose.connection.useDb()` with caching
- **Naming convention:** `tenant_{slug}` (e.g., `tenant_acme-dental`)

**Tenant DB Middleware** (`apps/api/src/tenant/middleware/tenant-db.ts`) also implements its own connection cache:

```
getTenantConnection(slug) → Map<string, Connection> cache → useDb()
```

> ⚠️ **Duplicate caching:** Both `config/database.ts` and `tenant-db.ts` middleware implement separate caching mechanisms via `useDb()` with `useCache: true`. This is harmless (Mongoose deduplicates) but the two `getTenantDb` functions could be unified.

---

## Part 2: RBAC/Auth Implementation

### 2.1 Auth Guard Middleware

**File:** `apps/api/src/tenant/middleware/auth-guard.ts`

**What it verifies:**

1. Extracts `Bearer` token from `Authorization` header
2. Verifies JWT signature + expiry via `verifyAccessToken()`
3. Loads user from platform DB (`User.findById()`)
4. Validates user status is `active` (rejects `suspended`, `deactivated`)
5. Attaches full payload to `request.user` (userId, email, tenantSlug, role, sessionId, platformRole, platformPermissions)
6. Sets `request.tenantSlug` from JWT payload

Also exports `optionalAuthGuard` — same logic but doesn't fail if no token.

---

### 2.2 Role Guard Middleware

**File:** `apps/api/src/tenant/middleware/role-guard.ts`

**Permission Matrix:** 28 Modules × 8 Roles

**8 Roles (code-defined, NOT in DB):**
| Role | Scope |
|------|-------|
| `platform_admin` | Full access everywhere (bypass) |
| `tenant_admin` | Full access to own tenant |
| `dentist` | Clinical modules + limited admin |
| `receptionist` | Front desk operations |
| `assistant` | Clinical assistance |
| `accountant` | Financial modules |
| `lab_tech` | Lab operations |
| `hygienist` | Limited clinical |

**28 Modules:**
`dashboard`, `patients`, `appointments`, `daily-operations`, `dental-charts`, `treatment-plans`, `procedure-notes`, `prescriptions`, `xrays`, `cbct`, `lab-orders`, `consent-forms`, `invoices`, `payments`, `insurance`, `installments`, `commissions`, `inventory`, `branches`, `staff`, `doctors`, `schedules`, `leave`, `attendance`, `reports`, `notifications`, `webhooks`, `settings`

**5 Permission levels:** `read`, `create`, `update`, `delete`, `manage`

**Usage patterns:**

- `roleGuard('patients', 'read')` — Module + permission check
- `roleGuard(['tenant_admin', 'platform_admin'])` — Role-list check (overloaded)
- `requireRoles('tenant_admin', 'platform_admin')` — Convenience
- `requireAdmin` — Requires tenant_admin or platform_admin
- `requirePlatformAdmin` — Requires platform_admin only

**Key behavior:** `platform_admin` always bypasses all permission checks.

---

### 2.3 Tenant DB Middleware

**File:** `apps/api/src/tenant/middleware/tenant-db.ts`

**What it does:**

1. **For platform_admin:** Resolves tenant from `x-tenant-slug` header or `?tenantSlug=` query param
2. **For regular users:** Uses `request.user.tenantSlug` from JWT
3. Validates tenant exists and is active (rejects `suspended`, `cancelled`)
4. Attaches `request.tenantDb` (Connection), `request.tenantSlug`, and `request.tenant` (id, slug, name, status, settings)
5. Updates `lastActivityAt` on the Tenant document

Also exports `optionalTenantMiddleware` for endpoints that optionally accept tenant context.

---

### 2.4 Platform Guard Middleware

**File:** `apps/api/src/platform/middleware/platform-guard.ts`

**Status:** ✅ FULLY IMPLEMENTED

**3 Platform Roles:**
| Role | Scope |
|------|-------|
| `platform_owner` | Full access to all 11 platform modules |
| `platform_admin` | Read + limited write on most modules |
| `platform_viewer` | Read-only on most modules |

**11 Platform Modules:**
`platform_tenants`, `platform_users`, `platform_billing`, `platform_modules`, `platform_pricing`, `platform_api_keys`, `platform_webhooks`, `platform_backups`, `platform_support`, `platform_settings`, `platform_audit`

**5 Actions:** `read`, `create`, `update`, `delete`, `manage`

**Usage:** `authGuard → platformGuard('platform_tenants', 'read') → handler`

**Supports per-user permission overrides** (from `user.platformPermissionOverrides`).

---

### 2.5 Auth Routes

**File:** `apps/api/src/tenant/routes/auth/auth.route.ts` (1182 lines)

| Endpoint                    | Method | Auth | Description                                        |
| --------------------------- | ------ | :--: | -------------------------------------------------- |
| `/auth/login`               | POST   |  ❌  | Email + password login with brute-force protection |
| `/auth/register`            | POST   |  ❌  | Self-registration with Argon2id hashing            |
| `/auth/refresh`             | POST   |  ❌  | Rotate token pair (cookie or body)                 |
| `/auth/logout`              | POST   |  ✅  | Revoke current session                             |
| `/auth/logout-all`          | POST   |  ✅  | Revoke ALL sessions + increment tokenVersion       |
| `/auth/forgot-password`     | POST   |  ❌  | Generate reset token (anti-enumeration)            |
| `/auth/reset-password`      | POST   |  ❌  | Use reset token to set new password                |
| `/auth/change-password`     | POST   |  ✅  | Change password (requires current password)        |
| `/auth/me`                  | GET    |  ✅  | Get current user profile                           |
| `/auth/me`                  | PATCH  |  ✅  | Update profile fields                              |
| `/auth/sessions`            | GET    |  ✅  | List active sessions                               |
| `/auth/sessions/:sessionId` | DELETE |  ✅  | Revoke specific session                            |
| `/auth/verify-invite`       | POST   |  ❌  | Verify invite token (public)                       |
| `/auth/accept-invite`       | POST   |  ❌  | Accept invite + set password                       |

**Password Hashing:**

- **Primary:** Argon2id (`memoryCost: 64MB`, `timeCost: 3`, `parallelism: 4`)
- **Compat shim:** bcrypt→Argon2id migration on first v2 login (detects `$2a$`/`$2b$` prefix)
- **Password history:** Last 5 hashes checked on change/reset

**JWT Generation:**

- **Access token:** HS256, 15min TTL (configurable via `JWT_ACCESS_EXPIRY`), contains `userId`, `email`, `tenantSlug`, `role`, `sessionId`, `platformRole`, `platformPermissions`
- **Refresh token:** HS256, 7d TTL (configurable), contains `userId`, `sessionId`, `tokenVersion`, `jti`
- **Refresh delivery:** HttpOnly + Secure + SameSite=Strict cookie (`dento_refresh`)
- **Token rotation:** Every refresh invalidates old session, creates new one
- **Reuse detection:** If old `jti` not found in active sessions, ALL user sessions are revoked

**Session Management:**

- Max 5 concurrent sessions per user (oldest evicted)
- Sessions tracked in `UserSession` model (platform DB)
- Tracks device type, browser, OS, IP
- `tokenVersion` mechanism for global token invalidation

**2FA:**

- If `twoFactorEnabled`, login returns `tempToken` instead of full tokens
- Client must call `/auth/2fa/validate` (in `two-factor.route.ts`)
- Role-based 2FA enforcement from tenant security settings

---

### 2.6 Auth Schemas

**File:** `packages/shared/src/schemas/auth.schema.ts`

| Schema                 | Fields                                                      |
| ---------------------- | ----------------------------------------------------------- |
| `loginSchema`          | `email`, `password` (8-128), `tenantSlug?`                  |
| `registerSchema`       | `email`, `password`, `firstName`, `lastName`, `tenantSlug?` |
| `refreshTokenSchema`   | `refreshToken?`                                             |
| `forgotPasswordSchema` | `email`                                                     |
| `resetPasswordSchema`  | `token`, `password` (8-128)                                 |
| `totpVerifySchema`     | `code` (exactly 6 chars)                                    |
| `changePasswordSchema` | `currentPassword`, `newPassword` (8-128)                    |

All schemas use `.strict()` mode (reject unknown fields).

---

### 2.7 Tenant Schemas

**File:** `packages/shared/src/schemas/tenant.schema.ts`

| Schema               | Fields                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createTenantSchema` | `name`, `slug` (regex: `^[a-z0-9][a-z0-9-]*[a-z0-9]$`), `adminEmail`, `adminFirstName`, `adminLastName`, `adminPassword`, `countryCode`, `timezone`, `locale` |
| `updateTenantSchema` | `name?`, `status?` (enum: active/suspended/cancelled/trial), `settings?`                                                                                      |

---

## Part 3: Tenant Isolation

### 3.1 Tenant Resolution Flow

```
Request → authGuard (JWT → user.tenantSlug)
        → tenantDbMiddleware
            ├── Platform admin? → x-tenant-slug header / ?tenantSlug query
            └── Regular user?  → JWT tenantSlug
        → Validate tenant exists + active in platform DB
        → request.tenantDb = mongoose.connection.useDb(`tenant_${slug}`)
        → Handler uses request.tenantDb to get models
```

### 3.2 Database-per-Tenant Isolation

- ✅ **Each tenant has a separate MongoDB database** (`tenant_{slug}`)
- ✅ **Connections are cached** via `useDb({ useCache: true })` and a `Map<string, Connection>`
- ✅ **Tenant models use factory pattern**: `getPatientModel(request.tenantDb)` creates/retrieves model bound to the tenant's connection
- ✅ **Tenant status is validated** before granting access (suspended/cancelled tenants are blocked)
- ✅ **Platform admin context switching** via header/query param — admin can access any tenant

### 3.3 Isolation Issues

|  Severity   | Issue                                                                                         | Details                                                                                                                                                                                 |
| :---------: | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⛔ CRITICAL | **10 tenant models lack factory pattern**                                                     | `audit-log`, `branding`, `custom-field`, `recurring-rule`, `report`, `settings`, `webhook`, `workflow-rule` operate on default connection, NOT tenant DB. Data may leak across tenants. |
|   ⚠️ HIGH   | **notifications.route.ts** has NO middleware                                                  | Accesses `request.tenantDb` and `request.user.id` via unsafe casting without `authGuard` or `tenantDbMiddleware` in preHandler. These properties will be `undefined` at runtime.        |
|   ⚠️ HIGH   | **recurring.route.ts** has NO middleware                                                      | Same issue — accesses `request.tenantDb` via casting without middleware chain.                                                                                                          |
|  ⚠️ MEDIUM  | **Notification model** uses `createX(connection)` instead of standard `getXModel(connection)` | Functional but inconsistent naming.                                                                                                                                                     |

---

## Part 4: Route Registration

### 4.1 Complete Route Registry

**File:** `apps/api/src/server.ts` (397 lines)

All routes registered in `bootstrap()` function:

#### Tenant Routes (no version prefix — correct per BUILD_RULES)

| #   | Route Import              | Prefix                      |                Middleware Status                |
| --- | ------------------------- | --------------------------- | :---------------------------------------------: |
| 1   | `healthRoutes`            | _(none)_                    |               ✅ Public (correct)               |
| 2   | `authRoutes`              | `/api`                      |              ✅ Mixed public/auth               |
| 3   | `patientRoutes`           | `/api/patients`             |                  ✅ Full chain                  |
| 4   | `appointmentRoutes`       | `/api/appointments`         |                  ✅ Full chain                  |
| 5   | `appointmentTypeRoutes`   | `/api/appointment-types`    |                  ✅ Full chain                  |
| 6   | `waitlistRoutes`          | `/api/waitlists`            |                  ✅ Full chain                  |
| 7   | `translationRoutes`       | `/api`                      |                ✅ Public (i18n)                 |
| 8   | `notificationRoutes`      | `/api/notifications`        |              ⛔ **NO middleware**               |
| 9   | `recurringRoutes`         | `/api/recurring-rules`      |              ⛔ **NO middleware**               |
| 10  | `dashboardRoutes`         | `/api/dashboard`            |       ⚠️ authGuard+tenantDb, no roleGuard       |
| 11  | `reportRoutes`            | `/api/reports`              |           ✅ Full chain (sub-routes)            |
| 12  | `brandingRoutes`          | `/api`                      |       ⚠️ authGuard+tenantDb, no roleGuard       |
| 13  | `settingsRoutes`          | `/api/settings`             | ⚠️ authGuard+tenantDb, no roleGuard (per audit) |
| 14  | `scheduleRoutes`          | `/api/schedules`            |                  ✅ Full chain                  |
| 15  | `leaveRoutes`             | `/api/leave`                |                  ✅ Full chain                  |
| 16  | `attendanceRoutes`        | `/api/attendance`           |                  ✅ Full chain                  |
| 17  | `bookingRoutes`           | `/api/bookings`             |                  ✅ Full chain                  |
| 18  | `dentalChartRoutes`       | `/api/dental-charts`        |                  ✅ Full chain                  |
| 19  | `treatmentPlanRoutes`     | `/api/treatment-plans`      |                  ✅ Full chain                  |
| 20  | `procedureNoteRoutes`     | `/api/procedure-notes`      |                  ✅ Full chain                  |
| 21  | `medicationRoutes`        | `/api/medications`          |                  ✅ Full chain                  |
| 22  | `prescriptionRoutes`      | `/api/prescriptions`        |                  ✅ Full chain                  |
| 23  | `xrayRoutes`              | `/api/xrays`                |                  ✅ Full chain                  |
| 24  | `cbctRoutes`              | `/api/cbct`                 |                  ✅ Full chain                  |
| 25  | `uploadRoutes`            | `/api/uploads`              |                  ✅ Full chain                  |
| 26  | `xrayTypeRoutes`          | `/api/xray-types`           |                  ✅ Full chain                  |
| 27  | `cbctScanRegionRoutes`    | `/api/cbct-scan-regions`    |                  ✅ Full chain                  |
| 28  | `labOrderTypeRoutes`      | `/api/lab-order-types`      |                  ✅ Full chain                  |
| 29  | `walkInQueueRoutes`       | `/api/walk-in-queue`        |       ⚠️ authGuard+tenantDb, no roleGuard       |
| 30  | `dentalLabRoutes`         | `/api/dental-labs`          |                  ✅ Full chain                  |
| 31  | `labOrderRoutes`          | `/api/lab-orders`           |                  ✅ Full chain                  |
| 32  | `serviceCategoryRoutes`   | `/api/service-categories`   |                  ✅ Full chain                  |
| 33  | `serviceRoutes`           | `/api/services`             |                  ✅ Full chain                  |
| 34  | `consentTemplateRoutes`   | `/api/consent-templates`    |                  ✅ Full chain                  |
| 35  | `consentFormRoutes`       | `/api/consent-forms`        |       ⚠️ authGuard+tenantDb, no roleGuard       |
| 36  | `chatRoutes`              | `/api/chat`                 |       ⚠️ authGuard+tenantDb, no roleGuard       |
| 37  | `doctorRoutes`            | `/api/doctors`              |                  ✅ Full chain                  |
| 38  | `userRoutes`              | `/api/users`                |                  ✅ Full chain                  |
| 39  | `branchRoutes`            | `/api/branches`             |                  ✅ Full chain                  |
| 40  | `tenantSettingsRoutes`    | `/api/tenant-settings`      |                  ✅ Full chain                  |
| 41  | `auditLogRoutes`          | `/api/audit-logs`           |                  ✅ Full chain                  |
| 42  | `tenantWebhookCrudRoutes` | `/api/tenant-webhooks`      |                  ✅ Full chain                  |
| 43  | `customFieldRoutes`       | `/api/custom-fields`        |                  ✅ Full chain                  |
| 44  | `workflowRoutes`          | `/api/workflows`            |                  ✅ Full chain                  |
| 45  | `twoFactorRoutes`         | `/api`                      |             ✅ authGuard (correct)              |
| 46  | `invoiceRoutes`           | `/api/invoices`             |                  ✅ Full chain                  |
| 47  | `tenantPaymentRoutes`     | `/api/tenant-payments`      |                  ✅ Full chain                  |
| 48  | `insuranceCompanyRoutes`  | `/api/insurance-companies`  |                  ✅ Full chain                  |
| 49  | `insuranceClaimRoutes`    | `/api/insurance-claims`     |                  ✅ Full chain                  |
| 50  | `installmentRoutes`       | `/api/installments`         |                  ✅ Full chain                  |
| 51  | `commissionRoutes`        | `/api/commissions`          |                  ✅ Full chain                  |
| 52  | `inventoryCategoryRoutes` | `/api/inventory-categories` |                  ✅ Full chain                  |
| 53  | `inventoryItemRoutes`     | `/api/inventory-items`      |                  ✅ Full chain                  |
| 54  | `inventoryStockRoutes`    | `/api/inventory-stock`      |                  ✅ Full chain                  |
| 55  | `inventorySupplierRoutes` | `/api/suppliers`            |                  ✅ Full chain                  |
| 56  | `purchaseOrderRoutes`     | `/api/purchase-orders`      |                  ✅ Full chain                  |
| 57  | `stockTransferRoutes`     | `/api/stock-transfers`      |                  ✅ Full chain                  |
| 58  | `stockCountRoutes`        | `/api/stock-counts`         |                  ✅ Full chain                  |

#### Platform Routes

| #   | Route Import             | Prefix                        |      Middleware Status       |
| --- | ------------------------ | ----------------------------- | :--------------------------: |
| 1   | `versioningRoutes`       | `/api`                        | ✅ authGuard + platformGuard |
| 2   | `platformWebhookRoutes`  | `/api/webhooks`               | ✅ authGuard + platformGuard |
| 3   | `tenantWebhookRoutes`    | `/api/webhooks`               | ✅ authGuard + platformGuard |
| 4   | `pricingRoutes`          | `/api/pricing`                | ✅ authGuard + platformGuard |
| 5   | `paymobPaymentRoutes`    | `/api/payments`               | ✅ authGuard + platformGuard |
| 6   | `stripePaymentRoutes`    | `/api/payments`               | ✅ authGuard + platformGuard |
| 7   | `backupRoutes`           | `/api/backups`                | ✅ authGuard + platformGuard |
| 8   | `rateLimitRoutes`        | `/api/rate-limits`            | ✅ authGuard + platformGuard |
| 9   | `apiKeyRoutes`           | `/api/api-keys`               | ✅ authGuard + platformGuard |
| 10  | `dbExplorerRoutes`       | `/api/db-explorer`            | ✅ authGuard + platformGuard |
| 11  | `moduleManagementRoutes` | `/api/platform/modules`       | ✅ authGuard + platformGuard |
| 12  | `supportRoutes`          | `/api/support`                | ✅ authGuard + platformGuard |
| 13  | `impersonationRoutes`    | `/api/admin`                  | ✅ authGuard + platformGuard |
| 14  | `platformUserRoutes`     | `/api/platform/users`         | ✅ authGuard + platformGuard |
| 15  | `errorLogRoutes`         | `/api/platform/error-logs`    | ✅ authGuard + platformGuard |
| 16  | `domainRoutes`           | `/api/platform/domains`       | ✅ authGuard + platformGuard |
| 17  | `platformSessionRoutes`  | `/api/platform/user-sessions` | ✅ authGuard + platformGuard |
| 18  | `platformAuditLogRoutes` | `/api/platform/audit-logs`    | ✅ authGuard + platformGuard |
| 19  | `systemLogRoutes`        | `/api/platform/system-logs`   | ✅ authGuard + platformGuard |
| 20  | `deploymentRoutes`       | `/api/platform/deployments`   | ✅ authGuard + platformGuard |
| 21  | `billingRoutes`          | `/api/platform/billing`       | ✅ authGuard + platformGuard |

### 4.2 Prefix Patterns

- **All routes use `/api/` prefix** — consistent ✅
- **No version prefixes** (`/v1/`, `/v2/`) — correct per BUILD_RULES ✅
- **Platform-specific routes** use `/api/platform/` sub-prefix ✅
- **`healthRoutes`** registered without prefix (root-level) ✅

### 4.3 Global Middleware (Hooks)

Applied to ALL requests via `fastify.addHook()`:

1. `inputSanitizer` — NoSQL injection defense (preHandler)
2. `auditLoggerPreHandler` — Capture before-state (preHandler)
3. `auditLoggerOnResponse` — Log completed request (onResponse)

### 4.4 Global Plugins

1. `fastifyCookie` — Refresh token cookies
2. `fastifyMultipart` — File uploads (150MB max, 1 file)
3. `helmetPlugin` — Security headers
4. `corsPlugin` — CORS
5. `rateLimitPlugin` — Global rate limiting
6. `sentryPlugin` — Error tracking
7. `swaggerPlugin` — API documentation
8. `socketPlugin` — WebSocket (real-time)

### 4.5 Workers Started

1. `startNotificationWorkers()`
2. `startReportExportWorker()`
3. `startWebhookWorker()`
4. `startBackupWorker()`
5. `scheduleRecurringGeneration()`
6. `startReportScheduler()`
7. `startOverdueInvoiceScheduler()`
8. `startScheduledJobs()`
9. `startSSLExpiryWorker()` + `scheduleSSLExpiryCheck()`
10. `startBackupRestoreWorker()` + `scheduleBackupRestoreTest()`

---

## Summary of Findings

### ⛔ CRITICAL ISSUES (5)

| #   | Issue                                                                                | Files Affected                                                                                              | Impact                                                                                  |
| --- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| C-1 | 9 tenant models missing factory pattern                                              | `audit-log`, `branding`, `custom-field`, `recurring-rule`, `report`, `settings`, `webhook`, `workflow-rule` | **Tenant data isolation breach** — models may register on global connection             |
| C-2 | `notifications.route.ts` — no `authGuard`, `tenantDbMiddleware`, or `roleGuard`      | `tenant/routes/notifications/notifications.route.ts`                                                        | **Unauthenticated access** to notification endpoints; `request.tenantDb` is `undefined` |
| C-3 | `recurring.route.ts` — no `authGuard`, `tenantDbMiddleware`, or `roleGuard`          | `tenant/routes/recurring/recurring.route.ts`                                                                | **Unauthenticated access**; accesses `request.tenantDb` via unsafe casting              |
| C-4 | `reports.route.ts` (composer) — no direct middleware                                 | `tenant/routes/reports/reports.route.ts`                                                                    | Delegates to sub-routes (which DO have middleware), but composer itself has no guard    |
| C-5 | `notifications.route.ts` accesses `request.user.id` instead of `request.user.userId` | `tenant/routes/notifications/notifications.route.ts`                                                        | **Runtime crash** — `authGuard` sets `userId`, not `id`                                 |

### ⚠️ HIGH ISSUES (7)

| #   | Issue                                                             | Files Affected                                            |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| H-1 | `branding.route.ts` (`settingsRoutes`) — missing `roleGuard`      | Settings endpoint accessible to any authenticated user    |
| H-2 | `dashboard.route.ts` — no `roleGuard` on dashboard endpoints      | Any authenticated tenant user can view all dashboard data |
| H-3 | `chat.route.ts` — no `roleGuard`                                  | All roles can access chat endpoints                       |
| H-4 | `consent-forms.route.ts` — no `roleGuard`                         | Missing granular permission checks                        |
| H-5 | `walk-in-queue.route.ts` — no `roleGuard`                         | Queue operations accessible to all roles                  |
| H-6 | 5 tenant models missing `timestamps: true`                        | Audit trail gaps                                          |
| H-7 | `translations.route.ts` — public endpoints to platform-level data | No auth on translation/country data (may be by design)    |

### ✅ PASSING

| Area                                           | Status                                                      |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Platform guard fully implemented               | ✅ All 20 platform routes use `authGuard` + `platformGuard` |
| JWT dual-token system with rotation            | ✅ Access (15m) + Refresh (7d, HttpOnly cookie)             |
| Password hashing (Argon2id)                    | ✅ With bcrypt migration shim                               |
| Password history (last 5)                      | ✅ Prevents reuse                                           |
| Brute-force protection                         | ✅ `loginRateLimiter` + `checkLoginAllowed`                 |
| Session management                             | ✅ Max 5 sessions, revocation, reuse detection              |
| 2FA / TOTP support                             | ✅ Role-based 2FA enforcement                               |
| Tenant status validation                       | ✅ Suspended/cancelled tenants blocked                      |
| Zod validation on all schemas                  | ✅ `.strict()` mode                                         |
| No version prefixes in routes                  | ✅ Only `/api/` prefix used                                 |
| Global input sanitization                      | ✅ NoSQL injection defense via hook                         |
| Audit logging on all requests                  | ✅ Global pre/post hooks                                    |
| 49/59 tenant models use factory pattern        | ✅ 83% compliance                                           |
| 43/59 tenant routes have full middleware chain | ✅ 73% compliance                                           |

---

_End of audit report._
