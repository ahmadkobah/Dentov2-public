# Phase 7 — Implementation Plan: Feature Flags, Custom Fields, Platform Settings, Storage

> **Scope:** Web features only. Mobile app deferred to a later phase.  
> **Total estimated effort:** ~8.5 days  
> **Date:** 2026-03-03

---

## Current State (What Already Exists)

| Feature               | Backend                                                                                          | Frontend                                                                    | Shared                      |
| --------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | --------------------------- |
| **Feature Flags**     | Nothing                                                                                          | Sidebar item + placeholder route (`/flags`)                                 | Nothing                     |
| **Custom Fields**     | **Full tenant CRUD** (route + model + service)                                                   | Sidebar item + placeholder route (`/fields`)                                | Zod schemas only (no types) |
| **Platform Settings** | **Tenant settings full** (route + model + service + 6 keys), no platform-level `system_settings` | **Admin SettingsPage fully built**, Dev sidebar + placeholder (`/settings`) | Zod schemas only            |
| **Storage**           | Nothing (S3 client exists for backups)                                                           | Sidebar item + placeholder route (`/storage`)                               | Nothing                     |

---

## Implementation Order

| Order | Feature           | Why                                                  | Effort    |
| ----- | ----------------- | ---------------------------------------------------- | --------- |
| **1** | Custom Fields     | Backend 100% done, only frontend needed              | ~2 days   |
| **2** | Platform Settings | Tenant settings done, need platform-level + Dev page | ~2 days   |
| **3** | Feature Flags     | Greenfield — full stack                              | ~3 days   |
| **4** | Storage           | Dashboard only, reads existing data                  | ~1.5 days |

---

## Feature 1: Custom Fields (~2 days)

**Backend is 100% done** — route + model + service + Zod schemas all exist.

### What Exists

- `apps/api/src/tenant/routes/custom-fields/custom-fields.route.ts` — 6 endpoints (list, by-entity, get, create, update, toggle, delete)
- `apps/api/src/tenant/models/custom-field.model.ts` — Full Mongoose schema (164 lines)
- `packages/shared/src/schemas/custom-field.schema.ts` — Zod schemas with inferred types
- Field types: `text`, `number`, `date`, `boolean`, `select`, `multiselect`, `textarea`, `email`, `phone`, `url`
- Target entities: `patient`, `appointment`, `invoice`, `treatment_plan`, `prescription`, `lab_order`

### What Needs Building

| Layer                  | Work                                                                                                                                                             | Source                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Shared types**       | Create `custom-field.types.ts` — `CustomField`, `CustomFieldListResponse` inferred from Zod schemas                                                              | BUILD_RULES §1                       |
| **Dev portal feature** | Create `features/custom-fields/` with `CustomFieldsPage.tsx`, `useCustomFields.ts` hook, entity filter tabs, field list with drag-and-drop (`@dnd-kit/sortable`) | MASTER_PLAN §7, TECH_REQUIREMENTS §3 |
| **Dev portal**         | Collapsible developer guide at top of page (6-step walkthrough per MASTER_PLAN spec)                                                                             | MASTER_PLAN §7                       |
| **Admin portal**       | Create `CustomFieldsManager.tsx` component embedded in existing Settings page                                                                                    | V2_STRUCTURE                         |
| **Tests**              | Hook tests (dev + admin)                                                                                                                                         | BUILD_RULES                          |

### Developer Guide Content (MASTER_PLAN)

Collapsible info block at the top of the page:

1. Choose Entity (Patient, Appointment, etc.)
2. Click "+ Add Field"
3. Set Name, Type (Text/Number/Date/etc.)
4. Required? Default Value? Validation?
5. Save → Field appears immediately for all Tenants
6. Reorder via Drag & Drop

- ⚠️ Warning: Deleting a field permanently removes ALL data for that field across all tenants

### RBAC

Custom Fields are tenant-level, guarded by `roleGuard` (admin only). No `platformGuard` needed.

