# Phase 0–2.5 Compliance Audit Report

**Date:** 2025-01-XX  
**Audited against:** `BUILD_RULES.md` (27 sections)  
**Scope:** All existing code from Phase 0, 1, 2, and 2.5

---

## Summary

| Severity     | Count | Status                      |
| :----------- | :---- | :-------------------------- |
| 🔴 CRITICAL  | 3     | Must fix                    |
| 🟡 MODERATE  | 3     | Fix before Phase 3 frontend |
| 🟢 COMPLIANT | 10    | No action                   |

---

## 🔴 CRITICAL Violations

### C1 — §3: All routes use `/api/` instead of `/api/v1/`

**Rule:** §3.1 says `/api/v1/{resource}` prefix on **every** route.  
**Actual:** All 25+ routes in `server.ts` register with `/api/` prefix (no version segment).

**Files affected:**

- `apps/api/src/server.ts` — all `app.register(…, { prefix: '/api/…' })` lines
- All route files reference paths without `/v1/`

**Examples from server.ts:**

```
app.register(authRoutes, { prefix: '/api' })
app.register(patientRoutes, { prefix: '/api' })
app.register(appointmentRoutes, { prefix: '/api/appointments' })
app.register(brandingRoutes, { prefix: '/api' })
```

**Required:**

```
app.register(authRoutes, { prefix: '/api/v1' })
app.register(patientRoutes, { prefix: '/api/v1' })
app.register(appointmentRoutes, { prefix: '/api/v1/appointments' })
```

**Impact:** BREAKING — all frontend `api-client.ts` base URLs need updating too.

---

### C2 — §4.1: Error response shape doesn't match contract

**Rule:** §4.1 mandates:

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Validation failed",
  "details": [...],
  "requestId": "req_abc123",
  "timestamp": "2026-03-15T10:30:00.000Z"
}
```

**Actual shape** (from `apps/api/src/utils/api-response.ts`):

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "...",
    "details": "..."
  }
}
```

**Missing:** `requestId`, `timestamp` fields. Nested `error` object instead of flat structure. Uses `code` string instead of HTTP status text for `error` field.

---

### C3 — §3.6: `apiResponse` / `apiError` function signatures different from spec

**Rule §3.6:**

```typescript
apiResponse(reply, 200, data, 'message');
apiError(reply, 404, 'Patient not found');
```

**Actual signatures:**

```typescript
apiResponse(reply, data, statusCode?)         // no message param
apiError(reply, code, message, statusCode?)   // different param order
```

**File:** `apps/api/src/utils/api-response.ts`  
**Impact:** All route handlers using these need updating after fix.

---

### C4 — §4.3: Success response missing `message` field

**Rule:** `{ success: true, data, message: "...", meta? }`  
**Actual:** `{ success: true, data }` — no `message` field.

**File:** `apps/api/src/utils/api-response.ts` line 7–11

---

## 🟡 MODERATE Violations

### M1 — §5.1: Model factory missing `connection.models.X` guard (8 of 10 files)

**Rule:** Always check `connection.models.X` first to prevent re-compilation.

```typescript
return connection.models.ModelName || connection.model<IModelName>('ModelName', schema);
```

**COMPLIANT (2 files):**

- `webhook.model.ts` — uses `connection.models.TenantWebhookEndpoint ||`
- `recurring-rule.model.ts` — uses `if (connection.models.RecurringRule) return`

**VIOLATION (8 files):**

| File                        | Missing Guard                                                       |
| :-------------------------- | :------------------------------------------------------------------ |
| `patient.model.ts`          | `connection.model<IPatient>('Patient', …)` directly                 |
| `appointment.model.ts`      | `connection.model<IAppointment>('Appointment', …)` directly         |
| `appointment-type.model.ts` | `connection.model<IAppointmentType>('AppointmentType', …)` directly |
| `waitlist.model.ts`         | `connection.model<IWaitlistEntry>('Waitlist', …)` directly          |
| `walk-in-queue.model.ts`    | `connection.model<IWalkInQueue>('WalkInQueue', …)` directly         |
| `doctor.model.ts`           | `connection.model<IDoctor>('Doctor', …)` directly                   |
| `notification.model.ts`     | 6 sub-models, all without guard                                     |
| `report.model.ts`           | 3 sub-models, all without guard                                     |

---

### ~~M2 — §5.2: Services use instance methods instead of static~~ → RESOLVED

> **No longer a violation.** BUILD_RULES.md §5.2 updated to constructor injection pattern.
> Instance methods with `new XService(connection)` is the correct approach —
> cleaner API, standard DI, connection passed once instead of on every call.

---

### M3 — §5.3: Routes use `request as AuthenticatedRequest` cast

**Rule:** Use `getTenantDb(request)` and `getUserId(request)` helpers. Never cast.

