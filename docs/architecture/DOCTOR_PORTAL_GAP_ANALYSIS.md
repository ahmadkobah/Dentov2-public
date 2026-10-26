# Doctor Portal Gap Analysis and Implementation Plan

## Executive verdict

The doctor portal plan is directionally correct, but it is not complete yet.

The safest architecture is a separate frontend app, `apps/doctor`, backed by a dedicated backend route layer under `/api/doctor`. The existing admin app and generic tenant APIs contain many useful clinical screens and services, but they are not enough for a doctor-only portal because several routes currently rely on broad tenant RBAC or client-supplied filters. A doctor portal must enforce doctor ownership on the server for every list, detail, update, upload, and timeline endpoint.

The main missing piece is row-level access control: resolve the logged-in user to the tenant `Doctor` record via `Doctor.userId`, then scope every doctor portal request to that doctor. Sidebar filtering and frontend role checks are useful for UX, but they are not security.

## Current codebase evidence

| Area                       | Current state                                                                                                                                                                     | Meaning for doctor portal                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Workspace                  | `pnpm-workspace.yaml` already includes `apps/*`; Turbo tasks are generic.                                                                                                         | Adding `apps/doctor` fits the repo structure.                                                                       |
| Existing portals           | `apps/admin` and `apps/developer` are separate Vite React apps.                                                                                                                   | Doctor should follow the same app boundary instead of becoming an admin sidebar mode.                               |
| Old master plan            | `docs/architecture/DENTO_V2_MASTER_PLAN.md` describes Doctor Portal as `/admin/*` with role-filtered sidebar.                                                                     | This should be superseded for the current requirement, because the user wants doctor-only staff and no admin stuff. |
| Auth middleware            | `apps/api/src/tenant/middleware/auth-guard.ts` attaches JWT user context and tenant slug.                                                                                         | Doctor routes should reuse this middleware.                                                                         |
| Tenant DB middleware       | `apps/api/src/tenant/middleware/tenant-db.middleware.ts` attaches the tenant DB connection.                                                                                       | Doctor routes should use the same tenant database pattern.                                                          |
| RBAC                       | `apps/api/src/tenant/middleware/role-guard.ts` has a `dentist` role with broad clinical permissions and some read access to financial/admin modules.                              | RBAC is necessary, but not sufficient for own-doctor isolation.                                                     |
| Doctor identity            | `apps/api/src/tenant/models/doctor.model.ts` links a tenant doctor to a platform user through `Doctor.userId`.                                                                    | This is the correct identity bridge for the portal.                                                                 |
| Existing self-view pattern | `apps/api/src/tenant/routes/commissions/commissions.route.ts` has `/commissions/me` and resolves the current doctor by `Doctor.findOne({ userId })`.                              | Reuse this pattern across the doctor portal.                                                                        |
| API route registration     | `apps/api/src/server.ts` registers many `/api/...` routes, but no `/api/doctor` route.                                                                                            | Add a new doctor portal route tree.                                                                                 |
| Appointment routes         | `GET /api/appointments` and `GET /api/appointments/:id` use auth and tenant DB, but no role guard or doctor ownership check.                                                      | Doctor portal must not call these directly without a wrapper.                                                       |
| Appointment service        | `AppointmentService.listAppointments()` accepts `doctorId` from query and applies it directly.                                                                                    | Doctor portal must inject `doctorId` server-side, not trust the client.                                             |
| Patient model              | `Patient` has branch assignment, but no primary doctor or assigned doctors field.                                                                                                 | Define a patient access policy based on appointments/clinical records, or add explicit doctor assignment later.     |
| Patient service            | `PatientService.list()` and `getById()` are tenant-wide once the caller passes RBAC.                                                                                              | Doctor portal needs scoped patient list/detail functions.                                                           |
| Clinical services          | Treatment plans, procedure notes, prescriptions, X-rays, and CBCT support doctor-related filters in list methods, but detail/timeline reads are not consistently doctor-scoped.   | Add doctor-owned list/detail wrappers.                                                                              |
| Frontend auth              | `apps/admin/src/stores/auth.store.ts` uses memory-only access tokens and refresh cookie bootstrap.                                                                                | Doctor app should copy the tenant auth pattern, not the developer portal pattern.                                   |
| Frontend API client        | `apps/admin/src/lib/api-client.ts` injects Bearer token and `X-Tenant-Slug`, with silent refresh.                                                                                 | Doctor app should reuse this pattern.                                                                               |
| Login UX                   | `apps/admin/src/features/auth/pages/LoginPage.tsx` handles password login, 2FA, 2FA setup, recovery code, and session conflict.                                                   | Doctor app should reuse/adapt the flow and add dentist-role gating.                                                 |
| Admin sidebar              | `apps/admin/src/layouts/Sidebar/sidebar-permissions.ts` lets dentists see many modules, including invoices, payments, insurance, reports, doctors, attendance, and notifications. | Do not reuse the admin sidebar config as-is.                                                                        |
| Frontend i18n              | `apps/admin/src/stores/locale.store.ts` uses a custom Zustand locale store with bundled translations and API overrides.                                                           | Doctor app should use the same frontend pattern.                                                                    |
| Deployment                 | `docker-compose.yml` and `docker-compose.prod.yml` include admin and developer services only.                                                                                     | Add doctor frontend service and production image entries.                                                           |
| CORS/CSP                   | API CORS uses `CORS_ORIGIN`; frontend nginx uses CSP env placeholders.                                                                                                            | Add doctor origin and doctor nginx CSP config.                                                                      |
| E2E                        | `tests/e2e/playwright.config.ts` has developer and admin projects only.                                                                                                           | Add doctor auth setup and doctor project.                                                                           |