---

## Feature 2: Platform Settings (~2 days)

**Tenant-level settings are 100% done** (Admin SettingsPage, API routes, model). Need platform-level `system_settings` + Dev Portal page.

### What Exists

- `apps/api/src/tenant/routes/tenant-settings/tenant-settings.route.ts` — 4 endpoints (get all, get by key, update, reset, seed)
- `apps/api/src/tenant/models/settings.model.ts` — Key-value model with 6 keys
- `packages/shared/src/schemas/settings.schema.ts` — Zod schemas for all 6 settings categories
- `apps/admin/src/features/settings/` — Full SettingsPage with components + hooks
- `platform_settings` module already defined in `PlatformModule` type + `PLATFORM_PERMISSIONS` matrix

### What Needs Building

| Layer               | Work                                                                                                                                                                                                                                                | Source                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Platform model**  | Create `system-settings.model.ts` — singleton Mongoose document: `maintenanceMode`, `maintenanceMessage`, `defaultTimezone`, `defaultCurrency`, `defaultLanguage`, `registrationEnabled`, `maxTenantsPerCluster`, `supportEmail`, `platformVersion` | V2_DATABASE §4.17            |
| **Platform model**  | Create `branding.model.ts` — singleton: `platformName`, `logoUrl`, `faviconUrl`, `primaryColor`, `landingPageUrl`                                                                                                                                   | V2_DATABASE §4.17            |
| **Platform model**  | Create `currencies.model.ts` — singleton: `baseCurrency`, `exchangeRates` (Map), `lastUpdatedAt`                                                                                                                                                    | V2_DATABASE §4.17            |
| **Platform routes** | Create `settings/settings.route.ts` + `.service.ts` — GET + PATCH for system settings, branding, currencies                                                                                                                                         | PLATFORM_RBAC §5             |
| **Shared types**    | Create `system-settings.types.ts` — `SystemSettings`, `Branding`, `Currencies`                                                                                                                                                                      | BUILD_RULES §1               |
| **Shared schemas**  | Create `system-settings.schema.ts` — Zod schemas for update validation                                                                                                                                                                              | BUILD_RULES §5               |
| **Dev portal page** | Create `features/settings/` with `SettingsPage.tsx`, `useSystemSettings.ts` hook — tabs: General, Branding, Currencies, Maintenance                                                                                                                 | MASTER_PLAN §7, V2_STRUCTURE |
| **Tests**           | Hook tests (dev) + API route tests                                                                                                                                                                                                                  | BUILD_RULES                  |

### RBAC (PLATFORM_RBAC §5)

| Role              | Access          |
| ----------------- | --------------- |
| `platform_owner`  | Full CRUD (`*`) |
| `platform_admin`  | Read only       |
| `platform_viewer` | No access       |

Guard: `platformGuard('platform_settings', action)`

### Database (V2_DATABASE §4.17)

```typescript
// system_settings (singleton in dento_platform)
{
  maintenanceMode: Boolean,
  maintenanceMessage: String,
  defaultTimezone: String,        // e.g. "Asia/Riyadh"
  defaultCurrency: String,        // e.g. "SAR"
  defaultLanguage: String,        // e.g. "ar"
  registrationEnabled: Boolean,
  maxTenantsPerCluster: Number,
  supportEmail: String,
  platformVersion: String
}

// branding (singleton)
{ platformName, logoUrl, faviconUrl, primaryColor, landingPageUrl }

// currencies (singleton)
{ baseCurrency, exchangeRates: Map, lastUpdatedAt }
```

---

## Feature 3: Feature Flags (~3 days)

**Greenfield** — nothing exists except sidebar item + placeholder route.

### What Needs Building

