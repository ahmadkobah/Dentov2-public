# Mock Data Removal — Implementation Plan

> Generated: 2026-03-03  
> Scope: 6 items with mock/hardcoded/simulated data across the admin portal  
> Goal: Replace all mock data with real API-backed hooks

---

## Audit Summary

| #   | Item                      | Mock Type                         | Hook?              | API Route? | What's Missing                          |
| --- | ------------------------- | --------------------------------- | ------------------ | ---------- | --------------------------------------- |
| 1   | DailyOpsPage              | Fully mock                        | ❌ No              | ✅ Yes     | Hooks + wiring                          |
| 2   | NotificationsPage         | Fully mock                        | ❌ No              | ✅ Yes     | Hooks + wiring                          |
| 3   | DashboardPage             | Mixed (hooks imported but unused) | ✅ Yes (unused)    | ✅ Yes     | Wire existing hooks, remove mock arrays |
| 4   | SettingsPage (GeneralTab) | Hardcoded defaults                | ⚠️ Partial         | ✅ Yes     | `useTenantSettings` hook + wiring       |
| 5   | OnboardingPage            | Simulated API (`setTimeout`)      | ❌ No              | ❌ No      | API route + mutation hook + wiring      |
| 6   | ChatInput.tsx             | TODO file upload                  | ✅ Yes (`useChat`) | ✅ Yes     | File upload `onClick` wiring            |

> **Item 7 (Reports fallback)** — `FREE_REPORT_CHART_DATA` in `report-catalog.config.ts` is a graceful fallback for when the API fails. The reports feature is fully wired with real hooks and routes. **No action needed.**

---

## Phase 1 — Quick Wins (wiring only, no new backend)

These items already have both API routes AND hooks. Only the frontend page needs to be updated.

---

### Step 1.1 — DashboardPage: Wire existing hooks ⏱️ ~1 hour

**File:** `apps/admin/src/features/dashboard/pages/DashboardPage.tsx`

**Current state:**

- Imports `useDashboardStats()` and `useDashboardTrends()` from `../../reports/hooks/useReports`
- BUT renders from hardcoded arrays: `dashboardStats`, `todayAppointments`, `revenueData`
- Comment says: `// MOCK DATA per ADMIN_PORTAL_SCREENS.md §2`

**Existing backend:**

- `GET /api/dashboard/stats` → DashboardService
- `GET /api/dashboard/trends` → DashboardService

**Steps:**

1. Call `useDashboardStats()` and `useDashboardTrends()` (already imported)
2. Replace `dashboardStats` constant with `stats.data` from the hook
3. Replace `todayAppointments` constant with real appointment data (may need a `useTodayAppointments()` hook calling `GET /api/appointments?date=today`)
4. Replace `revenueData` constant with `trends.data` from the hook
5. Add loading/error states (`DashboardSkeleton`, `ErrorState`)
6. Delete all `// MOCK DATA` blocks (~40 lines)

**Definition of done:** Dashboard page shows real data from API, zero hardcoded arrays remain.

---

### Step 1.2 — ChatInput: Wire file upload ⏱️ ~30 min

**File:** `apps/admin/src/layouts/ChatPanel/ChatInput.tsx`

**Current state:**

- `// TODO: Wire file upload via POST /api/chat/upload`
- Attach button exists in UI but has no `onClick` handler
- Text messaging is fully wired

**Existing backend:**

- `POST /api/chat/upload` → returns pre-signed URL
- `POST /api/uploads/presign` → alternative upload route

**Existing hook:**

- `useChat.ts` already has upload mutations

**Steps:**

1. Add hidden `<input type="file">` ref
2. Wire attach button `onClick` → trigger file input
3. On file select → call chat upload mutation from `useChat`
4. Show attachment preview/progress in the input area
5. On send → include attachment URL in the message payload

**Definition of done:** User can click attach, select a file, see preview, and send it. File is uploaded via the real API.

---

## Phase 2 — New Hooks Required (backend exists, hooks missing)

These items have API routes on the backend but lack frontend hooks.

---

### Step 2.1 — NotificationsPage: Create hooks + wire ⏱️ ~2 hours

