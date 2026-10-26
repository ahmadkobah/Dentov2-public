# Phase 0 + Phase 1 Compliance Audit (Weeks 0–4)

**Date:** 2026-02-27  
**Auditor:** GitHub Copilot (automated codebase scan)  
**Scope:** Verify all Phase 0 (Weeks 1-2) and Phase 1 (Weeks 3-4) requirements exist in the codebase

---

## PHASE 0 — Foundation (Weeks 1-2)

### 1. Monorepo Structure

| Item                  | Status   | Path                                                                             |
| --------------------- | -------- | -------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml` | ✅ FOUND | [pnpm-workspace.yaml](../pnpm-workspace.yaml) — packages: `packages/*`, `apps/*` |
| `turbo.json`          | ✅ FOUND | [turbo.json](../turbo.json) — tasks: dev, build, lint, type-check, test          |
| `apps/api`            | ✅ FOUND | [apps/api/](../apps/api/) — Fastify API server                                   |
| `apps/admin`          | ✅ FOUND | [apps/admin/](../apps/admin/) — Clinic admin portal (Vite + React)               |
| `apps/developer`      | ✅ FOUND | [apps/developer/](../apps/developer/) — Developer portal (Vite + React)          |
| `packages/shared`     | ✅ FOUND | [packages/shared/](../packages/shared/) — Zod schemas, types, utils, constants   |
| `packages/ui`         | ✅ FOUND | [packages/ui/](../packages/ui/) — Shared UI component library                    |

**Verdict: ✅ COMPLETE**

---

### 2. Docker: docker-compose.yml with MongoDB 7 + Redis 7

| Item                       | Status   | Path                                                    |
| -------------------------- | -------- | ------------------------------------------------------- |
| `docker-compose.yml`       | ✅ FOUND | [docker-compose.yml](../docker-compose.yml)             |
| MongoDB 7 (`mongo:7`)      | ✅ FOUND | Image: `mongo:7`, port 27017, volume `mongo-data`       |
| Redis 7 (`redis:7-alpine`) | ✅ FOUND | Image: `redis:7-alpine`, port 6379, volume `redis-data` |

**Verdict: ✅ COMPLETE**

---

### 3. Fastify Server

| Item        | Status   | Path                                                                                                                                    |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `server.ts` | ✅ FOUND | [apps/api/src/server.ts](../apps/api/src/server.ts) — Fastify instance, plugin registration, route mounting, error handling (306 lines) |

**Verdict: ✅ COMPLETE**

---

### 4. Shared Package (Zod schemas, types, utils, constants)

| Item         | Status   | Path                                                                                                                          |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Zod Schemas  | ✅ FOUND | [packages/shared/src/schemas/](../packages/shared/src/schemas/) — 32 schema files (auth, patient, appointment, invoice, etc.) |
| Types        | ✅ FOUND | [packages/shared/src/types/](../packages/shared/src/types/) — 16 type files (apikey, payment, webhook, socket, etc.)          |
| Utils        | ✅ FOUND | [packages/shared/src/utils/index.ts](../packages/shared/src/utils/index.ts)                                                   |
| Constants    | ✅ FOUND | [packages/shared/src/constants/index.ts](../packages/shared/src/constants/index.ts)                                           |
| Index barrel | ✅ FOUND | [packages/shared/src/index.ts](../packages/shared/src/index.ts)                                                               |

**Verdict: ✅ COMPLETE**

---

### 5. UI Package (Button, Input, Card, Badge, Label, Separator)

| Component | Status   | Path                                       |
| --------- | -------- | ------------------------------------------ |
| Button    | ✅ FOUND | `packages/ui/src/primitives/Button.tsx`    |
| Input     | ✅ FOUND | `packages/ui/src/primitives/Input.tsx`     |
| Card      | ✅ FOUND | `packages/ui/src/primitives/Card.tsx`      |
| Badge     | ✅ FOUND | `packages/ui/src/primitives/Badge.tsx`     |
| Label     | ✅ FOUND | `packages/ui/src/primitives/Label.tsx`     |
| Separator | ✅ FOUND | `packages/ui/src/primitives/Separator.tsx` |

Additional primitives found: Accordion, AlertDialog, Avatar, Calendar, Checkbox, Command, DropdownMenu, InputOTP, Modal, Popover, Progress, ScrollArea, Select, Sheet, Skeleton, Switch, Table, Tabs, Textarea, Toaster, Tooltip (27 total).

**Verdict: ✅ COMPLETE**

---

### 6. Vite Configs (admin + developer)

| Item                  | Status   | Path                                                                                                               |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| Admin Vite config     | ✅ FOUND | [apps/admin/vite.config.ts](../apps/admin/vite.config.ts) — React + Tailwind plugins, port 3000, API proxy         |
| Developer Vite config | ✅ FOUND | [apps/developer/vite.config.ts](../apps/developer/vite.config.ts) — React + Tailwind plugins, port 3002, API proxy |

**Verdict: ✅ COMPLETE**

---

### 7. Tailwind CSS Setup (admin + developer)

| Item                         | Status   | Path                                                                                                                                                             |
| ---------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin globals.css            | ✅ FOUND | [apps/admin/src/styles/globals.css](../apps/admin/src/styles/globals.css) — `@import '@dento/ui/globals.css'`, `@theme` with brand green color scale             |
| Developer globals.css        | ✅ FOUND | [apps/developer/src/styles/globals.css](../apps/developer/src/styles/globals.css) — `@import '@dento/ui/globals.css'`, `@theme` with brand blue + emerald accent |
| Tailwind Vite plugin (admin) | ✅ FOUND | `tailwindcss()` in `apps/admin/vite.config.ts` via `@tailwindcss/vite`                                                                                           |
| Tailwind Vite plugin (dev)   | ✅ FOUND | `tailwindcss()` in `apps/developer/vite.config.ts` via `@tailwindcss/vite`                                                                                       |

**Verdict: ✅ COMPLETE**

---

### 8. Security Plugins (helmet, cors, rate-limit)

| Plugin     | Status   | Path                                                                                                                                                                        |
| ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Helmet     | ✅ FOUND | [apps/api/src/plugins/helmet.plugin.ts](../apps/api/src/plugins/helmet.plugin.ts) — HSTS, frameguard, CSP, referrer-policy (42 lines)                                       |
| CORS       | ✅ FOUND | [apps/api/src/plugins/cors.plugin.ts](../apps/api/src/plugins/cors.plugin.ts) — origin whitelist from env, credentials, allowed headers                                     |
| Rate Limit | ✅ FOUND | [apps/api/src/plugins/rate-limit.plugin.ts](../apps/api/src/plugins/rate-limit.plugin.ts) — Redis-backed, global 100 req/min, auth 5 req/min, upload 10 req/min (107 lines) |

**Verdict: ✅ COMPLETE**

---

### 9. Swagger Plugin

| Item           | Status   | Path                                                                                                                                                                            |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger plugin | ✅ FOUND | [apps/api/src/plugins/swagger.plugin.ts](../apps/api/src/plugins/swagger.plugin.ts) — `@fastify/swagger` + `@fastify/swagger-ui`, OpenAPI tags for all route groups (231 lines) |

**Verdict: ✅ COMPLETE**

---

### 10. `.env.example` with Placeholder Secrets

| Item           | Status   | Path                                                             |
| -------------- | -------- | ---------------------------------------------------------------- |
| `.env.example` | ✅ FOUND | [.env.example](../.env.example) — 61 lines                       |
| MongoDB URI    | ✅       | `MONGODB_URI=mongodb://localhost:27017/dento_platform`           |
| Redis URL      | ✅       | `REDIS_URL=redis://localhost:6379`                               |
| JWT secrets    | ✅       | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`                        |
| Encryption key | ✅       | `ENCRYPTION_MASTER_KEY`                                          |
| S3/R2 config   | ✅       | `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`     |
| Email (Resend) | ✅       | `RESEND_API_KEY`                                                 |
| SMS (Twilio)   | ✅       | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| VAPID keys     | ✅       | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`                          |
| Stripe/Paymob  | ✅       | `STRIPE_SECRET_KEY`, `PAYMOB_API_KEY`                            |
| Sentry         | ✅       | `SENTRY_DSN`                                                     |
| CORS           | ✅       | `CORS_ORIGIN`                                                    |

**Verdict: ✅ COMPLETE**

---

### 11. TypeScript Configs

| Item               | Status   | Path                                                              |
| ------------------ | -------- | ----------------------------------------------------------------- |
| Base tsconfig      | ✅ FOUND | [tsconfig.base.json](../tsconfig.base.json)                       |
| API tsconfig       | ✅ FOUND | [apps/api/tsconfig.json](../apps/api/tsconfig.json)               |
| Admin tsconfig     | ✅ FOUND | [apps/admin/tsconfig.json](../apps/admin/tsconfig.json)           |
| Developer tsconfig | ✅ FOUND | [apps/developer/tsconfig.json](../apps/developer/tsconfig.json)   |
| Shared tsconfig    | ✅ FOUND | [packages/shared/tsconfig.json](../packages/shared/tsconfig.json) |
| UI tsconfig        | ✅ FOUND | [packages/ui/tsconfig.json](../packages/ui/tsconfig.json)         |

**Verdict: ✅ COMPLETE**

---

### 12. Vitest Config

| Item          | Status   | Path                                                                                                                          |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Vitest config | ✅ FOUND | [apps/api/vitest.config.ts](../apps/api/vitest.config.ts) — globals, node env, `src/**/*.test.ts`, v8 coverage, 60% threshold |

**Verdict: ✅ COMPLETE**

---

## PHASE 0 SUMMARY

| #   | Requirement                | Status      |
| --- | -------------------------- | ----------- |
| 1   | Monorepo structure         | ✅ COMPLETE |
| 2   | Docker (Mongo 7 + Redis 7) | ✅ COMPLETE |
| 3   | Fastify server             | ✅ COMPLETE |
| 4   | Shared package             | ✅ COMPLETE |
| 5   | UI package                 | ✅ COMPLETE |
| 6   | Vite configs               | ✅ COMPLETE |
| 7   | Tailwind CSS               | ✅ COMPLETE |
| 8   | Security plugins           | ✅ COMPLETE |
| 9   | Swagger plugin             | ✅ COMPLETE |
| 10  | .env.example               | ✅ COMPLETE |
| 11  | tsconfig files             | ✅ COMPLETE |
| 12  | Vitest config              | ✅ COMPLETE |

**Phase 0 Score: 12/12 ✅**

---

## PHASE 1 — Auth & Tenancy (Weeks 3-4)

### 1. Auth Routes (login, register, refresh, logout, forgot-password)

| Route                        | Status   | Location                                                                                                                                                |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/login`           | ✅ FOUND | [auth.route.ts L206](../apps/api/src/tenant/routes/auth/auth.route.ts) — Zod validation, brute-force check, argon2id verify, dual-token, session create |
| `POST /auth/register`        | ✅ FOUND | [auth.route.ts L364](../apps/api/src/tenant/routes/auth/auth.route.ts) — Zod validation, activation token, password hashing                             |
| `POST /auth/refresh`         | ✅ FOUND | [auth.route.ts L438](../apps/api/src/tenant/routes/auth/auth.route.ts) — Token rotation, session validation                                             |
| `POST /auth/logout`          | ✅ FOUND | [auth.route.ts L550](../apps/api/src/tenant/routes/auth/auth.route.ts) — Session revocation                                                             |
| `POST /auth/logout-all`      | ✅ FOUND | [auth.route.ts L579](../apps/api/src/tenant/routes/auth/auth.route.ts) — All sessions revoked                                                           |
| `POST /auth/forgot-password` | ✅ FOUND | [auth.route.ts L622](../apps/api/src/tenant/routes/auth/auth.route.ts) — Reset token generation                                                         |
| `POST /auth/reset-password`  | ✅ FOUND | [auth.route.ts L674](../apps/api/src/tenant/routes/auth/auth.route.ts) — Token verification, password update                                            |
| `POST /auth/change-password` | ✅ FOUND | [auth.route.ts L749](../apps/api/src/tenant/routes/auth/auth.route.ts) — Authenticated, password history check                                          |
| 2FA routes                   | ✅ FOUND | [two-factor.route.ts](../apps/api/src/tenant/routes/auth/two-factor.route.ts)                                                                           |