| Layer               | Work                                                                                                                                                                             | Source                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Shared types**    | Create `feature-flag.types.ts` — `FeatureFlag`, `FeatureFlagListResponse`, `CreateFeatureFlagInput`, `UpdateFeatureFlagInput`                                                    | V2_DATABASE §4.8                      |
| **Shared schemas**  | Create `feature-flag.schema.ts` — Zod `.strict()` schemas for create/update/query                                                                                                | BUILD_RULES §5                        |
| **Platform model**  | Create `feature-flag.model.ts` — Mongoose schema matching V2_DATABASE §4.8                                                                                                       | V2_DATABASE §4.8                      |
| **Platform routes** | Create `feature-flags/feature-flags.route.ts` + `.service.ts` — full CRUD + toggle + percentage rollout                                                                          | PLATFORM_RBAC §5                      |
| **Dev portal page** | Create `features/feature-flags/` with `FeatureFlagsPage.tsx`, `useFeatureFlags.ts` hook, `FeatureFlagCard.tsx` — list with create/edit sheet, percentage slider, tenant selector | MASTER_PLAN §7, V2_DECISION_LOG §16.3 |
| **Tests**           | Hook tests (dev) + API route tests                                                                                                                                               | BUILD_RULES                           |

### Database Schema (V2_DATABASE §4.8)

```typescript
// feature_flags (in dento_platform)
{
  _id: ObjectId,
  key: String,                      // "chat_enabled", "new_calendar_ui"
  name: String,
  description: String,
  tenantId: ObjectId | null,        // null = Global Flag
  enabled: Boolean,
  percentageRollout: Number | null, // 0-100
  userIds: [ObjectId] | null,       // Specific Users
  conditions: Object | null,        // JSON Conditions (country, plan, etc.)
  value: Mixed | null,              // Optional value (e.g. Variant A/B)
  createdAt: Date,
  updatedAt: Date
}
// Index: { key: 1, tenantId: 1 } unique
// Index: { tenantId: 1, enabled: 1 }
```

### RBAC (PLATFORM_RBAC §5)

Falls under `platform_settings` module:

- `platform_owner`: Full CRUD (`*`)
- `platform_admin`: Read only
- `platform_viewer`: No access

### UI Wireframe (V2_DECISION_LOG §16.3)

```
🟢 dental-chart-perio-data     100%     All tenants
🟡 chat-voice-notes            25%      Canary (5)
🔴 ai-treatment-suggestions    0%       Disabled
🟡 new-invoice-template        50%      Gradual rollout
```

Features:

- List view with status indicators (green/yellow/red)
- `[+ Create Flag]` button
- Percentage slider for rollout
- Tenant selector (multi-select)
- Enable/disable toggle
- Conditions editor (JSON)

---

## Feature 4: Storage (~1.5 days)

**Dashboard/monitoring page** — no new data model needed. Reads existing tenant data + S3 stats.

### What Needs Building

| Layer               | Work                                                                                                                                               | Source         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Platform routes** | Create `storage/storage.route.ts` + `.service.ts` — GET storage stats (aggregate `tenants.currentStorageMB`, per-tenant breakdown, S3 bucket info) | MASTER_PLAN §6 |
| **Shared types**    | Create `storage.types.ts` — `StorageStats`, `TenantStorageInfo`                                                                                    | BUILD_RULES §1 |
| **Shared schemas**  | Create `storage.schema.ts` — Zod schemas for query params                                                                                          | BUILD_RULES §5 |
| **Dev portal page** | Create `features/storage/` with `StoragePage.tsx`, `useStorageStats.ts` hook — total usage bar, per-tenant breakdown table, overage alerts         | MASTER_PLAN §7 |
| **Tests**           | Hook tests (dev) + API route tests                                                                                                                 | BUILD_RULES    |

### Data Sources (Already Exist)

| Source                | Field                         | Location                      |
| --------------------- | ----------------------------- | ----------------------------- |
| Tenant storage limit  | `tenants.maxStorageGB`        | V2_DATABASE §4.2              |
| Tenant current usage  | `tenants.currentStorageMB`    | V2_DATABASE §4.2              |
| S3 bucket stats       | via `@aws-sdk/client-s3`      | Already installed for backups |
| Backup storage config | `backup_config.storageBucket` | V2_DATABASE §4.17             |