**File:** `apps/admin/src/features/notifications/pages/NotificationsPage.tsx`

**Current state:**

- `mockNotifications` array with 10 hardcoded notification objects
- `useState(mockNotifications)` for local state
- No API calls at all

**Existing backend (11 endpoints):**

- `GET /api/notifications` — list with pagination/filters
- `GET /api/notifications/unread-count` — badge count
- `PATCH /api/notifications/:id/read` — mark one as read
- `PATCH /api/notifications/read-all` — mark all as read
- `PATCH /api/notifications/:id/dismiss` — dismiss
- `POST /api/notifications/send` — push notification
- `GET /api/notifications/templates` — notification templates
- `POST /api/notifications/templates` — create template
- `GET /api/notifications/logs` — delivery logs
- `GET /api/notifications/preferences` — user preferences
- `PATCH /api/notifications/preferences` — update preferences

**Steps:**

1. Create `apps/admin/src/features/notifications/hooks/useNotifications.ts`
2. Implement hooks:
   - `useNotificationList(filters)` → `GET /api/notifications`
   - `useUnreadCount()` → `GET /api/notifications/unread-count`
   - `useMarkAsRead()` → `PATCH /api/notifications/:id/read` (mutation)
   - `useMarkAllAsRead()` → `PATCH /api/notifications/read-all` (mutation)
   - `useDismissNotification()` → `PATCH /api/notifications/:id/dismiss` (mutation)
3. Update `NotificationsPage.tsx`:
   - Replace `useState(mockNotifications)` with `useNotificationList()` query
   - Wire "Mark as read" button → `useMarkAsRead` mutation
   - Wire "Mark all read" button → `useMarkAllAsRead` mutation
   - Wire dismiss/delete → `useDismissNotification` mutation
   - Add unread badge via `useUnreadCount()`
   - Add loading/error/empty states
4. Delete `mockNotifications` array
5. Write unit test for the hooks

**Definition of done:** Notifications page loads from API, mark-read/dismiss are real mutations, no mock data.

---

### Step 2.2 — DailyOpsPage: Create hooks + wire ⏱️ ~3–4 hours

**File:** `apps/admin/src/features/operations/pages/DailyOpsPage.tsx` (~987 lines)

**Current state (fully mock):**

- `mockStats` — 4 stat objects (patients today, avg wait, chair utilization, revenue)
- `mockDoctors` — 3 doctor objects with status/load
- `mockChairs` — 5 dental chair objects with status
- `mockQueue` — 6+ walk-in queue entries
- All in `useState()` with no API calls

**Existing backend:**

- `GET /api/walk-in-queue` — current queue list
- `GET /api/walk-in-queue/stats` — queue statistics
- `POST /api/walk-in-queue` — register walk-in
- `PATCH /api/walk-in-queue/:id/call|start|complete|no-show|cancel` — status transitions
- `GET /api/appointments?date=today` — today's appointments
- `GET /api/schedules` — doctor schedules
- `GET /api/users?role=doctor` — doctor list

**Steps:**

1. Create `apps/admin/src/features/operations/hooks/useDailyOps.ts`
2. Implement hooks:
   - `useWalkInQueue()` → `GET /api/walk-in-queue` (with auto-refetch every 30s)
   - `useQueueStats()` → `GET /api/walk-in-queue/stats`
   - `useRegisterWalkIn()` → `POST /api/walk-in-queue` (mutation)
   - `useUpdateQueueStatus()` → `PATCH /api/walk-in-queue/:id/:action` (mutation)
   - `useTodayAppointments()` → `GET /api/appointments?date=today`
   - `useDoctorSchedules()` → `GET /api/schedules?date=today`
3. Update `DailyOpsPage.tsx`:
   - Replace `useState(mockQueue)` with `useWalkInQueue()`
   - Replace `mockStats` with `useQueueStats()` data
   - Replace `mockDoctors` with `useDoctorSchedules()` data
   - Replace `mockChairs` with queue data (derive chair status from queue)
   - Wire "Register" button → `useRegisterWalkIn()`
   - Wire "Call"/"Start"/"Complete"/"No-show" buttons → `useUpdateQueueStatus()`
   - Add loading/error states for each section
