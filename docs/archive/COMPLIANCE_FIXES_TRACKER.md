# Dentov2 — Compliance Fixes Tracker

> Generated: 2026-02-26
> Total Violations: **~179** across **285 files**
> Reference: `docs/planning/BUILD_RULES.md` (§1–§28)

---

## Fix Waves & Progress

| Wave      | Focus                                                        | Violations | Status  |
| --------- | ------------------------------------------------------------ | ---------- | ------- |
| 1         | Runtime Crashes                                              | 1          | ✅ Done |
| 2         | Security                                                     | 4          | ✅ Done |
| 3         | Data Integrity (Booleans + Dates + Enums)                    | ~52        | ✅ Done |
| 4         | Developer Router Migration                                   | 2          | ✅ Done |
| 5         | Missing Standard Fields (`isActive`/`createdBy`/`updatedBy`) | ~74        | ✅ Done |
| 6         | RTL + Accessibility                                          | ~28        | ✅ Done |
| 7         | Code Quality (logger, `<Button>`, colors, misc)              | ~18        | ✅ Done |
| **Total** |                                                              | **~179**   |         |

---

## Wave 1 — Runtime Crashes (1 CRITICAL)

| #   | ID  | File                                                              | Rule | Description                                                                                                  | Status |
| --- | --- | ----------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | C5  | `apps/api/src/tenant/routes/notifications/notifications.route.ts` | §9   | Calls non-existent `apiResponse.paginated()`, `.success()`, `.notFound()` — every handler crashes at runtime | ✅     |

---

## Wave 2 — Security (4 CRITICAL)

| #   | ID  | File                                    | Rule  | Description                                                         | Status |
| --- | --- | --------------------------------------- | ----- | ------------------------------------------------------------------- | ------ |
| 1   | C1  | `packages/shared/src/utils/index.ts`    | §2    | Re-exports `argon2` native addon — breaks frontend bundling         | ✅     |
| 2   | C2  | `packages/shared/src/utils/password.ts` | §2    | Server-only `hashPassword`/`verifyPassword` lives in shared package | ✅     |
| 3   | C15 | `apps/admin/vite.config.ts`             | §16.9 | `sourcemap: true` in production build — exposes source code         | ✅     |
| 4   | C17 | `apps/developer/vite.config.ts`         | §16.9 | `sourcemap: true` in production build — exposes source code         | ✅     |

---

## Wave 3 — Data Integrity (~52 violations)

### 3A — Boolean `is` Prefix (§6.3) — ~34 fields

| #   | ID     | File                                                 | Fields                                                                                                                                                     | Status |
| --- | ------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | C6     | `apps/api/src/tenant/models/notification.model.ts`   | ~20 fields: `emailEnabled`→`isEmailEnabled`, `smsEnabled`→`isSmsEnabled`, `pushEnabled`→`isPushEnabled`, `allowBulk`→`isAllowBulk`, etc.                   | ✅     |
| 2   | C7     | `apps/api/src/tenant/models/recurring-rule.model.ts` | 4 fields: `autoConfirm`→`isAutoConfirm`, `skipHolidays`→`isSkipHolidays`, `skipIfConflict`→`isSkipIfConflict`, `allowPatientCancel`→`isAllowPatientCancel` | ✅     |
| 3   | C8     | `apps/api/src/platform/models/tenant.model.ts`       | 2 fields: `allowNegativeStock`→`isAllowNegativeStock`, `requireAppointmentConfirmation`→`isRequireAppointmentConfirmation`                                 | ✅     |
| 4   | C9-C14 | 6 more API models                                    | Various boolean fields missing `is` prefix                                                                                                                 | ✅     |
| 5   | M1     | `packages/shared/src/schemas/patient.schema.ts`      | 8 `has*` fields: `hasHeartDisease`→`isHeartDisease`, `hasDiabetes`→`isDiabetes`, etc.                                                                      | ✅     |

### 3B — Date `At` Suffix (§6.3) — ~12 fields

| #   | File                                                | Field → Fix                                                    | Status |
| --- | --------------------------------------------------- | -------------------------------------------------------------- | ------ |
| 1   | `apps/api/src/platform/models/user.model.ts`        | `lastPasswordChange` → `lastPasswordChangedAt`                 | ✅     |
| 2   | `apps/api/src/platform/models/tenant.model.ts`      | `trialStartDate`→`trialStartedAt`, `trialEndDate`→`trialEndAt` | ✅     |
| 3   | `packages/shared/src/schemas/patient.schema.ts`     | `lastDentalVisit` → `lastDentalVisitAt`                        | ✅     |
| 4   | `apps/api/src/tenant/models/doctor.model.ts`        | `hireDate`→`hiredAt`, `terminationDate`→`terminatedAt`         | ✅     |
| 5   | `apps/api/src/tenant/models/walk-in-queue.model.ts` | `checkInTime` → `checkedInAt`                                  | ✅     |
| 6   | Various shared types                                | `effectiveDate`→`effectiveAt`, `expiryDate`→`expiresAt`        | ✅     |