### Pricing (MASTER_PLAN)

| Limit   | Included  | Overage     |
| ------- | --------- | ----------- |
| Storage | 1 GB free | $2/GB/month |

### RBAC

Guard: `platformGuard('platform_settings', 'read')` — read-only dashboard for admin+owner.

### Security (BUILD_RULES §16.10)

| Rule               | Detail                                                         |
| ------------------ | -------------------------------------------------------------- |
| Public access      | **NEVER** — bucket is private, access only via pre-signed URLs |
| Pre-signed URL TTL | 1 hour (configurable per category)                             |
| CORS on bucket     | Only `admin.dento.app` + `dev.dento.app` origins               |
| Path isolation     | `tenants/{tenant_slug}/...` — enforced by bucket policy        |
| Cross-tenant       | Tenant A **cannot** access Tenant B's files                    |

---

## Cross-Cutting Requirements (All Features)

| Requirement                                      | Source                          | Applies To                                |
| ------------------------------------------------ | ------------------------------- | ----------------------------------------- |
| Zero `any` in frontend                           | BUILD_RULES §1                  | All 4                                     |
| Zero `@ts-ignore`                                | BUILD_RULES §1                  | All 4                                     |
| RTL logical properties (`ms-`/`me-`/`ps-`/`pe-`) | BUILD_RULES §3                  | All 4                                     |
| Zod `.strict()` on all new endpoints             | BUILD_RULES §5                  | Feature Flags, Platform Settings, Storage |
| `apiResponse.success` / `apiResponse.error`      | BUILD_RULES §5                  | All new API routes                        |
| `PaginationMeta` in list responses               | BUILD_RULES §5                  | Feature Flags, Custom Fields              |
| `platformGuard('platform_settings', action)`     | PLATFORM_RBAC §5                | Feature Flags, Platform Settings, Storage |
| Types exported from `@dento/shared`              | BUILD_RULES §1, V2_STRUCTURE    | All 4                                     |
| TanStack Query hooks with loading/error states   | BUILD_RULES                     | All 4                                     |
| Vitest + RTL tests for all hooks                 | BUILD_RULES                     | All 4                                     |
| Pre-signed URLs for file access                  | BUILD_RULES §16.10, SECURITY    | Storage                                   |
| Tenant path isolation `tenants/{slug}/...`       | BUILD_RULES §16.8, SECURITY §12 | Storage                                   |

---

## File Creation Summary

### Shared (`packages/shared/`)

| File                                    | Feature           |
| --------------------------------------- | ----------------- |
| `src/types/custom-field.types.ts`       | Custom Fields     |
| `src/types/feature-flag.types.ts`       | Feature Flags     |
| `src/types/system-settings.types.ts`    | Platform Settings |
| `src/types/storage.types.ts`            | Storage           |
| `src/schemas/feature-flag.schema.ts`    | Feature Flags     |
| `src/schemas/system-settings.schema.ts` | Platform Settings |
| `src/schemas/storage.schema.ts`         | Storage           |

### API (`apps/api/`)

| File                                                         | Feature           |
| ------------------------------------------------------------ | ----------------- |
| `src/platform/models/feature-flag.model.ts`                  | Feature Flags     |
| `src/platform/models/system-settings.model.ts`               | Platform Settings |
| `src/platform/models/branding.model.ts`                      | Platform Settings |
| `src/platform/models/currencies.model.ts`                    | Platform Settings |
| `src/platform/routes/feature-flags/feature-flags.route.ts`   | Feature Flags     |
| `src/platform/routes/feature-flags/feature-flags.service.ts` | Feature Flags     |
| `src/platform/routes/settings/settings.route.ts`             | Platform Settings |
| `src/platform/routes/settings/settings.service.ts`           | Platform Settings |
| `src/platform/routes/storage/storage.route.ts`               | Storage           |
| `src/platform/routes/storage/storage.service.ts`             | Storage           |

