# Tenant Creation Wizard & Per-Tenant Provider Credentials — Implementation Plan

> **Created:** $(date)  
> **Scope:** Developer portal **tenant creation wizard** + **per-tenant communication credentials** (Email, SMS, WhatsApp, Push)  
> **Prerequisite:** Sprint 1–5 gaps completed (commit `fa45b01`)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Architecture Decision](#3-architecture-decision)
4. [Phase 1 — Tenant Provider Credentials Model & Encryption](#phase-1--tenant-provider-credentials-model--encryption)
5. [Phase 2 — Provider Refactor (Tenant-Aware)](#phase-2--provider-refactor-tenant-aware)
6. [Phase 3 — Platform Tenants API (Backend CRUD)](#phase-3--platform-tenants-api-backend-crud)
7. [Phase 4 — Extended Onboarding API](#phase-4--extended-onboarding-api)
8. [Phase 5 — Developer Portal Wizard UI](#phase-5--developer-portal-wizard-ui)
9. [Phase 6 — Tenant Detail Channels Tab (Post-Creation Editing)](#phase-6--tenant-detail-channels-tab-post-creation-editing)
10. [Migration & Rollback Strategy](#migration--rollback-strategy)
11. [Testing Plan](#testing-plan)
12. [File Change Summary](#file-change-summary)
13. [Risk Register](#risk-register)

---

## 1. Executive Summary

The system currently uses **global singletons** for all notification providers — credentials are read from `process.env` once at module load and shared across every tenant. This plan introduces:

1. **Per-tenant encrypted credentials** stored in a new `providers` settings key in each tenant database
2. **Provider refactoring** so each send function accepts optional tenant-specific config, falling back to global `process.env` defaults
3. **A full platform tenants CRUD API** (currently missing — frontend hooks exist but no backend)
4. **An extended onboarding API** that accepts modules, branding, and optional provider credentials
5. **A 5-step creation wizard** in the developer portal (Basic Info → Branding → Modules → Communication → Review)
6. **A functional Channels tab** on the tenant detail page for editing credentials post-creation

---

## 2. Current State Analysis

### 2.1 Provider Architecture (Global Singletons)

| Provider          | File                                                      | Singleton Pattern                                                                   | Critical Issue                                                                                 |
| ----------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Email**         | `apps/api/src/services/providers/email.provider.ts`       | `let resendClient: Resend \| null` + `let nodemailerTransport: Transporter \| null` | `DEFAULT_FROM` hardcoded to `'Dento <noreply@dento.app>'`                                      |
| **SMS**           | `apps/api/src/services/providers/sms.provider.ts`         | `let twilioClient \| null` via `process.env.TWILIO_*`                               | Credentials read once; `DEFAULT_FROM` is `process.env.TWILIO_PHONE_NUMBER` read at module load |
| **WhatsApp**      | `apps/api/src/services/providers/whatsapp.provider.ts`    | Module-level `const WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_ID`  | **Constants at module top-level — cannot change after import**                                 |
| **Push (Web)**    | `apps/api/src/services/providers/push.provider.ts`        | `webPush.setVapidDetails()` called once via `configured` flag                       | **🔴 `setVapidDetails` is global state — cannot be per-tenant without per-call override**      |
| **Push (Mobile)** | `apps/api/src/services/providers/mobile-push.provider.ts` | Firebase `initializeApp()` + Expo client as global singletons                       | Firebase needs **named apps** for multi-tenant; Expo is stateless (OK)                         |

### 2.2 BullMQ Workers (No Tenant Context)

The workers in `notification.service.ts` (L632–740) call providers with **zero tenant context**:

```typescript
// Email Worker (L632)
const result = await sendEmail({ to, subject, html });
// SMS Worker (L659)
const result = await sendSms({ to, body });
// WhatsApp Worker (L683)
const result = await sendWhatsApp({ to, templateId, variables });
// Push Worker (L708)
const webResult = await sendPush({ tokens, title, body });
```

Job payloads include `tenantId` but it's **never used** to look up tenant-specific credentials.

### 2.3 Settings Model

`apps/api/src/tenant/models/settings.model.ts` — 6 keys: `clinic`, `appointment`, `billing`, `notifications`, `security`, `inventory`.

The `notifications` key only holds boolean toggles:

```typescript
notifications: {
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  pushEnabled: true,
  quietHoursStart: '',
  quietHoursEnd: '',
  defaultLanguage: 'en',
}
```

**No credential storage exists yet.**

### 2.4 Platform Tenants API — MISSING

The developer portal already has frontend hooks (`useTenants.ts`) calling:

- `GET /api/platform/tenants` → List
- `GET /api/platform/tenants/stats` → Stats
- `POST /api/platform/tenants` → Create (payload: `{ name, slug, plan, country }`)
- `DELETE /api/platform/tenants/:id` → Delete

**No backend route file exists** for `/api/platform/tenants`. The hooks will 404.

### 2.5 Developer Portal UI

| Component                             | Status                                                                                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TenantsPage.tsx`                     | "New Tenant" button exists — **no click handler**                                                                                                                                   |
| `TenantDetailPage.tsx`                | Uses **`mockTenant`** — no real API hook                                                                                                                                            |
| `ChannelsTab.tsx`                     | 208 lines of **static markup** — uncontrolled inputs, no state, no submit handlers                                                                                                  |
| `useTenants.ts` → `useCreateTenant()` | Sends `{ name, slug, plan, country }` — **mismatches `createTenantSchema`** which expects `adminEmail, adminFirstName, adminLastName, adminPassword, countryCode, timezone, locale` |

### 2.6 Existing Onboarding Route

`apps/api/src/tenant/routes/onboarding/onboarding.route.ts` — public self-signup endpoint with 9-step provisioning:

1. Zod validation (clinic, branch, admin, settings)
2. Duplicate email check
3. Unique slug generation
4. Hash password (argon2id)
5. Create User (platform DB)
6. Create Tenant (platform DB)
7. Provision tenant DB (`getTenantDb(slug)`)
8. Create Branch (tenant DB)
9. Seed defaults (database, settings)

This is for **self-sign-up**. The developer portal needs a **separate admin-created** onboarding flow.

### 2.7 Encryption

`apps/api/src/utils/encryption.ts` — AES-256-GCM with `ENCRYPTION_MASTER_KEY`. Exports:

- `encryptField(plaintext)` → `iv:authTag:ciphertext` (hex)
- `decryptField(encrypted)` → plaintext
- `isEncryptionEnabled()` → boolean
- `encryptPiiFields(doc, fields)` / `decryptPiiFields(doc, fields)`

**Ready to use for credential encryption. No changes needed.**

---

## 3. Architecture Decision

### Per-Tenant Credentials Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Platform .env                         │
│  RESEND_API_KEY, TWILIO_*, META_WHATSAPP_*, VAPID_*    │
│  (Global defaults — used when tenant has no override)   │
└─────────────────────┬───────────────────────────────────┘
                      │ fallback
┌─────────────────────▼───────────────────────────────────┐
│             tenant_{slug} → settings collection          │
│  key: "providers"                                        │
│  value: {                                                │
│    email: { provider, apiKey⚷, smtpHost, fromEmail.. }  │
│    sms:   { provider, accountSid⚷, authToken⚷, from }  │
│    whatsapp: { phoneId⚷, accessToken⚷ }                │
│    push:  { vapidPublicKey, vapidPrivateKey⚷ }          │
│  }                                                       │
│  ⚷ = AES-256-GCM encrypted via encryptField()          │
└─────────────────────────────────────────────────────────┘
```

**Key decisions:**

- Credentials stored in each **tenant's own database** (not platform DB) — tenant isolation
- Encrypted at rest using existing `encryptField()` / `decryptField()`
- A new 7th settings key `"providers"` added to `SettingsKey` union
- Providers refactored to accept optional config parameter — **zero breaking changes** for existing global flow
- BullMQ workers enhanced to look up tenant credentials before calling providers

---

## Phase 1 — Tenant Provider Credentials Model & Encryption

### Goal

Add a `providers` settings key with encrypted credential fields and an API to manage them.

### 1.1 Extend Settings Model

**File:** `apps/api/src/tenant/models/settings.model.ts`

**Changes:**

```diff
 export type SettingsKey =
   | 'clinic'
   | 'appointment'
   | 'billing'
   | 'notifications'
   | 'security'
-  | 'inventory';
+  | 'inventory'
+  | 'providers';
```

```diff
 const settingsSchema = new Schema<ISettings>(
   {
     key: {
       type: String,
       required: true,
-      enum: ['clinic', 'appointment', 'billing', 'notifications', 'security', 'inventory'],
+      enum: ['clinic', 'appointment', 'billing', 'notifications', 'security', 'inventory', 'providers'],
     },
```

Add to `DEFAULT_SETTINGS`:

```typescript
providers: {
  email: {
    provider: 'platform',    // 'platform' | 'resend' | 'smtp'
    apiKey: null,             // encrypted — Resend API key
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpPass: null,           // encrypted
    fromEmail: null,
    fromName: null,
  },
  sms: {
    provider: 'platform',    // 'platform' | 'twilio'
    accountSid: null,         // encrypted
    authToken: null,          // encrypted
    phoneNumber: null,
  },
  whatsapp: {
    provider: 'platform',    // 'platform' | 'meta'
    phoneNumberId: null,      // encrypted
    accessToken: null,        // encrypted
    businessAccountId: null,
  },
  push: {
    provider: 'platform',    // 'platform' | 'custom'
    vapidPublicKey: null,
    vapidPrivateKey: null,    // encrypted
    vapidSubject: null,
  },
},
```

When `provider === 'platform'`, the system uses the global `process.env` credentials (current behavior). When set to a specific provider name, tenant-specific credentials are used.

### 1.2 Create Provider Credentials Service

**New File:** `apps/api/src/services/provider-credentials.service.ts`

**Purpose:** Centralized service to get/set encrypted provider credentials per tenant.

```typescript
// Core API:
export class ProviderCredentialsService {
  constructor(private dbConnection: Connection) {}

  // Get decrypted credentials for a specific channel
  async getCredentials(
    channel: 'email' | 'sms' | 'whatsapp' | 'push',
  ): Promise<ChannelCredentials | null>;

  // Save encrypted credentials
  async setCredentials(
    channel: string,
    credentials: Record<string, unknown>,
    updatedBy: string,
  ): Promise<void>;

  // Test credentials (verify they work before saving)
  async testCredentials(
    channel: string,
    credentials: Record<string, unknown>,
  ): Promise<{ success: boolean; error?: string }>;

  // Check if tenant uses own credentials or platform defaults
  isUsingPlatformDefaults(channel: string, settings: Record<string, unknown>): boolean;
}
```

**Encrypted fields per channel:**

| Channel        | Encrypted Fields               | Plaintext Fields                                                        |
| -------------- | ------------------------------ | ----------------------------------------------------------------------- |
| Email (Resend) | `apiKey`                       | `provider`, `fromEmail`, `fromName`                                     |
| Email (SMTP)   | `smtpPass`                     | `provider`, `smtpHost`, `smtpPort`, `smtpUser`, `fromEmail`, `fromName` |
| SMS            | `accountSid`, `authToken`      | `provider`, `phoneNumber`                                               |
| WhatsApp       | `phoneNumberId`, `accessToken` | `provider`, `businessAccountId`                                         |
| Push           | `vapidPrivateKey`              | `provider`, `vapidPublicKey`, `vapidSubject`                            |

### 1.3 Add Providers Settings Route

**Extend:** `apps/api/src/tenant/routes/tenant-settings/tenant-settings.route.ts`

The existing settings route already handles CRUD for any key. Adding `'providers'` to the `SettingsKey` enum is sufficient for GET/PATCH to work. However, we need **extra logic**:

1. **On GET** (`/settings/providers`): Never return encrypted raw values — return masked versions (e.g., `"••••••ef3a"`)
2. **On PATCH** (`/settings/providers`): Encrypt sensitive fields before writing
3. **New endpoint** `POST /settings/providers/:channel/test`: Test credentials by attempting a connection/send

**New File:** `apps/api/src/tenant/routes/tenant-settings/provider-settings.route.ts`

```
POST /settings/providers/:channel/test  — Test credentials for a channel
```

### Affected Files — Phase 1

| File                                                                    | Action | Changes                                                                |
| ----------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `apps/api/src/tenant/models/settings.model.ts`                          | MODIFY | Add `'providers'` to SettingsKey enum + schema enum + DEFAULT_SETTINGS |
| `apps/api/src/services/provider-credentials.service.ts`                 | CREATE | ~180 lines — credentials get/set/test with encryption                  |
| `apps/api/src/tenant/routes/tenant-settings/provider-settings.route.ts` | CREATE | ~100 lines — test endpoint + credential masking middleware             |
| `apps/api/src/tenant/routes/tenant-settings/tenant-settings.route.ts`   | MODIFY | Import masking logic for `/providers` key on GET, encrypt on PATCH     |

---

## Phase 2 — Provider Refactor (Tenant-Aware)

### Goal

Refactor each provider's send function to accept optional tenant-specific config. **Zero breaking changes** — existing calls without config continue to use `process.env`.

### 2.1 Email Provider

**File:** `apps/api/src/services/providers/email.provider.ts`

**Current signature:**

```typescript
export async function sendEmail(options: EmailSendOptions): Promise<EmailSendResult>;
```

**New signature:**

```typescript
export interface TenantEmailConfig {
  provider: 'resend' | 'smtp';
  apiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromEmail?: string;
  fromName?: string;
}

export async function sendEmail(
  options: EmailSendOptions,
  tenantConfig?: TenantEmailConfig | null,
): Promise<EmailSendResult>;
```

**Logic change:**

- If `tenantConfig` provided and `provider === 'resend'` → create a **new** Resend client with `tenantConfig.apiKey` (don't cache — or use a tenant-keyed cache)
- If `tenantConfig` provided and `provider === 'smtp'` → create a **new** Nodemailer transport with tenant's SMTP settings
- If `tenantConfig` is null/undefined → use existing global clients (current behavior)
- Override `DEFAULT_FROM` with `tenantConfig.fromName <tenantConfig.fromEmail>` if provided

### 2.2 SMS Provider

**File:** `apps/api/src/services/providers/sms.provider.ts`

**New signature:**

```typescript
export interface TenantSmsConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export async function sendSms(
  options: SmsSendOptions,
  tenantConfig?: TenantSmsConfig | null,
): Promise<SmsSendResult>;
```

**Logic change:**

- If `tenantConfig` → create new Twilio client with tenant credentials
- Else → use global `process.env.TWILIO_*`

### 2.3 WhatsApp Provider

**File:** `apps/api/src/services/providers/whatsapp.provider.ts`

**Current issue:** Config is at module top-level:

```typescript
const WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_TOKEN;
```

**New signature:**

```typescript
export interface TenantWhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
}

export async function sendWhatsApp(
  options: WhatsAppSendOptions,
  tenantConfig?: TenantWhatsAppConfig | null,
): Promise<WhatsAppSendResult>;
```

**Logic change:**

- If `tenantConfig` → use tenantConfig values for URL and Authorization header
- Else → fallback to module-level `process.env` constants (current behavior)

### 2.4 Push Provider (Web)

**File:** `apps/api/src/services/providers/push.provider.ts`

**Current issue:** `webPush.setVapidDetails()` is a global state setter — calling it overrides the previous call globally.

**Solution:** Use `webPush.sendNotification()` with the **`vapidDetails` option** (per-notification override):

```typescript
export interface TenantPushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
}

export async function sendPush(
  options: PushSendOptions,
  tenantConfig?: TenantPushConfig | null,
): Promise<PushSendResult>;
```

**Logic change:**

```typescript
// Instead of global setVapidDetails(), pass per-request:
const vapidDetails = tenantConfig
  ? {
      subject: tenantConfig.vapidSubject,
      publicKey: tenantConfig.vapidPublicKey,
      privateKey: tenantConfig.vapidPrivateKey,
    }
  : undefined; // falls back to globally-set VAPID

await webPush.sendNotification(subscription, payload, {
  TTL: 3600,
  ...(vapidDetails && { vapidDetails }),
});
```

The `web-push` library supports a `vapidDetails` option on `sendNotification()` that overrides the global `setVapidDetails`. This is the safe per-tenant solution.

### 2.5 BullMQ Workers — Add Tenant Credential Lookup

**File:** `apps/api/src/services/notification.service.ts` — `startNotificationWorkers()` function (L628+)

**Each worker must:**

1. Extract `tenantId` from the job payload
2. Look up the tenant's `providers` settings using `ProviderCredentialsService`
3. Pass decrypted credentials to the provider send function

**Example — Email Worker:**

```typescript
new Worker<EmailJobPayload>(
  'notification-email',
  async (job: Job<EmailJobPayload>) => {
    const { to, subject, html, tenantId } = job.data;

    // NEW: Look up tenant-specific email credentials
    let tenantEmailConfig: TenantEmailConfig | null = null;
    if (tenantId) {
      const tenantDb = getTenantDb(tenantId);
      const credService = new ProviderCredentialsService(tenantDb);
      tenantEmailConfig = await credService.getCredentials('email');
    }

    const result = await sendEmail({ to, subject, html }, tenantEmailConfig);
    // ...
  },
  // ...
);
```

Repeat for SMS, WhatsApp, and Push workers.

### Affected Files — Phase 2

| File                                                   | Action | Changes                                                                                      |
| ------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------- |
| `apps/api/src/services/providers/email.provider.ts`    | MODIFY | Add `TenantEmailConfig` interface, optional 2nd param, conditional client creation           |
| `apps/api/src/services/providers/sms.provider.ts`      | MODIFY | Add `TenantSmsConfig` interface, optional 2nd param                                          |
| `apps/api/src/services/providers/whatsapp.provider.ts` | MODIFY | Add `TenantWhatsAppConfig` interface, optional 2nd param, use param instead of module consts |
| `apps/api/src/services/providers/push.provider.ts`     | MODIFY | Add `TenantPushConfig` interface, pass `vapidDetails` per-call instead of global             |
| `apps/api/src/services/notification.service.ts`        | MODIFY | Import `ProviderCredentialsService` + `getTenantDb`, add credential lookup in all 4 workers  |

---

## Phase 3 — Platform Tenants API (Backend CRUD)

### Goal

Create the missing backend route file that the developer portal hooks already call.

### 3.1 Route File

**New File:** `apps/api/src/platform/routes/tenants/tenants.route.ts`

**Endpoints:**

| Method   | Path                           | Purpose                                         | Auth           |
| -------- | ------------------------------ | ----------------------------------------------- | -------------- |
| `GET`    | `/`                            | List tenants (paginated, filterable)            | Platform admin |
| `GET`    | `/stats`                       | Aggregate stats (total, active, countries, MRR) | Platform admin |
| `GET`    | `/:id`                         | Tenant detail (full model + computed fields)    | Platform admin |
| `POST`   | `/`                            | Create tenant (admin-provisioned)               | Platform admin |
| `PATCH`  | `/:id`                         | Update tenant                                   | Platform admin |
| `DELETE` | `/:id`                         | Soft-delete / deactivate tenant                 | Platform admin |
| `GET`    | `/:id/users`                   | List users in tenant                            | Platform admin |
| `GET`    | `/:id/modules`                 | List enabled modules                            | Platform admin |
| `POST`   | `/:id/providers/:channel/test` | Test tenant credentials                         | Platform admin |

### 3.2 Create Tenant Logic (POST /)

This is the **admin-created** counterpart to the public onboarding route. It reuses the same provisioning steps but is called by platform admins:

1. Validate input via extended `createTenantSchema` (see Phase 4)
2. Generate unique slug
3. Hash admin password (argon2id)
4. Create User in platform DB
5. Create Tenant in platform DB (with branding, modules, contact from wizard)
6. Provision tenant DB via `getTenantDb(slug)`
7. Create main Branch
8. Seed defaults (database + settings)
9. **NEW:** Seed provider credentials if provided (encrypted)
10. Return full tenant object

### 3.3 Register Routes

**File:** `apps/api/src/server.ts`

```typescript
import { tenantRoutes } from './platform/routes/tenants/tenants.route.js';
// In routes registration:
app.register(tenantRoutes, { prefix: '/api/platform/tenants' });
```

### 3.4 Shared Schema Extension

**File:** `packages/shared/src/schemas/tenant.schema.ts`

Extend `createTenantSchema` to support the full wizard payload:

```typescript
export const createTenantSchema = z
  .object({
    // Step 1 — Basic Info
    name: z.string().min(2).max(200),
    slug: z
      .string()
      .min(2)
      .max(63)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)
      .optional(), // auto-generated if omitted
    adminEmail: z.string().email(),
    adminFirstName: z.string().min(1).max(100),
    adminLastName: z.string().min(1).max(100),
    adminPassword: z.string().min(8).max(128),
    countryCode: z.string().length(2).default('EG'),
    timezone: z.string().default('Africa/Cairo'),
    locale: z.enum(['en', 'ar']).default('en'),

    // Step 2 — Branding (optional)
    branding: z
      .object({
        primaryColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        accentColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        // logoUrl, faviconUrl resolved via upload — not in create payload
      })
      .optional(),

    // Step 3 — Modules
    enabledModules: z.array(z.string()).min(1).optional(), // defaults to 3 core modules

    // Step 4 — Communication (optional)
    providers: z
      .object({
        email: z
          .object({
            provider: z.enum(['platform', 'resend', 'smtp']),
            apiKey: z.string().optional(),
            smtpHost: z.string().optional(),
            smtpPort: z.number().optional(),
            smtpUser: z.string().optional(),
            smtpPass: z.string().optional(),
            fromEmail: z.string().email().optional(),
            fromName: z.string().optional(),
          })
          .optional(),
        sms: z
          .object({
            provider: z.enum(['platform', 'twilio']),
            accountSid: z.string().optional(),
            authToken: z.string().optional(),
            phoneNumber: z.string().optional(),
          })
          .optional(),
        whatsapp: z
          .object({
            provider: z.enum(['platform', 'meta']),
            phoneNumberId: z.string().optional(),
            accessToken: z.string().optional(),
            businessAccountId: z.string().optional(),
          })
          .optional(),
        push: z
          .object({
            provider: z.enum(['platform', 'custom']),
            vapidPublicKey: z.string().optional(),
            vapidPrivateKey: z.string().optional(),
            vapidSubject: z.string().optional(),
          })
          .optional(),
      })
      .optional(),

    // Contact info
    contact: z
      .object({
        phone: z.string().min(5),
        email: z.string().email(),
        website: z.string().url().optional(),
        address: z.object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().min(2),
          postalCode: z.string().optional(),
        }),
      })
      .optional(),
  })
  .strict();
```

### Affected Files — Phase 3

| File                                                    | Action | Changes                                                                       |
| ------------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `apps/api/src/platform/routes/tenants/tenants.route.ts` | CREATE | ~350 lines — full CRUD + provisioning                                         |
| `apps/api/src/server.ts`                                | MODIFY | Register `/api/platform/tenants` route prefix                                 |
| `packages/shared/src/schemas/tenant.schema.ts`          | MODIFY | Extend `createTenantSchema` with branding, modules, providers, contact fields |

---

## Phase 4 — Extended Onboarding API

### Goal

The platform admin create-tenant route (Phase 3) handles admin-provisioned tenants. The existing public onboarding route remains for self-registration. No changes needed to `onboarding.route.ts` — the new route in Phase 3 is the parallel admin path.

### 4.1 Shared Provisioning Logic

**New File:** `apps/api/src/platform/services/tenant-provisioning.service.ts`

Extract common logic from `onboarding.route.ts` into a reusable service:

```typescript
export class TenantProvisioningService {
  // Reusable across public onboarding + admin creation
  async generateUniqueSlug(name: string): Promise<string>;
  async createAdminUser(data: { email; firstName; lastName; password; role }): Promise<IUser>;
  async createTenant(data: TenantCreateData): Promise<ITenant>;
  async provisionDatabase(slug: string): Promise<Connection>;
  async createMainBranch(conn: Connection, data: BranchData): Promise<void>;
  async seedDefaults(conn: Connection): Promise<void>;
  async seedProviderCredentials(conn: Connection, providers: ProviderConfig): Promise<void>;
  async cleanup(userId?: string, tenantId?: string): Promise<void>;
}
```

Then refactor `onboarding.route.ts` to use this service (optional — can defer to reduce scope).

### Affected Files — Phase 4

| File                                                            | Action            | Changes                                   |
| --------------------------------------------------------------- | ----------------- | ----------------------------------------- |
| `apps/api/src/platform/services/tenant-provisioning.service.ts` | CREATE            | ~250 lines — extracted provisioning logic |
| `apps/api/src/tenant/routes/onboarding/onboarding.route.ts`     | MODIFY (optional) | Refactor to use TenantProvisioningService |

---

## Phase 5 — Developer Portal Wizard UI

### Goal

Build a 5-step wizard dialog wired to the new API.

### 5.1 Wizard Steps

| Step  | Title           | Fields                                                                                                                  |
| ----- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **1** | Basic Info      | Clinic name, admin email, admin first name, admin last name, admin password, country, timezone, locale                  |
| **2** | Branding        | Primary color, accent color, logo upload (optional)                                                                     |
| **3** | Modules         | Module checklist (core modules pre-checked + paid modules) — uses `Module` collection data                              |
| **4** | Communication   | Per-channel provider selection (platform/custom), credential inputs per selection, "Test Connection" button per channel |
| **5** | Review & Create | Summary of all steps, "Create Tenant" button                                                                            |

### 5.2 New Files

**`apps/developer/src/features/tenants/components/CreateTenantWizard.tsx`** — ~400 lines

- Multi-step form using React state
- Step navigation (back/next/skip)
- Form validation per step (Zod schemas from `@dento/shared`)
- Submit calls `useCreateTenant()` mutation

**`apps/developer/src/features/tenants/components/wizard/`** — Step components:

- `BasicInfoStep.tsx` — ~100 lines
- `BrandingStep.tsx` — ~80 lines
- `ModulesStep.tsx` — ~120 lines (fetch available modules, checkbox grid)
- `CommunicationStep.tsx` — ~200 lines (provider selection + credential forms + test buttons)
- `ReviewStep.tsx` — ~100 lines

### 5.3 Wire "New Tenant" Button

**File:** `apps/developer/src/features/tenants/pages/TenantsPage.tsx`

```diff
+ const [showWizard, setShowWizard] = useState(false);
  // ...
  <Button onClick={() => setShowWizard(true)}>New Tenant</Button>
+ {showWizard && <CreateTenantWizard onClose={() => setShowWizard(false)} />}
```

### 5.4 Fix `useCreateTenant` Payload

**File:** `apps/developer/src/features/tenants/hooks/useTenants.ts`

Current payload: `{ name, slug, plan, country }` — wrong.

Fix to match new `createTenantSchema`:

```typescript
export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenantInput) => apiClient.post('/api/platform/tenants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
      toast.success('Tenant created successfully');
    },
    onError: () => toast.error('Failed to create tenant'),
  });
}
```

### 5.5 New Hook: Fetch Available Modules

**New File:** `apps/developer/src/features/tenants/hooks/useModules.ts`

```typescript
export function useAvailableModules() {
  return useQuery({
    queryKey: ['modules'],
    queryFn: () => apiClient.get('/api/platform/modules'),
  });
}
```

(Requires a `GET /api/platform/modules` endpoint — add to Phase 3 route or create separate `modules.route.ts`)

### Affected Files — Phase 5

| File                                                                          | Action | Changes                             |
| ----------------------------------------------------------------------------- | ------ | ----------------------------------- |
| `apps/developer/src/features/tenants/components/CreateTenantWizard.tsx`       | CREATE | ~400 lines — wizard container       |
| `apps/developer/src/features/tenants/components/wizard/BasicInfoStep.tsx`     | CREATE | ~100 lines                          |
| `apps/developer/src/features/tenants/components/wizard/BrandingStep.tsx`      | CREATE | ~80 lines                           |
| `apps/developer/src/features/tenants/components/wizard/ModulesStep.tsx`       | CREATE | ~120 lines                          |
| `apps/developer/src/features/tenants/components/wizard/CommunicationStep.tsx` | CREATE | ~200 lines                          |
| `apps/developer/src/features/tenants/components/wizard/ReviewStep.tsx`        | CREATE | ~100 lines                          |
| `apps/developer/src/features/tenants/pages/TenantsPage.tsx`                   | MODIFY | Add wizard state + dialog trigger   |
| `apps/developer/src/features/tenants/hooks/useTenants.ts`                     | MODIFY | Fix `useCreateTenant` payload type  |
| `apps/developer/src/features/tenants/hooks/useModules.ts`                     | CREATE | ~30 lines — fetch available modules |

---

## Phase 6 — Tenant Detail Channels Tab (Post-Creation Editing)

### Goal

Wire the existing `ChannelsTab.tsx` placeholder to real API calls for viewing/editing provider credentials.

### 6.1 Rewrite ChannelsTab

**File:** `apps/developer/src/features/tenants/components/ChannelsTab.tsx`

**Changes:**

- Add state for each channel's form (controlled inputs)
- Fetch current credentials via `GET /api/platform/tenants/:id/providers` (returns masked values)
- Save via `PATCH /api/platform/tenants/:id/providers/:channel`
- "Test Connection" button calls `POST /api/platform/tenants/:id/providers/:channel/test`
- Show success/fail status badges based on test results
- Toggle between "Use Platform Default" and "Custom Credentials" per channel

### 6.2 Wire TenantDetailPage to Real API

**File:** `apps/developer/src/features/tenants/pages/TenantDetailPage.tsx`

**Changes:**

- Replace `mockTenant` with `useTenantDetail(id)` hook
- Add loading/error states

### 6.3 New Hook: Tenant Detail

**File:** `apps/developer/src/features/tenants/hooks/useTenants.ts`

Add:

```typescript
export function useTenantDetail(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: () => apiClient.get(`/api/platform/tenants/${id}`),
    enabled: !!id,
  });
}

export function useUpdateTenantProviders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      channel,
      data,
    }: {
      tenantId: string;
      channel: string;
      data: Record<string, unknown>;
    }) => apiClient.patch(`/api/platform/tenants/${tenantId}/providers/${channel}`, data),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
      toast.success('Provider credentials updated');
    },
  });
}

export function useTestTenantProvider() {
  return useMutation({
    mutationFn: ({
      tenantId,
      channel,
      data,
    }: {
      tenantId: string;
      channel: string;
      data: Record<string, unknown>;
    }) => apiClient.post(`/api/platform/tenants/${tenantId}/providers/${channel}/test`, data),
  });
}
```

### Affected Files — Phase 6

| File                                                             | Action  | Changes                                                                    |
| ---------------------------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `apps/developer/src/features/tenants/components/ChannelsTab.tsx` | REWRITE | ~350 lines — controlled forms, API calls, test buttons                     |
| `apps/developer/src/features/tenants/pages/TenantDetailPage.tsx` | MODIFY  | Replace `mockTenant` with `useTenantDetail` hook                           |
| `apps/developer/src/features/tenants/hooks/useTenants.ts`        | MODIFY  | Add `useTenantDetail`, `useUpdateTenantProviders`, `useTestTenantProvider` |

---

## Migration & Rollback Strategy

### Forward Migration (Zero Downtime)

1. **Code deployment:** All provider refactors are **backwards-compatible** — the 2nd `tenantConfig` parameter is optional. If no `providers` settings exist for a tenant, defaults to `process.env`.
2. **Existing tenants:** No data migration needed. They will simply use platform defaults until a platform admin edits their provider settings.
3. **New settings key:** The `providers` key in settings collection is seeded with `provider: 'platform'` for all channels — functionally identical to current behavior.
4. **Schema change:** Adding `'providers'` to the `SettingsKey` enum and Mongoose schema is additive — no destructive changes.

### Rollback

1. **Revert code:** Remove 2nd param from provider functions. Workers stop looking up credentials.
2. **Data:** `providers` settings documents remain in tenant DBs but are ignored. No cleanup needed.

---

## Testing Plan

### Unit Tests

| Test                                                                | Location                                               | Coverage                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| `encryptField` / `decryptField` round-trip for provider credentials | `apps/api/tests/utils/encryption.test.ts`              | Ensure all credential field types encrypt/decrypt correctly        |
| `ProviderCredentialsService.getCredentials`                         | `apps/api/tests/services/provider-credentials.test.ts` | Returns decrypted values; returns null for platform defaults       |
| `ProviderCredentialsService.setCredentials`                         | Same                                                   | Encrypts sensitive fields; stores plaintext fields as-is           |
| Provider send with tenantConfig                                     | `apps/api/tests/services/providers/*.test.ts`          | Each provider: global fallback works; tenant config overrides work |
| Schema validation for extended createTenantSchema                   | `packages/shared/tests/schemas/tenant.test.ts`         | All optional fields work; required fields enforced                 |

### Integration Tests

| Test                                           | Scope                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `POST /api/platform/tenants`                   | Full provisioning flow: user, tenant, DB, branch, settings, providers |
| `PATCH /settings/providers`                    | Credential encryption + retrieval                                     |
| `POST /settings/providers/:channel/test`       | Credential validation for each channel                                |
| BullMQ worker with tenant-specific credentials | Email worker sends with tenant Resend key                             |

### E2E Tests (Manual / Playwright)

1. Open developer portal → Tenants → Click "New Tenant"
2. Complete 5-step wizard with custom email credentials
3. Verify tenant appears in list
4. Open tenant detail → Channels tab → verify credentials are masked
5. Test "Test Connection" button
6. Edit credentials → save → verify change persists

---

## File Change Summary

### New Files (10)

| #   | File                                                                          | Lines (est.) | Phase |
| --- | ----------------------------------------------------------------------------- | ------------ | ----- |
| 1   | `apps/api/src/services/provider-credentials.service.ts`                       | ~180         | 1     |
| 2   | `apps/api/src/tenant/routes/tenant-settings/provider-settings.route.ts`       | ~100         | 1     |
| 3   | `apps/api/src/platform/routes/tenants/tenants.route.ts`                       | ~350         | 3     |
| 4   | `apps/api/src/platform/services/tenant-provisioning.service.ts`               | ~250         | 4     |
| 5   | `apps/developer/src/features/tenants/components/CreateTenantWizard.tsx`       | ~400         | 5     |
| 6   | `apps/developer/src/features/tenants/components/wizard/BasicInfoStep.tsx`     | ~100         | 5     |
| 7   | `apps/developer/src/features/tenants/components/wizard/BrandingStep.tsx`      | ~80          | 5     |
| 8   | `apps/developer/src/features/tenants/components/wizard/ModulesStep.tsx`       | ~120         | 5     |
| 9   | `apps/developer/src/features/tenants/components/wizard/CommunicationStep.tsx` | ~200         | 5     |
| 10  | `apps/developer/src/features/tenants/components/wizard/ReviewStep.tsx`        | ~100         | 5     |

### Modified Files (11)

| #   | File                                                                  | Phase | Key Changes                                           |
| --- | --------------------------------------------------------------------- | ----- | ----------------------------------------------------- |
| 1   | `apps/api/src/tenant/models/settings.model.ts`                        | 1     | Add `'providers'` to enum + defaults                  |
| 2   | `apps/api/src/tenant/routes/tenant-settings/tenant-settings.route.ts` | 1     | Mask encrypted fields on GET, encrypt on PATCH        |
| 3   | `apps/api/src/services/providers/email.provider.ts`                   | 2     | Add optional `TenantEmailConfig` param                |
| 4   | `apps/api/src/services/providers/sms.provider.ts`                     | 2     | Add optional `TenantSmsConfig` param                  |
| 5   | `apps/api/src/services/providers/whatsapp.provider.ts`                | 2     | Add optional `TenantWhatsAppConfig` param             |
| 6   | `apps/api/src/services/providers/push.provider.ts`                    | 2     | Add optional `TenantPushConfig` param, per-call VAPID |
| 7   | `apps/api/src/services/notification.service.ts`                       | 2     | Credential lookup in 4 BullMQ workers                 |
| 8   | `apps/api/src/server.ts`                                              | 3     | Register platform tenants route                       |
| 9   | `packages/shared/src/schemas/tenant.schema.ts`                        | 3     | Extend `createTenantSchema`                           |
| 10  | `apps/developer/src/features/tenants/pages/TenantsPage.tsx`           | 5     | Wire "New Tenant" button to wizard                    |
| 11  | `apps/developer/src/features/tenants/hooks/useTenants.ts`             | 5+6   | Fix create mutation, add detail/providers hooks       |

### Rewritten Files (2)

| #   | File                                                             | Phase | Reason                                                          |
| --- | ---------------------------------------------------------------- | ----- | --------------------------------------------------------------- |
| 1   | `apps/developer/src/features/tenants/components/ChannelsTab.tsx` | 6     | Currently all static markup — needs full rewrite with state/API |
| 2   | `apps/developer/src/features/tenants/pages/TenantDetailPage.tsx` | 6     | Remove mockTenant, wire to real API                             |

**Total: 10 new + 11 modified + 2 rewritten = 23 files, ~2,500 estimated lines**

---

## Risk Register

| #   | Risk                                                                | Severity  | Mitigation                                                                                            |
| --- | ------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| 1   | `webPush.setVapidDetails` global state conflict                     | 🔴 High   | Use per-call `vapidDetails` option in `sendNotification()` — verified supported by `web-push` library |
| 2   | Firebase `initializeApp` singleton conflict for multi-tenant        | 🟡 Medium | Use Firebase **named apps**: `initializeApp(config, tenantSlug)` + cache by tenant slug               |
| 3   | Credential encryption key rotation breaks existing encrypted values | 🟡 Medium | Defer key rotation to post-launch; document in `SECURITY_AND_ENCRYPTION.md`                           |
| 4   | BullMQ worker DB lookup adds latency per job                        | 🟢 Low    | Cache credentials per tenant with 5-min TTL using in-memory Map; invalidate on settings update        |
| 5   | Resend/Twilio client creation per tenant is expensive               | 🟢 Low    | Use LRU cache (Map with max size) keyed by tenant slug; evict least-recently-used after 50 entries    |
| 6   | Platform tenants API requires auth middleware that may not exist    | 🟡 Medium | Verify `platformAuth` or equivalent guard exists; create if needed                                    |
| 7   | Module list endpoint needed for wizard Step 3                       | 🟢 Low    | Simple `Module.find()` query; can add to tenants.route.ts as sub-route                                |

---

## Implementation Order (Recommended)

```
Phase 1 (Backend model + encryption)
  ↓
Phase 2 (Provider refactor — backwards-compatible)
  ↓  can be deployed independently ↑ and ↓
Phase 3 (Platform tenants API — unblocks frontend)
  ↓
Phase 4 (Provisioning service — shared logic)
  ↓
Phase 5 (Wizard UI)
  ↓
Phase 6 (Channels tab rewrite)
```

Phases 1+2 can be deployed to production independently without any frontend changes — they add capability without changing existing behavior. Phase 3 must land before Phases 5+6 (frontend needs API). Phase 4 is optional refactoring that can be deferred.