4. Delete all mock arrays (~100 lines)
5. Write unit tests for hooks

**Definition of done:** DailyOps page is fully API-backed, queue updates are real mutations, auto-refreshes.

---

### Step 2.3 — SettingsPage: Create tenant settings hook + wire ⏱️ ~2 hours

**File:** `apps/admin/src/features/settings/pages/SettingsPage.tsx`

**Current state:**

- GeneralTab has hardcoded `useState()` values: `clinicName: 'Cairo Smile Dental Clinic'`, phone, email, address, `workingHours` (7-day array)
- BrandingTab uses `useBrandingStore()` (Zustand local state — not API-backed either)
- SessionsTab and CustomFieldsTab are properly wired

**Existing backend:**

- `GET /api/tenant-settings` — all settings
- `GET /api/tenant-settings/:key` — single setting (keys: `clinic`, `appointment`, `billing`, `notifications`, `security`, `inventory`)
- `PATCH /api/tenant-settings/:key` — update setting
- `POST /api/tenant-settings/:key/reset` — reset to default
- `POST /api/tenant-settings/seed` — seed defaults

**Steps:**

1. Create `apps/admin/src/features/settings/hooks/useTenantSettings.ts`
2. Implement hooks:
   - `useTenantSettings()` → `GET /api/tenant-settings` (all settings)
   - `useTenantSetting(key)` → `GET /api/tenant-settings/:key` (single)
   - `useUpdateTenantSetting()` → `PATCH /api/tenant-settings/:key` (mutation)
   - `useResetTenantSetting()` → `POST /api/tenant-settings/:key/reset` (mutation)
3. Update `SettingsPage.tsx` GeneralTab:
   - Replace hardcoded `useState({ clinicName: '...' })` with `useTenantSetting('clinic')` query
   - Replace hardcoded `workingHours` with `useTenantSetting('appointment')` query
   - Wire "Save" button → `useUpdateTenantSetting()` mutation
   - Add loading/error states
4. Update BrandingTab:
   - Consider migrating `useBrandingStore` → API-backed setting OR keep as is if branding is local
5. Delete hardcoded clinic defaults
6. Write unit tests for hooks

**Definition of done:** GeneralTab loads settings from API and saves via mutation. No hardcoded clinic data.

---

## Phase 3 — Full Stack (new backend route required)

---

### Step 3.1 — OnboardingPage: Create API route + hook + wire ⏱️ ~3–4 hours

**File:** `apps/admin/src/features/onboarding/pages/OnboardingPage.tsx`

**Current state:**

- Multi-step wizard collects: clinic info, branch, admin user, settings
- Submit handler builds payload `{ clinic, branch, admin, settings }`
- Then: `// TODO: API call to create tenant using payload`
- Then: `await new Promise(r => setTimeout(r, 2000))` — fake 2-second delay

**Existing backend:** ❌ No onboarding route exists

**Steps:**

#### Backend (API):

1. Create `apps/api/src/tenant/routes/onboarding/onboarding.route.ts`
2. Implement `POST /api/onboarding` endpoint:
   - Validate payload schema (clinic, branch, admin, settings)
   - Create/update tenant record in database
   - Create default branch
   - Create admin user (or link existing)
   - Seed default settings via `POST /api/tenant-settings/seed` internally
   - Return success with tenant ID + redirect URL
3. Add request validation schema (Zod/TypeBox)
4. Register route in the server plugin chain
5. Write route tests

#### Frontend (Admin):

6. Create `apps/admin/src/features/onboarding/hooks/useOnboarding.ts`
7. Implement `useCreateTenant()` mutation → `POST /api/onboarding`
8. Update `OnboardingPage.tsx`:
   - Replace `setTimeout` simulation with `useCreateTenant.mutateAsync(payload)`
   - Handle success → redirect to dashboard
   - Handle error → show error toast, stay on form
   - Add proper loading state during submission
9. Delete the `setTimeout` line and TODO comment
10. Write unit tests

**Definition of done:** Onboarding wizard submits to real API, creates tenant, and redirects on success.

---

## Execution Order & Dependencies