### Developer Portal (`apps/developer/`)

| Directory                                                  | Feature           |
| ---------------------------------------------------------- | ----------------- |
| `src/features/custom-fields/pages/CustomFieldsPage.tsx`    | Custom Fields     |
| `src/features/custom-fields/hooks/useCustomFields.ts`      | Custom Fields     |
| `src/features/custom-fields/hooks/useCustomFields.test.ts` | Custom Fields     |
| `src/features/custom-fields/components/...`                | Custom Fields     |
| `src/features/feature-flags/pages/FeatureFlagsPage.tsx`    | Feature Flags     |
| `src/features/feature-flags/hooks/useFeatureFlags.ts`      | Feature Flags     |
| `src/features/feature-flags/hooks/useFeatureFlags.test.ts` | Feature Flags     |
| `src/features/feature-flags/components/...`                | Feature Flags     |
| `src/features/settings/pages/SettingsPage.tsx`             | Platform Settings |
| `src/features/settings/hooks/useSystemSettings.ts`         | Platform Settings |
| `src/features/settings/hooks/useSystemSettings.test.ts`    | Platform Settings |
| `src/features/settings/components/...`                     | Platform Settings |
| `src/features/storage/pages/StoragePage.tsx`               | Storage           |
| `src/features/storage/hooks/useStorageStats.ts`            | Storage           |
| `src/features/storage/hooks/useStorageStats.test.ts`       | Storage           |
| `src/features/storage/components/...`                      | Storage           |

### Admin Portal (`apps/admin/`)

| File                                                       | Feature                                       |
| ---------------------------------------------------------- | --------------------------------------------- |
| `src/features/settings/components/CustomFieldsManager.tsx` | Custom Fields (embedded in existing Settings) |

---

## Planning Document References

| Document                | Sections Referenced                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUILD_RULES             | §1 (zero any), §3 (RTL), §5 (Zod strict, apiResponse), §6.2 (embedding), §16.8 (tenant isolation), §16.10 (S3 security)                                              |
| DENTO_V2_MASTER_PLAN    | §3 (DB tree), §6 (monitoring), §7 (sidebar modules 10-13), §31 (new features), §36 (costs)                                                                           |
| IMPLEMENTATION_ROADMAP  | Phase 3 Week 13 (Custom Fields), Phase 7 sidebar items                                                                                                               |
| SECURITY_AND_ENCRYPTION | §12 (tenant isolation), §17 (encryption at rest)                                                                                                                     |
| TECH_REQUIREMENTS       | §3.7 (S3/R2 stack), §8.2 (Cloudflare R2), §11 (env vars), §12.2 (dependencies)                                                                                       |
| V2_DATABASE             | §4.2 (tenants.featureFlags, storage fields), §4.8 (feature_flags collection), §4.17 (system_settings globals), §11.1 (tenant settings), §15.2 (platform collections) |
| V2_DECISION_LOG         | §4.3 (cold storage), §16.2 (health dashboard), §16.3 (feature flag wireframe)                                                                                        |
| V2_STRUCTURE            | API route structure, frontend feature directories, platform collections                                                                                              |
| PLATFORM_RBAC           | §5 (platform_settings permissions), §8.2 (PlatformModule type), §8.5 (route mapping)                                                                                 |

---

## Step-by-Step Implementation Roadmap

### Feature 1: Custom Fields (~2 days)

**Day 1 — Shared + Dev Portal**