## Recommended architecture

### Use a separate app

Create `apps/doctor` as its own Vite React app.

Reasons:

- It matches the existing multi-portal structure: `apps/admin` and `apps/developer` are already separate apps.
- It prevents admin pages, routes, sidebar items, and accidental UX bleed from reaching doctors.
- It gives deployment, CSP, Sentry, routing, and E2E tests a clean boundary.
- It lets the doctor workflow be fast and clinical instead of a reduced admin dashboard.

Do not build this as only a role-filtered section inside `apps/admin`. The old master plan allowed that, but the current codebase and security requirements make a separate app cleaner and safer.

### Use a dedicated doctor API layer

Add a backend route tree like:

```text
/api/doctor/me
/api/doctor/me/dashboard
/api/doctor/me/appointments
/api/doctor/me/appointments/:id
/api/doctor/me/patients
/api/doctor/me/patients/:id
/api/doctor/me/patients/:id/timeline
/api/doctor/me/dental-charts/:patientId
/api/doctor/me/treatment-plans
/api/doctor/me/procedure-notes
/api/doctor/me/prescriptions
/api/doctor/me/xrays
/api/doctor/me/cbct
/api/doctor/me/lab-orders
/api/doctor/me/commissions
/api/doctor/me/schedule
/api/doctor/me/leave
/api/doctor/me/notifications
```

The route prefix should use `me` semantics because the doctor is always resolved from the token. The frontend should not send `doctorId` for doctor-owned resources.

### Add a doctor context guard

Create a reusable helper or middleware, for example:

```text
authGuard -> tenantDbMiddleware -> doctorPortalGuard -> handler
```

`doctorPortalGuard` should:

1. Require `request.user.role === 'dentist'`.
2. Resolve `Doctor.findOne({ userId: request.user.userId })` in the tenant DB.
3. Require the doctor profile to exist and be active.
4. Attach a small context object such as `request.currentDoctor = { id, userId, branchIds }`.
5. Return `403` for wrong role and `404` or `409` for a missing doctor profile.

This should be the root of all doctor portal API security.

## Backend gaps

### P0 - Own-doctor enforcement is missing

The existing RBAC matrix gives `dentist` broad clinical permissions. That answers "can this role use this module?" but not "is this doctor allowed to see this record?"

Required fix:

- Never accept `doctorId` from doctor portal query/body for scoped resources.
- Inject `doctorId = currentDoctor._id` in backend route handlers.
- For detail reads, fetch by both `_id` and ownership criteria, or fetch then verify ownership before returning.
- For updates, status changes, uploads, prescriptions, notes, and lab orders, verify ownership before mutation.
- For patient reads, verify the patient belongs to the doctor's accessible patient set.

Affected backend surfaces:

- Appointments: list, detail, create, update, status transitions, chair assignment.
- Patients: search, list, detail, medical history, timeline.
- Dental charts: patient chart read/update.
- Treatment plans: list, detail, create, update, status changes.
- Procedure notes: list, detail, create, update, sign/finalize if supported.
- Prescriptions: list, detail, create, update, issue/cancel if supported.
- Imaging: X-ray, CBCT, scans, upload metadata, presigned downloads.
- Lab orders: list, detail, create, update for orders requested by this doctor.
- Schedule/leave/attendance: current doctor only.
- Commissions: use the existing `/commissions/me` pattern or expose it under `/api/doctor/me/commissions`.
- Notifications: current user only; verify `userId` property consistency in notification routes.

### P0 - Define "my patients"

The patient model does not currently store `primaryDoctorId` or `assignedDoctorIds`; it only has branch assignment. A doctor portal needs a clear patient access rule.

Recommended first version:

```text
A patient is visible to the doctor if at least one active or historical clinical relationship exists:
- appointment.doctorId == currentDoctor._id
- treatmentPlan.doctorId == currentDoctor._id
- procedureNote.doctorId == currentDoctor._id
- prescription.doctorId == currentDoctor._id
- xray.doctorId == currentDoctor._id
- cbct.requestingDoctorId == currentDoctor._id
- labOrder.doctorId or requestedByDoctorId == currentDoctor._id, depending on model field
```

Optional later data-model improvement:

- Add `primaryDoctorId` and/or `assignedDoctorIds` to `Patient` if the clinic wants explicit long-term doctor assignment.
- Keep appointment/clinical-record checks even if explicit assignment is added, because historical care records still matter.

### P0 - Generic admin routes are too broad for the doctor portal

Examples found in the scan:

- `GET /api/appointments` accepts a client `doctorId` filter and does not force current doctor ownership.
- `GET /api/appointments/:id` returns any appointment by ID inside the tenant.
- Patient list/detail services are tenant-wide.
- Clinical detail and patient timeline endpoints often accept `patientId` without verifying the doctor has access to that patient.

The doctor portal can reuse service classes internally, but route handlers must add ownership filters before calling them or add dedicated scoped service methods.

### P1 - Dashboard must be doctor-specific

Do not reuse the admin dashboard aggregation as-is. Add `/api/doctor/me/dashboard` with only doctor-relevant aggregates:

- Today's appointments for current doctor.
- Waiting, arrived, in progress, completed, no-show counts.
- Next patient and current chair flow.
- Open procedure notes or unsigned clinical notes.
- Active treatment plans needing review.
- Imaging/lab results needing attention.
- Own commission summary only if the product allows doctors to view it.

### P1 - PHI audit logging needs explicit read coverage

The audit logger records mutations globally and the codebase has a helper for audited reads. Doctor portal patient detail, medical history, imaging, prescriptions, and timeline reads should be auditable because they expose PHI.

Required behavior:

- Log doctor identity, tenant, route, entity type, entity id, patient id where known, and action.
- Do not log sensitive field values into audit metadata.
- Keep audit log viewing admin-only.

### P1 - Imaging and file access must stay scoped

X-ray/CBCT metadata and presigned file access must verify doctor-patient access before returning a URL. A doctor should not be able to request a presigned download for another doctor's patient by guessing an image id.

### P1 - Notifications and sockets need doctor scoping

The existing notification API is user-scoped for common reads, which is good. For doctor portal:

- Subscribe the doctor frontend only to tenant and current-user channels it needs.
- Do not expose admin broadcast/template/log endpoints in the doctor app.
- Verify notification routes consistently read `request.user.userId` rather than `request.user.id`, because the JWT payload uses `userId`.

### P2 - Shared schemas and contracts should be added

Use `@dento/shared` for doctor portal DTOs and query schemas where the API and frontend both need the contract.