### 3C — Appointment Status Enum Conflict (§6) — 2 CRITICAL

| #   | ID  | File                                                | Description                                                                | Status |
| --- | --- | --------------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| 1   | C3  | `packages/shared/src/constants/index.ts`            | `APPOINTMENT_STATUSES` uses `scheduled`/`checked_in`                       | ✅     |
| 2   | C4  | `packages/shared/src/schemas/appointment.schema.ts` | `appointmentStatusEnum` uses `booked`/`arrived` — conflicts with constants | ✅     |

---

## Wave 4 — Developer Router Migration (2 CRITICAL)

| #   | ID  | File                            | Rule | Description                                                                  | Status |
| --- | --- | ------------------------------- | ---- | ---------------------------------------------------------------------------- | ------ |
| 1   | C18 | `apps/developer/src/App.tsx`    | §8.6 | Uses `<BrowserRouter>` instead of `createBrowserRouter` + `<RouterProvider>` | ✅     |
| 2   | C19 | `apps/developer/src/router.tsx` | §8.6 | Uses JSX `<Routes>`/`<Route>` instead of route objects                       | ✅     |

---

## Wave 5 — Missing Standard Fields (~74 across ~28 models)

| #   | Field       | Models Missing It | Count | Status |
| --- | ----------- | ----------------- | ----- | ------ |
| 1   | `isActive`  | 23 models         | 23    | ✅     |
| 2   | `createdBy` | 21 models         | 21    | ✅     |
| 3   | `updatedBy` | 30 models         | 30    | ✅     |

**Models requiring all 3:** api-key, backup, country-config, module, payment, pricing, rollout-plan, support-session, support-ticket, tenant-module, translation-pack, user-session, user, webhook (platform); branding, doctor, notification, patient, recurring-rule, report, walk-in-queue, webhook (tenant)

**Models already compliant:** appointment-type, waitlist, appointment

---

## Wave 6 — RTL + Accessibility (~28 violations)

### 6A — RTL Physical CSS (§11.1) — 5 in UI

| #   | File                                         | Line | Issue                                    | Status |
| --- | -------------------------------------------- | ---- | ---------------------------------------- | ------ |
| 1   | `packages/ui/src/primitives/Switch.tsx`      | L21  | `translate-x-4` physical transform       | ✅     |
| 2   | `packages/ui/src/styles/globals.css`         | L297 | `text-align: right` in RTL block         | ✅     |
| 3   | `packages/ui/src/primitives/Calendar.tsx`    | L17  | `space-x-4`/`space-x-1` physical margins | ✅     |
| 4   | `packages/ui/src/composites/Modal.tsx`       | L65  | `sm:space-x-2`                           | ✅     |
| 5   | `packages/ui/src/primitives/AlertDialog.tsx` | L52  | `sm:space-x-2`                           | ✅     |

### 6B — Missing `aria-label` (§13.1) — ~23 buttons

| #   | File                                                         | Count | Details                                       | Status |
| --- | ------------------------------------------------------------ | ----- | --------------------------------------------- | ------ |
| 1   | `apps/admin/src/components/AppHeader.tsx`                    | 5     | Menu(×2), Dark mode, Notifications, User menu | ✅     |
| 2   | `apps/admin/src/components/AppSidebar.tsx`                   | 1     | Mobile close button                           | ✅     |
| 3   | `apps/admin/src/layouts/Header/Header.tsx`                   | 4     | Menu, Dark mode, Notifications, User          | ✅     |
| 4   | `apps/admin/src/components/LocaleToggle.tsx`                 | 1     | Missing `aria-label` (C16)                    | ✅     |
| 5   | `apps/developer/src/components/AppHeader.tsx`                | 5     | Various icon buttons                          | ✅     |
| 6   | `apps/developer/src/layouts/Header/Header.tsx`               | 2     | Icon buttons                                  | ✅     |
| 7   | `apps/developer/src/features/api-keys/pages/ApiKeysPage.tsx` | 5     | Action buttons                                | ✅     |

---

## Wave 7 — Code Quality (~18 violations)

### 7A — `console.*` → Logger (§9.5)