**Verdict: ✅ COMPLETE**

---

### 2. Tenant Model + Routes in Platform

| Item            | Status   | Path                                                                                                                                                                                      |
| --------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant model    | ✅ FOUND | [apps/api/src/platform/models/tenant.model.ts](../apps/api/src/platform/models/tenant.model.ts) — 207 lines, full schema (name, slug, status, trial, limits, settings, branding, modules) |
| Platform routes | ✅ FOUND | [apps/api/src/platform/routes/](../apps/api/src/platform/routes/) — api-keys, backups, db-explorer, impersonation, modules, payments, pricing, rate-limits, support, versioning, webhooks |

**Verdict: ✅ COMPLETE**

---

### 3. RBAC Middleware (authGuard, tenantDb, roleGuard)

| Middleware           | Status   | Path                                                                                                                                                       |
| -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authGuard`          | ✅ FOUND | [apps/api/src/tenant/middleware/auth-guard.ts](../apps/api/src/tenant/middleware/auth-guard.ts) — JWT verify, user status check, token version (103 lines) |
| `optionalAuthGuard`  | ✅ FOUND | Same file — for mixed auth/anon endpoints                                                                                                                  |
| `tenantDbMiddleware` | ✅ FOUND | [apps/api/src/tenant/middleware/tenant-db.ts](../apps/api/src/tenant/middleware/tenant-db.ts) — Connection cache, `tenant_{slug}` DB isolation (150 lines) |
| `roleGuard`          | ✅ FOUND | [apps/api/src/tenant/middleware/role-guard.ts](../apps/api/src/tenant/middleware/role-guard.ts) — 460 lines, module-based permissions                      |
| Barrel export        | ✅ FOUND | [apps/api/src/tenant/middleware/index.ts](../apps/api/src/tenant/middleware/index.ts) — exports all middleware                                             |

**Verdict: ✅ COMPLETE**

---

### 4. Permission Matrix

| Item              | Status   | Path                                                                                                                                                                                                                                                                                  |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permission matrix | ✅ FOUND | [apps/api/src/tenant/middleware/role-guard.ts](../apps/api/src/tenant/middleware/role-guard.ts) — 28 modules × 8 roles (platform_admin, tenant_admin, dentist, receptionist, assistant, accountant, lab_tech, hygienist) with granular permissions (read/create/update/delete/manage) |

**Verdict: ✅ COMPLETE**

---

### 5. JWT Dual-Token (Access + Refresh)

| Item                      | Status   | Path                                                                  |
| ------------------------- | -------- | --------------------------------------------------------------------- |
| JWT utility               | ✅ FOUND | [apps/api/src/utils/jwt.ts](../apps/api/src/utils/jwt.ts) — 199 lines |
| Access token (HS256, 15m) | ✅       | `generateAccessToken()`, `verifyAccessToken()`                        |
| Refresh token (7d, jti)   | ✅       | `generateRefreshToken()` with `jti` for revocation                    |
| HttpOnly cookie           | ✅       | `setRefreshCookie()` — httpOnly, secure, sameSite=strict, signed      |
| Token rotation            | ✅       | `/auth/refresh` route rotates both tokens                             |
| Token version             | ✅       | User model `tokenVersion` field, checked in authGuard                 |

**Verdict: ✅ COMPLETE**

---

### 6. Brute-Force Protection (Redis-based)

| Item                   | Status   | Path                                                                                                          |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| Brute-force middleware | ✅ FOUND | [apps/api/src/tenant/middleware/brute-force.ts](../apps/api/src/tenant/middleware/brute-force.ts) — 253 lines |
| Redis-backed           | ✅       | Uses `getRedis()` for distributed tracking                                                                    |
| Progressive cooldown   | ✅       | 3 attempts → 5 min, 7 → 15 min, 10 → 30 min, 13 → 1 hour, 16+ → blocked                                       |
| IP + email identifier  | ✅       | Combined key: `{ip}:{email}`                                                                                  |
| Login rate limiter     | ✅       | `loginRateLimiter` exported and used on `/auth/login`                                                         |

**Verdict: ✅ COMPLETE**

---

### 7. User Model with Password History

| Item              | Status   | Path                                                                                                    |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| User model        | ✅ FOUND | [apps/api/src/platform/models/user.model.ts](../apps/api/src/platform/models/user.model.ts) — 206 lines |
| Password history  | ✅       | `passwordHistory: string[]` — last 5 hashes                                                             |
| Token version     | ✅       | `tokenVersion: number` — incremented on password change                                                 |
| Status flow       | ✅       | `invited → pending_activation → active → suspended → deactivated`                                       |
| Activation tokens | ✅       | `activationToken`, `activationTokenExpiresAt`                                                           |
| Reset tokens      | ✅       | `resetToken`, `resetTokenExpiresAt`                                                                     |
| 2FA fields        | ✅       | `twoFactorEnabled`, `twoFactorSecret`, `twoFactorRecoveryCodes`                                         |
| Argon2id hashing  | ✅       | Used in auth.route.ts with explicit config (64MB memory, timeCost=3)                                    |

**Verdict: ✅ COMPLETE**

---

### 8. User Invite Flow

| Item                        | Status     | Path                                                                                                                                          |
| --------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Activation token generation | ✅ FOUND   | [auth.route.ts L378-397](../apps/api/src/tenant/routes/auth/auth.route.ts) — SHA-256 hashed token, 24h TTL                                    |
| Status: `invited`           | ✅         | User model supports `invited` status                                                                                                          |
| `activationToken` fields    | ✅         | User model has `activationToken`, `activationTokenExpiresAt`, `activatedAt`                                                                   |
| Email sending               | ⚠️ PARTIAL | `TODO: Send activation email (Phase 4+)` comment at L409                                                                                      |
| Onboarding page (frontend)  | ✅ FOUND   | [apps/admin/src/features/onboarding/pages/OnboardingPage.tsx](../apps/admin/src/features/onboarding/pages/OnboardingPage.tsx) — 4-step wizard |

**Verdict: ⚠️ PARTIAL** — Flow exists but email dispatch is TODO

---

### 9. Avatar Upload Service

| Item                  | Status   | Path                                                                                                            |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| Avatar upload service | ✅ FOUND | [apps/api/src/services/avatar-upload.service.ts](../apps/api/src/services/avatar-upload.service.ts) — 198 lines |
| Validation            | ✅       | JPEG/PNG/WebP/GIF, max 2MB                                                                                      |
| Key generation        | ✅       | `generateKey()` with UUID                                                                                       |
| Avatar route          | ✅ FOUND | [apps/api/src/tenant/routes/users/avatar.route.ts](../apps/api/src/tenant/routes/users/avatar.route.ts)         |

**Verdict: ✅ COMPLETE**

---

### 10. i18n System (translation packs, useLocale, `<T>` component)

| Item                  | Status   | Path                                                                                                                                                                    |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TranslationPack model | ✅ FOUND | [apps/api/src/platform/models/translation-pack.model.ts](../apps/api/src/platform/models/translation-pack.model.ts) — locale (en/ar), namespace, translations key-value |
| Translation routes    | ✅ FOUND | [apps/api/src/tenant/routes/translations/translations.route.ts](../apps/api/src/tenant/routes/translations/translations.route.ts)                                       |
| `useLocale()` hook    | ✅ FOUND | [apps/admin/src/stores/locale.store.ts](../apps/admin/src/stores/locale.store.ts) — Zustand store, `useLocale()`, `useLocaleToggle()`, `useTranslation()`               |
| `<T>` component       | ✅ FOUND | [apps/admin/src/components/T.tsx](../apps/admin/src/components/T.tsx) — `<T k="auth.login.title" params={{}} />` (63 lines)                                             |
| Seed: EN translations | ✅ FOUND | Referenced in seed-platform.ts: `translationsEN`                                                                                                                        |
| Seed: AR translations | ✅ FOUND | Referenced in seed-platform.ts: `translationsAR`                                                                                                                        |

**Verdict: ✅ COMPLETE**

---

### 11. Doctor Model + Doctor-User Sync

| Item                     | Status   | Path                                                                                                                                                                        |
| ------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doctor model             | ✅ FOUND | [apps/api/src/tenant/models/doctor.model.ts](../apps/api/src/tenant/models/doctor.model.ts) — 193 lines, userId link, schedules, branches, specialization                   |
| Doctor-User sync service | ✅ FOUND | [apps/api/src/tenant/services/doctor-sync.service.ts](../apps/api/src/tenant/services/doctor-sync.service.ts) — 196 lines, bidirectional sync (name, phone, gender, avatar) |

**Verdict: ✅ COMPLETE**

---

### 12. Tenant Onboarding

| Item             | Status   | Path                                                                                                                                                                                                  |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding page  | ✅ FOUND | [apps/admin/src/features/onboarding/pages/OnboardingPage.tsx](../apps/admin/src/features/onboarding/pages/OnboardingPage.tsx) — 4-step wizard (Clinic Info → Branch → Admin User → Language/Currency) |
| Onboarding store | ✅ FOUND | Referenced: `@/stores/onboarding.store`                                                                                                                                                               |

**Verdict: ✅ COMPLETE**

---

### 13. Seed Scripts

| Item               | Status   | Path                                                                                                                                     |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `seed-tenant.ts`   | ✅ FOUND | [apps/api/src/scripts/seed-tenant.ts](../apps/api/src/scripts/seed-tenant.ts) — 142 lines, seeds medications + lab order types           |
| `seed-platform.ts` | ✅ FOUND | [apps/api/src/scripts/seed-platform.ts](../apps/api/src/scripts/seed-platform.ts) — 95 lines, seeds country configs + EN/AR translations |
| `seed-data/`       | ✅ FOUND | [apps/api/src/scripts/seed-data/](../apps/api/src/scripts/seed-data/)                                                                    |

**Verdict: ✅ COMPLETE**

---

### 14. Rate Limiting (API + Auth-specific)

| Item               | Status   | Path                                                                                                                  |
| ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Global rate limit  | ✅ FOUND | [apps/api/src/plugins/rate-limit.plugin.ts](../apps/api/src/plugins/rate-limit.plugin.ts) — 100 req/min, Redis-backed |
| Auth rate limit    | ✅ FOUND | `loginRateLimiter` in brute-force.ts, applied to `/auth/login`                                                        |
| Upload rate limit  | ✅       | 10 req/min                                                                                                            |
| API key rate limit | ✅       | 1000 req/min per `X-API-Key`                                                                                          |

**Verdict: ✅ COMPLETE**

---

### 15. Zod Validation on Endpoints

| Item               | Status   | Path                                                                                                                         |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Shared Zod schemas | ✅ FOUND | [packages/shared/src/schemas/](../packages/shared/src/schemas/) — 32 schema files                                            |
| Auth schemas       | ✅       | `loginSchema`, `registerSchema`, `refreshTokenSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `changePasswordSchema` |
| Server validation  | ✅       | `loginSchema.parse(request.body)` pattern used in auth routes                                                                |
| ZodError handling  | ✅       | `ZodError` imported in server.ts for error formatting                                                                        |