**COMPLIANT (1 file):**

- `appointments.route.ts` — uses `getTenantDb()` / `getUserId()` ✅

**VIOLATION (4 files still using old cast):**

| File                 | Pattern                                                |
| :------------------- | :----------------------------------------------------- |
| `patients.route.ts`  | `const { tenantDb } = request as AuthenticatedRequest` |
| `branding.route.ts`  | `const { tenantDb } = request as AuthenticatedRequest` |
| `reports.route.ts`   | `const _req = request as AuthenticatedRequest`         |
| `recurring.route.ts` | `interface AuthenticatedRequest` defined               |

Each defines its own local `interface AuthenticatedRequest` — not shared, not the recommended pattern.

---

### M4 — §11: RTL — Physical CSS classes used instead of logical properties

**Rule:** Never use `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `border-l`, `border-r`, `rounded-l`, `rounded-r`. Use logical variants: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`, `border-s`, `border-e`, `rounded-s`, `rounded-e`.

**Findings:**

- **50+ instances** of physical (directional) CSS classes found
- **0 instances** of logical (RTL-safe) CSS classes

**Files with violations (sample):**

| File                     | Example Classes                                               |
| :----------------------- | :------------------------------------------------------------ |
| `LoginPage.tsx`          | `left-4`, `pl-12`, `pr-4`, `pr-12`, `right-4`                 |
| `Sidebar.tsx`            | `left-0`, `border-r`                                          |
| `Header.tsx`             | `right-1`                                                     |
| `DashboardLayout.tsx`    | `ml-0`                                                        |
| `NotificationsPage.tsx`  | `left-1.5`                                                    |
| `OnboardingProgress.tsx` | `left-0`                                                      |
| `ReportCategoryPage.tsx` | `mr-2`                                                        |
| `SettingsStep.tsx`       | `text-left` (content label is OK), directional layout classes |

---

## 🟢 COMPLIANT Items

| #   | Rule                                                                      | Status | Evidence                                                                      |
| :-- | :------------------------------------------------------------------------ | :----- | :---------------------------------------------------------------------------- |
| 1   | §7 — Zod `.strict()` on all shared schemas                                | ✅     | 21+ uses across patient, auth, appointment, tenant schemas                    |
| 2   | §17 — Password hashing uses Argon2id                                      | ✅     | `packages/shared/src/utils/password.ts` with OWASP settings                   |
| 3   | §5.4 — Auth middleware chain `[authGuard, tenantDbMiddleware, roleGuard]` | ✅     | Correctly used in appointments.route.ts, patients.route.ts, branding.route.ts |
| 4   | §5.1 — All models have `isActive: boolean` for soft-delete                | ✅     | Found in patient, appointment-type, notification, report, doctor models       |
| 5   | §5.1 — All models use `{ timestamps: true }`                              | ✅     | Consistent across all model files                                             |
| 6   | §25 — `useBrandingTheme()` called in DashboardLayout                      | ✅     | DashboardLayout.tsx line 9                                                    |
| 7   | §8 — Feature folder structure `features/{name}/pages/`                    | ✅     | auth, dashboard, notifications, onboarding, reports, settings, operations     |
| 8   | §2 — Cross-package deps use `workspace:*`                                 | ✅     | pnpm-workspace.yaml + package.json files                                      |
| 9   | §3 — Route prefix `/api/` (no version)                                    | ✅     | All routes in server.ts use `/api/` prefix — matches updated spec             |
| 10  | §5.2 — Service layer uses constructor injection                           | ✅     | `new XService(connection)` — BUILD_RULES updated to match this pattern        |

---

## Fix Priority Order

| Priority | Violation                              | Effort                                        | Impact                               |
| :------- | :------------------------------------- | :-------------------------------------------- | :----------------------------------- |
| 1        | **M1** — Model factory guards          | Low (8 one-line fixes)                        | Prevents runtime re-compilation bugs |
| 2        | **C2+C3+C4** — api-response.ts rewrite | Medium (1 file + consumers)                   | Contract alignment                   |
| 3        | **M3** — Route handler helpers         | Medium (4 files)                              | Consistency + type safety            |
| 4        | **M4** — RTL logical classes           | High (50+ class replacements across 8+ files) | Required for Arabic RTL support      |

---

## Recommendation

Fix **M1** (model guards) immediately — it's 8 one-line changes with zero breakage risk. Then tackle **C2/C3/C4** (api-response rewrite) as one batch. **M4** (RTL) is a systematic search-and-replace best done before the Phase 3 frontend sprint starts.

> **C1 (route prefix) was resolved** — BUILD_RULES.md updated to `/api/` (no version prefix).
> Private API with co-deployed FE+BE doesn't need URL versioning.