| Step | Task                                                                                                                                                                                                       | Files                                                                  | Depends On |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| 1.1  | Create `custom-field.types.ts` — `CustomField`, `CustomFieldListResponse`, export from shared index                                                                                                        | `packages/shared/src/types/custom-field.types.ts`                      | —          |
| 1.2  | Create `useCustomFields.ts` hook — TanStack Query for list (with entity filter, pagination), create, update, toggle, delete mutations                                                                      | `apps/developer/src/features/custom-fields/hooks/useCustomFields.ts`   | 1.1        |
| 1.3  | Create `CustomFieldsPage.tsx` — entity tabs (patient/appointment/invoice/etc.), field list table, collapsible developer guide (6-step walkthrough), "+ Add Field" button → sheet/dialog                    | `apps/developer/src/features/custom-fields/pages/CustomFieldsPage.tsx` | 1.2        |
| 1.4  | Create components — `CustomFieldCard.tsx` (draggable), `CustomFieldForm.tsx` (create/edit sheet with type selector, options for select/multiselect, validation config), `DeveloperGuide.tsx` (collapsible) | `apps/developer/src/features/custom-fields/components/`                | 1.3        |
| 1.5  | Wire route in `router.tsx` — replace placeholder with real `CustomFieldsPage`                                                                                                                              | `apps/developer/src/router.tsx`                                        | 1.3        |

**Day 2 — Admin + Tests + Polish**

| Step | Task                                                                                                                                                  | Files                                                                     | Depends On |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------- |
| 1.6  | Create `CustomFieldsManager.tsx` in Admin — simplified version embedded in existing Settings page (entity selector → field list → inline create/edit) | `apps/admin/src/features/settings/components/CustomFieldsManager.tsx`     | 1.1        |
| 1.7  | Write `useCustomFields.test.ts` — list query, create/update/delete mutations, entity filtering, loading/error states                                  | `apps/developer/src/features/custom-fields/hooks/useCustomFields.test.ts` | 1.2        |
| 1.8  | Add drag-and-drop reorder with `@dnd-kit/sortable` (verify package installed, wire `sortOrder` updates)                                               | Component files from 1.4                                                  | 1.4        |
| 1.9  | Build + test verification — all 5 packages build, all tests pass                                                                                      | —                                                                         | 1.1–1.8    |

---

### Feature 2: Platform Settings (~2 days)

**Day 3 — Backend (Models + Routes)**

| Step | Task                                                                                                                                                            | Files                                                                                                         | Depends On |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| 2.1  | Create `system-settings.types.ts` + `system-settings.schema.ts` in shared — `SystemSettings`, `Branding`, `Currencies` types + Zod validation                   | `packages/shared/src/types/system-settings.types.ts`, `packages/shared/src/schemas/system-settings.schema.ts` | —          |
| 2.2  | Create `system-settings.model.ts` — singleton Mongoose document (maintenanceMode, defaultTimezone, defaultCurrency, defaultLanguage, registrationEnabled, etc.) | `apps/api/src/platform/models/system-settings.model.ts`                                                       | 2.1        |
| 2.3  | Create `branding.model.ts` — singleton (platformName, logoUrl, faviconUrl, primaryColor, landingPageUrl)                                                        | `apps/api/src/platform/models/branding.model.ts`                                                              | 2.1        |
| 2.4  | Create `currencies.model.ts` — singleton (baseCurrency, exchangeRates Map, lastUpdatedAt)                                                                       | `apps/api/src/platform/models/currencies.model.ts`                                                            | 2.1        |
| 2.5  | Create `settings.route.ts` + `settings.service.ts` — GET/PATCH for system settings, branding, currencies. Guard: `platformGuard('platform_settings', action)`   | `apps/api/src/platform/routes/settings/`                                                                      | 2.2–2.4    |
| 2.6  | Write API route tests                                                                                                                                           | `apps/api/src/platform/routes/settings/__tests__/`                                                            | 2.5        |

**Day 4 — Dev Portal Frontend + Tests**