Suggested contracts:

- `doctorMeSchema`
- `doctorDashboardSchema`
- `doctorAppointmentQuerySchema`
- `doctorPatientQuerySchema`
- `doctorTimelineItemSchema`
- `doctorClinicalActionSchema`

Keep contracts focused. Do not duplicate every admin schema if the doctor route exposes a smaller surface.

## Frontend gaps

### P0 - New app scaffold

Create:

```text
apps/doctor/package.json
apps/doctor/index.html
apps/doctor/vite.config.ts
apps/doctor/vitest.config.ts
apps/doctor/tsconfig.json
apps/doctor/vite-env.d.ts
apps/doctor/src/main.tsx
apps/doctor/src/App.tsx
apps/doctor/src/router.tsx
apps/doctor/src/styles/globals.css
```

Use the same stack as admin/developer:

- React 19.
- Vite 6.
- React Router v7.
- React Query.
- Zustand.
- Tailwind v4.
- `@dento/ui`.
- `@dento/shared`.
- `lucide-react` icons.

Use port `3003` for local development to avoid admin `3000`, API `3001`, and developer `3002`.

### P0 - Doctor-only auth guard

Adapt the admin auth store and API client:

- Keep access token in memory only.
- Keep refresh token in HttpOnly cookie via `/api/auth/refresh`.
- Send `Authorization: Bearer ...` and `X-Tenant-Slug`.
- Bootstrap by refreshing, then calling `/api/doctor/me`.
- If the user role is not `dentist`, clear auth and show an access denied state.
- If there is no linked active doctor profile, show a clear "profile not configured" state and do not enter the app.

Do not copy the developer portal auth store because it is platform-specific and does not use tenant slug in the same way.

### P0 - Login flow must include existing security states

Reuse/adapt the admin login flow so the doctor app supports:

- Normal email/password login.
- Session conflict handling.
- 2FA challenge.
- First-time 2FA setup.
- Recovery codes.
- Language preference bootstrap.

After successful login, call `/api/doctor/me` before navigating to the dashboard. This confirms the doctor profile link and active status.

### P0 - Doctor-specific navigation

Do not reuse the admin sidebar config. Create a small doctor sidebar:

- Today.
- Appointments.
- Patients.
- Clinical timeline.
- Dental charts.
- Treatment plans.
- Procedure notes.
- Prescriptions.
- Imaging.
- Lab orders.
- My commissions, if enabled.
- Schedule and leave.
- Notifications.
- Profile.

Explicitly exclude:

- Users and roles.
- Tenant settings.
- Branch management.
- Subscription and billing setup.
- Platform/developer tools.
- Full financial reports.
- Inventory admin.
- Audit log viewer.
- Webhook settings.
- Role permission management.
- Pricing/module management.

### P1 - App-local feature folders

Follow the existing feature-based pattern:

```text
src/
  components/
  features/
    dashboard/
    appointments/
    patients/
    clinical-timeline/
    dental-charts/
    treatment-plans/
    procedure-notes/
    prescriptions/
    imaging/
    lab-orders/
    commissions/
    schedule/
    notifications/
    profile/
  hooks/
  i18n/
  layouts/
  lib/
  stores/
  styles/
```

Do not import directly from `apps/admin/src`. If a component or helper must be shared, move it into `packages/ui` or `packages/shared` first.

### P1 - React Query hooks should use doctor endpoints

Doctor hooks should call `/api/doctor/me/...`, not generic admin endpoints.

Examples:

- `useDoctorMe()` -> `/api/doctor/me`
- `useDoctorDashboard()` -> `/api/doctor/me/dashboard`
- `useDoctorAppointments()` -> `/api/doctor/me/appointments`
- `useDoctorPatient(patientId)` -> `/api/doctor/me/patients/:id`
- `useDoctorPatientTimeline(patientId)` -> `/api/doctor/me/patients/:id/timeline`

This prevents accidental client-side `doctorId` spoofing.

## Design gaps

The doctor portal should not feel like a stripped-down admin portal. It should be a clinical workspace.

### First screen

The first screen should be "Today" rather than a marketing-style dashboard:

- Appointment queue grouped by time/status.
- Current patient card.
- Next action buttons: open chart, start note, view imaging, write prescription.
- Chair/status flow for arrived, in progress, completed, no-show.
- Compact alerts for allergies, medical risks, unpaid balance warning if allowed, and pending lab/imaging results.

### Patient workspace

The patient page should be optimized for chairside work:

- Sticky patient summary with allergies and medical flags.
- Timeline with appointments, notes, charts, treatment plans, prescriptions, imaging, lab orders, consent forms.
- Fast tabs for chart, notes, prescriptions, imaging.
- Clear signed/finalized vs draft states.
- Minimal financial data unless explicitly allowed.

### Visual system

- Reuse `@dento/ui` primitives and composites.
- Use a clinic/doctor theme compatible with tenant branding, not developer blue.
- Keep density higher than a marketing site but calmer than an admin control center.
- Use icons for navigation and clinical actions.
- Support dark mode and Arabic RTL.
- Avoid nested card-heavy layouts; use full-width work surfaces and compact panels.
- Make tablet and mobile views practical for chairside usage.

## Translation and localization gaps

### Frontend

Use the existing custom locale-store pattern. Do not add i18next or another frontend translation system unless the whole product is migrated later.

Recommended structure:

```text
apps/doctor/src/i18n/bundled-translations.ts
apps/doctor/src/i18n/locales/en/*.ts
apps/doctor/src/i18n/locales/ar/*.ts
apps/doctor/src/stores/locale.store.ts
```

Requirements:

- Include both English and Arabic keys for every doctor portal screen.
- Keep RTL support through `document.documentElement.dir` and `lang`.
- Use the same fallback and API override behavior as admin if tenant-managed translations are desired.
- Namespace doctor keys with `doctor.*` or app-local namespaces to avoid admin key collisions.

### Backend

Keep the current backend pattern: inline bilingual objects like `{ en, ar }` for backend-emitted user-facing text such as notifications, socket messages, and seeded labels.

Do not introduce a second backend translation helper/catalog for doctor portal strings. This follows the user's constraint to avoid many translation approaches.

## Login and session plan

The doctor portal should reuse tenant auth, not create a separate auth system.

Required flow:

1. Doctor opens `apps/doctor`.
2. App bootstraps with `/api/auth/refresh`.
3. If refresh succeeds, call `/api/doctor/me`.
4. If user is not a dentist, deny access.
5. If dentist has no active linked `Doctor` profile, deny access with a setup message.
6. If valid, load doctor dashboard.
7. On login, handle 2FA/session-conflict exactly like admin, then call `/api/doctor/me` before navigation.

This keeps the security model consistent with the rest of the platform.

## Deployment gaps

Add doctor deployment artifacts:

```text
apps/doctor/Dockerfile
apps/doctor/nginx.conf
```

Update:

- `docker-compose.yml` with a `doctor` service for local container usage.
- `docker-compose.prod.yml` with a production doctor image/build entry.
- `infra/Caddyfile` if production routing is handled there.
- API `CORS_ORIGIN` to include the doctor portal origin.
- Doctor nginx CSP values, especially API connect origins and Sentry if enabled.
- CI build matrix if frontend images are built separately.
- Sentry project/env names if error tracking is enabled for the new app.

Suggested local dev ports:

- Admin: `3000`.
- API: `3001`.
- Developer: `3002`.
- Doctor: `3003`.

## Testing gaps

### API tests

Add contract/security tests for `/api/doctor/me/...`:

- Dentist can load own doctor profile.
- Non-dentist cannot load doctor portal endpoints.
- Dentist without linked `Doctor` profile is denied.
- Dentist cannot list another doctor's appointments by passing `doctorId`.
- Dentist cannot fetch another doctor's appointment by ID.
- Dentist cannot fetch a patient with no doctor relationship.
- Dentist can fetch a patient with an appointment or clinical record relationship.
- Dentist cannot fetch another doctor's X-ray/CBCT presigned file URL.
- Doctor dashboard counts only current doctor's data.
- PHI read audit records are created where required.

### Frontend unit/integration tests