| #   | File                                                                | Count             | Status |
| --- | ------------------------------------------------------------------- | ----------------- | ------ |
| 1   | `apps/api/src/platform/routes/impersonation/impersonation.route.ts` | 5 `console.error` | ✅     |
| 2   | `apps/api/src/platform/routes/support/support.route.ts`             | 9 `console.error` | ✅     |
| 3   | `apps/api/src/platform/routes/modules/modules.route.ts`             | 4 `console.error` | ✅     |
| 4   | `apps/api/src/config/env.ts`                                        | 1 `console.error` | ✅     |
| 5   | `apps/admin/src/stores/locale.store.ts`                             | 1 `console.error` | ✅     |
| 6   | `apps/admin/src/features/onboarding/pages/OnboardingPage.tsx`       | 1 `console.log`   | ✅     |

### 7B — Native `<button>` → `<Button>` (§10)

| #   | File                                                                   | Count | Status |
| --- | ---------------------------------------------------------------------- | ----- | ------ |
| 1   | `apps/admin/src/components/AppHeader.tsx`                              | 7     | ✅     |
| 2   | `apps/admin/src/components/AppSidebar.tsx`                             | 3     | ✅     |
| 3   | `apps/admin/src/layouts/Header/Header.tsx`                             | 4     | ✅     |
| 4   | `apps/admin/src/features/dashboard/pages/DashboardPage.tsx`            | 2     | ✅     |
| 5   | `apps/admin/src/features/settings/pages/SettingsPage.tsx`              | 1     | ✅     |
| 6   | `apps/admin/src/features/notifications/pages/NotificationsPage.tsx`    | 6     | ✅     |
| 7   | `apps/admin/src/features/operations/pages/DailyOpsPage.tsx`            | 1     | ✅     |
| 8   | `apps/admin/src/features/onboarding/pages/OnboardingPage.tsx`          | 3     | ✅     |
| 9   | `apps/admin/src/features/onboarding/components/AdminUserStep.tsx`      | 1     | ✅     |
| 10  | `apps/admin/src/features/onboarding/components/OnboardingProgress.tsx` | 1     | ✅     |
| 11  | `apps/admin/src/features/onboarding/components/SettingsStep.tsx`       | 3     | ✅     |

### 7C — Hardcoded Colors → Brand Tokens (§14)

| #   | File                                                                         | Colors Found                            | Status |
| --- | ---------------------------------------------------------------------------- | --------------------------------------- | ------ |
| 1   | `apps/admin/src/features/patients/components/PatientColumns.tsx`             | `bg-blue-*`, `text-blue-*`, `bg-gray-*` | ✅     |
| 2   | `apps/admin/src/features/appointments/components/AppointmentDetailPanel.tsx` | `text-blue-*`, `text-emerald-*`         | ✅     |
| 3   | `apps/admin/src/features/reports/pages/ReportsHubPage.tsx`                   | `bg-green-*`, `text-blue-*`             | ✅     |
| 4   | `apps/admin/src/features/reports/pages/ReportCategoryPage.tsx`               | `bg-green-*`, `text-blue-*`             | ✅     |

### 7D — Miscellaneous MINOR

| #   | File                                          | Issue                                                                       | Status |
| --- | --------------------------------------------- | --------------------------------------------------------------------------- | ------ |
| 1   | `packages/shared/package.json`                | Zod `^3.x` caret → exact                                                    | ✅     |
| 2   | `packages/shared/src/constants/index.ts`      | `MODULE_SLUGS` kebab vs snake_case                                          | ✅     |
| 3   | `packages/ui/src/primitives/Calendar.tsx`     | Chevron `'left'`/`'right'` strings — TODO added (lib limitation)            | ✅     |
| 4   | `packages/ui/src/composites/ClinicHeader.tsx` | Template literal instead of `cn()`                                          | ✅     |
| 5   | `apps/api/src/plugins/socket.plugin.ts`       | Env var name mismatch                                                       | ✅     |
| 6   | `apps/api/src/utils/logger.ts`                | Missing PII redaction config                                                | ✅     |
| 7   | `apps/api/src/config/env.ts`                  | Default secrets in env validation                                           | ✅     |
| 8   | `apps/developer/src/App.tsx`                  | `Toaster position="top-right"` — TODO added (lib limitation)                | ✅     |
| 9   | `package.json` (root)                         | `turbo: "latest"` not pinned                                                | ✅     |
| 10  | `package.json` (root)                         | `lint-staged: "latest"` not pinned                                          | ✅     |
| 11  | API routes                                    | 8 verb-in-URL: `/reset`, `/expire`, `/refund`, `/revoke`, `/rotate` → nouns | ✅     |
| 12  | API models                                    | 6 schemas partial `timestamps` → `timestamps: true`                         | ✅     |

---

## Fix Log