| Step | Task                                                                                                                                                                                                     | Files                                                                  | Depends On |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| 2.7  | Create `useSystemSettings.ts` hook — TanStack Query for GET + PATCH mutations for all 3 singletons                                                                                                       | `apps/developer/src/features/settings/hooks/useSystemSettings.ts`      | 2.1        |
| 2.8  | Create `SettingsPage.tsx` — tabs: General (timezone, currency, language, registration), Branding (name, logo upload, colors), Currencies (base currency, exchange rates), Maintenance (toggle + message) | `apps/developer/src/features/settings/pages/SettingsPage.tsx`          | 2.7        |
| 2.9  | Create tab components — `GeneralSettingsTab.tsx`, `BrandingSettingsTab.tsx`, `CurrenciesTab.tsx`, `MaintenanceTab.tsx`                                                                                   | `apps/developer/src/features/settings/components/`                     | 2.8        |
| 2.10 | Wire route in `router.tsx` — replace placeholder                                                                                                                                                         | `apps/developer/src/router.tsx`                                        | 2.8        |
| 2.11 | Write `useSystemSettings.test.ts`                                                                                                                                                                        | `apps/developer/src/features/settings/hooks/useSystemSettings.test.ts` | 2.7        |
| 2.12 | Build + test verification                                                                                                                                                                                | —                                                                      | 2.1–2.11   |

---

### Feature 3: Feature Flags (~3 days)

**Day 5 — Shared + Backend**

| Step | Task                                                                                                                                                                                                | Files                                                                 | Depends On |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------- |
| 3.1  | Create `feature-flag.types.ts` — `FeatureFlag`, `FeatureFlagListResponse`, `CreateFeatureFlagInput`, `UpdateFeatureFlagInput`                                                                       | `packages/shared/src/types/feature-flag.types.ts`                     | —          |
| 3.2  | Create `feature-flag.schema.ts` — Zod `.strict()` schemas for create, update, query (with pagination)                                                                                               | `packages/shared/src/schemas/feature-flag.schema.ts`                  | 3.1        |
| 3.3  | Create `feature-flag.model.ts` — Mongoose schema (key, name, description, tenantId, enabled, percentageRollout, userIds, conditions, value). Indexes: `{key,tenantId}` unique, `{tenantId,enabled}` | `apps/api/src/platform/models/feature-flag.model.ts`                  | 3.1        |
| 3.4  | Create `feature-flags.service.ts` — CRUD + toggle + percentage rollout logic + tenant-scoped queries                                                                                                | `apps/api/src/platform/routes/feature-flags/feature-flags.service.ts` | 3.3        |
| 3.5  | Create `feature-flags.route.ts` — LIST (paginated), GET, CREATE, UPDATE, DELETE, TOGGLE. Guard: `platformGuard('platform_settings', action)`                                                        | `apps/api/src/platform/routes/feature-flags/feature-flags.route.ts`   | 3.4        |
| 3.6  | Register route in platform server plugin                                                                                                                                                            | `apps/api/src/server.ts` or platform routes index                     | 3.5        |

**Day 6 — API Tests + Dev Portal Frontend**

| Step | Task                                                                                                                                                                                                                    | Files                                                                  | Depends On |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| 3.7  | Write API route tests — CRUD, toggle, percentage rollout, tenant scoping, RBAC guard checks                                                                                                                             | `apps/api/src/platform/routes/feature-flags/__tests__/`                | 3.5        |
| 3.8  | Create `useFeatureFlags.ts` hook — list query + create/update/delete/toggle mutations                                                                                                                                   | `apps/developer/src/features/feature-flags/hooks/useFeatureFlags.ts`   | 3.1        |
| 3.9  | Create `FeatureFlagsPage.tsx` — flag list with status indicators (green/yellow/red), "+ Create Flag" button, search/filter                                                                                              | `apps/developer/src/features/feature-flags/pages/FeatureFlagsPage.tsx` | 3.8        |
| 3.10 | Create components — `FeatureFlagCard.tsx` (status dot, percentage bar, tenant count), `FeatureFlagForm.tsx` (create/edit sheet: key, name, description, percentage slider, tenant multi-select, conditions JSON editor) | `apps/developer/src/features/feature-flags/components/`                | 3.9        |

**Day 7 — Wire + Tests + Polish**