- Auth bootstrap accepts dentist and rejects tenant admin/receptionist.
- Route guard blocks non-dentist users.
- Sidebar contains only doctor modules.
- Login handles 2FA, session conflict, missing doctor profile, and normal success.
- RTL layout smoke tests for Arabic.

### E2E tests

Update `tests/e2e/playwright.config.ts` with:

```text
doctor-auth
doctor
```

Add fixtures and specs:

```text
tests/e2e/fixtures/doctor-auth.setup.ts
tests/e2e/doctor/dashboard.spec.ts
tests/e2e/doctor/appointments.spec.ts
tests/e2e/doctor/patient-access.spec.ts
tests/e2e/doctor/no-admin-modules.spec.ts
```

Seed data must include at least two dentists and patients split between them to test negative access properly.

## Implementation phases

### Phase 0 - Final decisions and contracts

- Confirm whether doctors can create new patients or only view patients they have treated.
- Confirm whether doctors can reschedule/cancel appointments or only update clinical status.
- Confirm whether doctors can view own commissions.
- Confirm whether assistant/hygienist should ever use this portal later.
- Define the exact "my patients" policy.
- Add shared doctor portal schemas to `@dento/shared`.

### Phase 1 - Backend security foundation

- Add `doctorPortalGuard` or equivalent helper.
- Add `/api/doctor` route registration in `apps/api/src/server.ts`.
- Add `/api/doctor/me` profile endpoint.
- Add scoped appointment and patient endpoints.
- Add ownership helpers for patient access.
- Add API tests for positive and negative access.

### Phase 2 - Frontend shell and auth

- Scaffold `apps/doctor`.
- Add Vite config, package scripts, TypeScript config, test config.
- Add API client and memory-only auth store from the admin tenant pattern.
- Add login page with 2FA/session-conflict support.
- Add protected route guard that calls `/api/doctor/me`.
- Add doctor layout and sidebar.

### Phase 3 - Clinical read workflows

- Build Today dashboard.
- Build appointments list/detail.
- Build scoped patient list/detail/timeline.
- Build chart, treatment plan, note, prescription, and imaging read surfaces.
- Add Arabic keys and RTL checks as screens are built.

### Phase 4 - Clinical write workflows

- Add appointment status updates.
- Add procedure note drafting/finalization.
- Add prescriptions.
- Add treatment plan updates.
- Add imaging/lab order create flows if doctors should initiate them.
- Add audit coverage for PHI reads and clinical writes.

### Phase 5 - Deployment

- Add doctor Dockerfile and nginx config.
- Add compose/prod entries.
- Update CORS origins and CSP config.
- Add Sentry/env wiring.
- Add CI build/test wiring.

### Phase 6 - E2E and hardening

- Add doctor Playwright project and auth fixture.
- Add negative access tests with two doctors.
- Verify no admin navigation appears.
- Verify Arabic/RTL layout.
- Verify direct URL/API attempts are denied.
- Verify production CSP/CORS behavior.

## Definition of done

The doctor portal is complete only when all of the following are true:

- Doctors log in through `apps/doctor`, not through admin UI.
- Non-dentist roles cannot enter the doctor portal.
- A dentist without a linked active `Doctor` profile cannot enter the portal.
- Every doctor API endpoint resolves the current doctor server-side.
- The frontend never sends trusted `doctorId` for doctor-owned resources.
- A doctor cannot access another doctor's appointments, patients, clinical notes, imaging, lab orders, or files by changing URLs or IDs.
- Patient access policy is documented and enforced in API tests.
- PHI read/write audit behavior is covered.
- Sidebar and routes contain no admin-only modules.
- English and Arabic strings exist for all doctor screens.
- RTL layout is usable.
- Docker, compose, CORS, CSP, CI, and Playwright all include the doctor app.

## Final recommendation

Build the doctor portal as a separate `apps/doctor` frontend and a dedicated `/api/doctor/me` backend surface. Reuse existing services and UI packages where they fit, but put a strict doctor-context guard and scoped route handlers in front of them. The high-level plan was right, but without this backend scoping layer the portal would only be visually separated, not securely separated.