**Verdict: ✅ COMPLETE**

---

### 16. NoSQL Injection Guard (input sanitizer)

| Item                  | Status   | Path                                                                                                                  |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Input sanitizer       | ✅ FOUND | [apps/api/src/tenant/middleware/input-sanitizer.ts](../apps/api/src/tenant/middleware/input-sanitizer.ts) — 153 lines |
| `$` operator blocking | ✅       | Blocks `$where`, `$function`, `$accumulator`, `$expr`, all `$` prefixed keys                                          |
| Dot notation blocking | ✅       | Blocks `.\$` patterns                                                                                                 |
| Depth limit           | ✅       | MAX_DEPTH = 10                                                                                                        |
| Key count limit       | ✅       | MAX_KEYS = 100                                                                                                        |
| Safe query builder    | ✅       | `validateMongoQuery()`, `buildSafeProjection()` exported                                                              |

**Verdict: ✅ COMPLETE**

---

### 17. Country Config / Locale System

| Item                | Status   | Path                                                                                                                        |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| CountryConfig model | ✅ FOUND | [apps/api/src/platform/models/country-config.model.ts](../apps/api/src/platform/models/country-config.model.ts) — 124 lines |
| ISO 3166-1 codes    | ✅       | `code` (alpha-2), `name`, `nameArabic`                                                                                      |
| Currency config     | ✅       | `currency.code` (ISO 4217), `symbol`, `symbolPosition`, `decimalPlaces`                                                     |
| Timezone/date/time  | ✅       | `timezone` (IANA), `dateFormat`, `timeFormat`, `weekStart`                                                                  |
| Direction (LTR/RTL) | ✅       | `direction: 'ltr'                                                                                                           | 'rtl'` |
| Phone codes         | ✅       | `phoneCode` field                                                                                                           |
| Country seed data   | ✅       | Seeded in `seed-platform.ts` from `seed-data/country-configs.js`                                                            |