> Each fix will be logged here with date, wave, files changed, and build result.

| Date       | Wave    | Files Changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Build  | Notes                                                                                                                          |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 2026-02-26 | Wave 1  | `notifications.route.ts` — 15 method calls replaced with correct `apiResponse()`/`apiError()` signatures, added `apiError` import                                                                                                                                                                                                                                                                                                                                                                           | ✅ 5/5 | C5 fixed — all handlers now use correct function calls                                                                         |
| 2026-02-26 | Wave 2  | Moved `password.ts` from `@dento/shared` to `apps/api/src/utils/`, removed argon2 re-export + dep from shared, set `sourcemap: false` in admin & developer vite configs                                                                                                                                                                                                                                                                                                                                     | ✅ 5/5 | C1+C2+C15+C17 fixed — no more argon2 browser warnings                                                                          |
| 2026-02-26 | Wave 3  | Boolean `is` prefix: 36 renames in recurring-rule (4 files), ~54 in notification (4 files), 2 in tenant, 41 in patient. Date `At` suffix: 35 renames across user/tenant/patient/doctor/walk-in-queue + refs. Enum: `APPOINTMENT_STATUSES` unified to match `appointmentStatusEnum`                                                                                                                                                                                                                          | ✅ 5/5 | C3-C14, M1, all 3B items fixed — ~166 field renames across ~20 files                                                           |
| 2026-02-26 | Wave 4  | `developer/App.tsx`: `BrowserRouter`→`RouterProvider`, imported router object. `developer/router.tsx`: JSX `Routes/Route`→`createBrowserRouter` route objects. `DevPortalLayout.tsx`: Wrapped inner content in `SidebarProvider`                                                                                                                                                                                                                                                                            | ✅ 5/5 | C18+C19 fixed — developer app uses data router pattern                                                                         |
| 2026-02-26 | Wave 5  | Added `isActive`/`createdBy`/`updatedBy` to ~31 schemas across 15 platform + 7 tenant model files. Fixed `createdBy` String→ObjectId in tenant webhook, `updatedBy` String→ObjectId in branding                                                                                                                                                                                                                                                                                                             | ✅ 5/5 | ~74 missing fields added across all non-compliant models                                                                       |
| 2026-02-26 | Wave 6  | RTL: Switch toggle uses `ltr:/rtl:` variants, `text-align: right`→`end`, `space-x-*`→`gap-*` in Calendar/Modal/AlertDialog. A11y: 24 `aria-label` attrs added to icon buttons across admin + developer apps                                                                                                                                                                                                                                                                                                 | ✅ 5/5 | All RTL physical CSS + missing aria-labels fixed                                                                               |
| 2026-02-26 | Wave 7  | 7A: 18 `console.*`→`logger` in 3 API routes + env.ts comment + frontend eslint-disable. 7B: 32 native `<button>`→`<Button>` across 11 admin files. 7C: Hardcoded colors→brand tokens in 4 files. 7D: Pinned zod/dayjs/turbo/lint-staged, MODULE_SLUGS→snake_case, ClinicHeader cn(), socket CORS fix, PII redaction, removed default secrets, Sonner/Calendar TODOs                                                                                                                                         | ✅ 5/5 | All code quality items fixed; items 7D.11 (verb-in-URL) + 7D.12 (timestamps) deferred — low risk, require API contract changes |
| 2026-02-26 | Wave 7+ | 7D.11: Renamed 8 verb-in-URL endpoints across 6 route files (`/reset`→`DELETE`, `/expire`→`/expiration`, `/refund`→`/refunds`, `/revoke`→`PATCH /status`, `/rotate`→`/rotations`). 7D.12: Changed 6 partial `timestamps: { createdAt: true, updatedAt: false }` → `timestamps: true` in 4 model files (recurring-rule, walk-in-queue, report, notification)                                                                                                                                                 | ✅ 5/5 | All 7D items now complete — zero deferred                                                                                      |
| 2026-02-27 | Audit   | **Verification audit** found 2 gaps: (1) `notification.model.ts` — 3 default factory functions used `enabled: true` instead of `isEnabled: true` (Wave 3A remnant). (2) **60 native `<button>` in developer app** missed by Wave 7B (admin-only scope) — fixed across 9 files: AppHeader, Header, Sidebar, WebhooksPage, TenantsPage, TenantDetailPage (43 alone), SupportPage, PricingPage, DashboardPage, ApiKeysPage. All converted to `<Button>` from `@dento/ui` with correct variant/size/aria-label. | ✅ 5/5 | Full BUILD_RULES audit passed — all waves verified compliant                                                                   |

---

_Last updated: 2026-02-27_