```
Phase 1 (no dependencies, start immediately)
├── Step 1.1 — DashboardPage wiring          ~1h    [EASY]
└── Step 1.2 — ChatInput file upload          ~30m   [EASY]

Phase 2 (create hooks, can run in parallel)
├── Step 2.1 — NotificationsPage hooks        ~2h    [MEDIUM]
├── Step 2.2 — DailyOpsPage hooks             ~3-4h  [MEDIUM-HARD]
└── Step 2.3 — SettingsPage hooks             ~2h    [MEDIUM]

Phase 3 (requires backend work)
└── Step 3.1 — OnboardingPage full stack      ~3-4h  [HARD]
```

---

## Total Estimated Effort

| Phase                | Items       | Effort          |
| -------------------- | ----------- | --------------- |
| Phase 1 — Quick Wins | 2 items     | ~1.5 hours      |
| Phase 2 — New Hooks  | 3 items     | ~7 hours        |
| Phase 3 — Full Stack | 1 item      | ~4 hours        |
| **Total**            | **6 items** | **~12.5 hours** |

---

## Per-Step Checklist Template

For each step, follow this workflow:

- [ ] Create hook file with TanStack Query hooks
- [ ] Follow existing hook patterns (see `usePatientList` for reference)
- [ ] Update page to import and use new hooks
- [ ] Add loading state (skeleton/spinner)
- [ ] Add error state (`ErrorState` component)
- [ ] Add empty state (`EmptyState` component)
- [ ] Delete all mock/hardcoded data
- [ ] Verify no `mock`, `MOCK`, `hardcoded`, `TODO` comments remain
- [ ] Run `pnpm typecheck` — zero errors
- [ ] Run `pnpm test` — all tests pass
- [ ] Run `pnpm build` — 5/5 clean build
- [ ] Manual smoke test in browser

---

## Files to Create

| File                                                   | Phase | Purpose                              |
| ------------------------------------------------------ | ----- | ------------------------------------ |
| `features/notifications/hooks/useNotifications.ts`     | 2.1   | Notification list/read/dismiss hooks |
| `features/operations/hooks/useDailyOps.ts`             | 2.2   | Walk-in queue, stats, schedule hooks |
| `features/settings/hooks/useTenantSettings.ts`         | 2.3   | Tenant settings CRUD hooks           |
| `features/onboarding/hooks/useOnboarding.ts`           | 3.1   | Create tenant mutation hook          |
| `api/src/tenant/routes/onboarding/onboarding.route.ts` | 3.1   | Onboarding API endpoint              |

## Files to Modify

| File                                                 | Phase | Changes                                            |
| ---------------------------------------------------- | ----- | -------------------------------------------------- |
| `features/dashboard/pages/DashboardPage.tsx`         | 1.1   | Remove ~40 lines of mock data, wire existing hooks |
| `layouts/ChatPanel/ChatInput.tsx`                    | 1.2   | Add file picker + upload handler                   |
| `features/notifications/pages/NotificationsPage.tsx` | 2.1   | Remove mock array, use new hooks                   |
| `features/operations/pages/DailyOpsPage.tsx`         | 2.2   | Remove ~100 lines of mock data, use new hooks      |
| `features/settings/pages/SettingsPage.tsx`           | 2.3   | Remove hardcoded defaults, use new hook            |
| `features/onboarding/pages/OnboardingPage.tsx`       | 3.1   | Replace setTimeout with real mutation              |
| `api/src/server.ts`                                  | 3.1   | Register onboarding route                          |

---

## Risk Notes

1. **DailyOpsPage is the largest change** (987 lines) — consider splitting into sub-components during refactor
2. **OnboardingPage** requires a new API route — coordinate with DB schema for tenant creation flow
3. **DashboardPage** `todayAppointments` may need a dedicated endpoint if `GET /api/appointments?date=today` doesn't return the right shape
4. **SettingsPage BrandingTab** uses Zustand store — decide whether to keep local state or migrate to API
5. **Reports fallback** (`FREE_REPORT_CHART_DATA`) is a safe fallback pattern — removing it could cause blank charts on API failure. **Recommend keeping it.**