**Verdict: ✅ COMPLETE**

---

### 18. Encryption Middleware for PII Fields

| Item                    | Status   | Path                                                                                |
| ----------------------- | -------- | ----------------------------------------------------------------------------------- |
| Encryption utility      | ✅ FOUND | [apps/api/src/utils/encryption.ts](../apps/api/src/utils/encryption.ts) — 117 lines |
| Algorithm               | ✅       | AES-256-GCM                                                                         |
| `encryptField()`        | ✅       | Returns `iv:authTag:ciphertext` (hex)                                               |
| `decryptField()`        | ✅       | Parses and decrypts, graceful fallback                                              |
| `isEncryptionEnabled()` | ✅       | Checks `ENCRYPTION_MASTER_KEY` presence                                             |
| PII target fields       | ✅       | Per docs: nationalId, phone, email, address                                         |
| Env key                 | ✅       | `ENCRYPTION_MASTER_KEY` in `.env.example`                                           |

**Verdict: ✅ COMPLETE**

---

## PHASE 1 SUMMARY

| #   | Requirement                                                     | Status                              |
| --- | --------------------------------------------------------------- | ----------------------------------- |
| 1   | Auth routes (login, register, refresh, logout, forgot-password) | ✅ COMPLETE                         |
| 2   | Tenant model + platform routes                                  | ✅ COMPLETE                         |
| 3   | RBAC middleware (authGuard, tenantDb, roleGuard)                | ✅ COMPLETE                         |
| 4   | Permission matrix (28 modules × 8 roles)                        | ✅ COMPLETE                         |
| 5   | JWT dual-token (access + refresh)                               | ✅ COMPLETE                         |
| 6   | Brute-force protection (Redis)                                  | ✅ COMPLETE                         |
| 7   | User model with password history                                | ✅ COMPLETE                         |
| 8   | User invite flow                                                | ⚠️ PARTIAL (email dispatch is TODO) |
| 9   | Avatar upload service                                           | ✅ COMPLETE                         |
| 10  | i18n system (translations, useLocale, `<T>`)                    | ✅ COMPLETE                         |
| 11  | Doctor model + Doctor-User sync                                 | ✅ COMPLETE                         |
| 12  | Tenant onboarding wizard                                        | ✅ COMPLETE                         |
| 13  | Seed scripts (tenant + platform)                                | ✅ COMPLETE                         |
| 14  | Rate limiting (API + Auth)                                      | ✅ COMPLETE                         |
| 15  | Zod validation on endpoints                                     | ✅ COMPLETE                         |
| 16  | NoSQL injection guard                                           | ✅ COMPLETE                         |
| 17  | Country config / locale system                                  | ✅ COMPLETE                         |
| 18  | Encryption middleware for PII                                   | ✅ COMPLETE                         |

**Phase 1 Score: 17/18 ✅ — 1 partial**

---

## OVERALL SCORE

| Phase               | Score     | Status                               |
| ------------------- | --------- | ------------------------------------ |
| Phase 0 (Weeks 1-2) | **12/12** | ✅ All items found and implemented   |
| Phase 1 (Weeks 3-4) | **17/18** | ⚠️ 1 partial (invite email dispatch) |
| **TOTAL**           | **29/30** | **96.7% compliant**                  |

### Open Item

| ID   | Item                              | Gap                                                            | Severity                                                                            |
| ---- | --------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| P1-8 | User invite flow — email dispatch | `auth.route.ts` L409: `TODO: Send activation email (Phase 4+)` | Low — flow logic is complete, only email transport missing (deferred intentionally) |