| Step | Task                                                                                       | Files                                                                     | Depends On |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------- |
| 3.11 | Wire route in `router.tsx` — replace placeholder                                           | `apps/developer/src/router.tsx`                                           | 3.9        |
| 3.12 | Write `useFeatureFlags.test.ts` — list, create, update, delete, toggle, percentage rollout | `apps/developer/src/features/feature-flags/hooks/useFeatureFlags.test.ts` | 3.8        |
| 3.13 | Build + test verification                                                                  | —                                                                         | 3.1–3.12   |

---

### Feature 4: Storage (~1.5 days)

**Day 8 — Full Stack**

| Step | Task                                                                                                                                                                   | Files                                                          | Depends On |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| 4.1  | Create `storage.types.ts` — `StorageStats`, `TenantStorageInfo`, `StorageOverview`                                                                                     | `packages/shared/src/types/storage.types.ts`                   | —          |
| 4.2  | Create `storage.schema.ts` — Zod schemas for query params                                                                                                              | `packages/shared/src/schemas/storage.schema.ts`                | 4.1        |
| 4.3  | Create `storage.service.ts` — aggregate `tenants.currentStorageMB`/`maxStorageGB`, per-tenant breakdown, total platform usage, S3 bucket info via `@aws-sdk/client-s3` | `apps/api/src/platform/routes/storage/storage.service.ts`      | 4.1        |
| 4.4  | Create `storage.route.ts` — GET `/stats` (overview), GET `/tenants` (per-tenant breakdown). Guard: `platformGuard('platform_settings', 'read')`                        | `apps/api/src/platform/routes/storage/storage.route.ts`        | 4.3        |
| 4.5  | Create `useStorageStats.ts` hook — TanStack Query for stats + tenant breakdown                                                                                         | `apps/developer/src/features/storage/hooks/useStorageStats.ts` | 4.1        |
| 4.6  | Create `StoragePage.tsx` — total usage progress bar, per-tenant breakdown table (name, used, limit, % used, overage alert), pricing info                               | `apps/developer/src/features/storage/pages/StoragePage.tsx`    | 4.5        |
| 4.7  | Create components — `StorageOverviewCard.tsx`, `TenantStorageTable.tsx`, `StorageUsageBar.tsx`                                                                         | `apps/developer/src/features/storage/components/`              | 4.6        |

**Day 9 (half) — Wire + Tests**

| Step | Task                                                                              | Files                                                               | Depends On |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| 4.8  | Wire route in `router.tsx` — replace placeholder                                  | `apps/developer/src/router.tsx`                                     | 4.6        |
| 4.9  | Write `useStorageStats.test.ts`                                                   | `apps/developer/src/features/storage/hooks/useStorageStats.test.ts` | 4.5        |
| 4.10 | Write API route tests                                                             | `apps/api/src/platform/routes/storage/__tests__/`                   | 4.4        |
| 4.11 | Final build + full test suite verification (all 5 packages build, all tests pass) | —                                                                   | All        |

---

### Summary Timeline

```
Day 1  ┃ Custom Fields — shared types + Dev Portal page + components
Day 2  ┃ Custom Fields — Admin component + tests + drag-and-drop + verify
Day 3  ┃ Platform Settings — shared + 3 models + API routes + tests
Day 4  ┃ Platform Settings — Dev Portal page + tabs + tests + verify
Day 5  ┃ Feature Flags — shared + model + service + API routes
Day 6  ┃ Feature Flags — API tests + Dev Portal page + components
Day 7  ┃ Feature Flags — wire route + frontend tests + verify
Day 8  ┃ Storage — full stack (shared + API + Dev Portal)
Day 9½ ┃ Storage — tests + final verification of entire Phase 7
```

**Total: 41 steps across 4 features, ~8.5 working days.**

Each feature ends with a build + test gate before moving to the next.

---

_Plan created 2026-03-03. Based on cross-reference of 9 planning documents against current codebase state._
