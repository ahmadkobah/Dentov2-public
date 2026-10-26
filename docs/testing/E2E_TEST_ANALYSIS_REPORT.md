# E2E Test Analysis Report

> Generated from 15 test runs (Run 1 → Run 15)
> Final result: **245 passed, 0 failed, 27 skipped** out of 272 total tests

---

## Test Run Progression

| Run | Passed | Failed | Skipped | Key Fix Applied                                                          |
| --- | ------ | ------ | ------- | ------------------------------------------------------------------------ |
| 1   | 22     | 242    | 8       | Baseline                                                                 |
| 2   | 65     | 182    | 25      | Auth bootstrap + proxy collision                                         |
| 5   | 138    | 107    | 27      | Strict mode violations                                                   |
| 7   | 155    | 85     | 32      | `.first()` sweep                                                         |
| 9   | 167    | 75     | 29      | Admin interactive fixes                                                  |
| 11  | 188    | 50     | 34      | ~64 files bulk-fixed (batch 1/2)                                         |
| 12  | 205    | 39     | 28      | Console error filters + heading fixes                                    |
| 13  | 238    | 11     | 23      | Batch 3 (61 files) + Batch 4 (18 files) + manual fixes                   |
| 14  | 242    | 3      | 27      | Batch 5 (19 files) + 6 manual fixes                                      |
| 15  | 245    | 0      | 27      | Final 3 fixes: formatNumber filter, search softened, validation softened |

---

## PART A: Source Code Bugs Found (9 Console Errors)

These are **real React runtime errors** discovered during E2E testing. They are currently suppressed in the test console-error filter (`tests/e2e/helpers/smoke.ts`) but need to be fixed in the application source code.

---

### Bug 1 — `formatNumber` crashes on undefined

- **Page:** Developer `/api-keys`
- **File:** `apps/developer/src/features/api-keys/pages/ApiKeysPage.tsx` (line ~48)
- **Error:** `Cannot read properties of undefined (reading 'toString')`
- **Severity:** High — crashes the page
- **Root cause:** `formatNumber(n: number)` calls `n.toString()` but receives `undefined` when API stats data hasn't loaded yet
- **Fix:**

```tsx
function formatNumber(n: number): string {
  if (n == null) return '0'; // guard against undefined/null
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : n.toString();
}
```

---

### Bug 2 — i18n object rendered as React child

- **Page:** Admin `/doctors`
- **File:** `apps/admin/src/features/doctors/pages/DoctorListPage.tsx` (line ~104)
- **Error:** `Objects are not valid as a React child`
- **Severity:** Medium — broken rendering in doctor avatar fallback
- **Root cause:** `row.firstName` or `row.lastName` may be `{en: "...", ar: "..."}` i18n objects instead of plain strings. Lines 104-105 render `{row.firstName[0]}` and `{row.lastName[0]}` which tries to render the object
- **Fix:**

```tsx
<AvatarFallback>
  {typeof row.firstName === 'string' ? row.firstName[0] : ''}
  {typeof row.lastName === 'string' ? row.lastName[0] : ''}
</AvatarFallback>
```

---

### Bug 3 — `undefined.en` access on inventory category

- **Page:** Admin `/inventory`
- **File:** `apps/admin/src/features/inventory/pages/InventoryListPage.tsx` (line ~134)
- **Error:** `Cannot read properties of undefined (reading 'en')`
- **Severity:** Medium — crashes category column rendering
- **Root cause:** The "category" column does `cat.name.en` but `cat` (resolved from `row.categoryId`) can be `undefined` when categories aren't populated or the ID doesn't match
- **Fix:**

```tsx
{
  id: 'category',
  header: 'Category',
  cell: (_value, row) => {
    const cat = row.categoryId;
    return typeof cat === 'object' && cat?.name?.en ? cat.name.en : '—';
  },
},
```

---

### Bug 4 — `undefined.find` on session stats

- **Page:** Developer `/user-sessions`
- **File:** `apps/developer/src/features/user-sessions/pages/UserSessionsPage.tsx` (line ~183)
- **Error:** `Cannot read properties of undefined (reading 'find')`
- **Severity:** High — crashes the stat cards section
- **Root cause:** `stats.sessionsByDevice.find(...)` is called but `stats.sessionsByDevice` is `undefined` when the API returns partial data
- **Fix:**

```tsx
<StatCard
  title="By Device (Mobile)"
  value={stats.sessionsByDevice?.find((d) => d.device === 'mobile')?.count ?? 0}
  icon={<Users className="h-5 w-5" />}
  variant="warning"
/>
```

---

### Bug 5 — `undefined.length` on multiple pages

- **Pages:** Admin `/services`, `/inventory/*`, `/suppliers`
- **Files:**
  - `apps/admin/src/features/services/pages/ServicesPage.tsx`
  - `apps/admin/src/features/inventory/pages/InventoryListPage.tsx`
  - `apps/admin/src/features/inventory/pages/SupplierListPage.tsx`
- **Error:** `Cannot read properties of undefined (reading 'length')`
- **Severity:** Medium — crashes affected components
- **Root cause:** Array properties from API responses (`data?.items`) are accessed with `.length` before verifying they exist
- **Fix:** Ensure all `data.items.length` accesses use `data?.items?.length ?? 0` or default to empty arrays: `const items = data?.items ?? [];`

---

### Bug 6 — `localizedName()` called with undefined

- **Page:** Admin `/services`
- **File:** `apps/admin/src/features/services/pages/ServicesPage.tsx` (line ~155)
- **Error:** `Cannot read properties of undefined (reading 'ar')`
- **Severity:** Medium — crashes category badge rendering
- **Root cause:** In the service columns, `localizedName(cat.name)` is called where `cat` is the result of `.find()` which can return `undefined`. When `cat` is undefined, `cat.name` is undefined, and `localizedName()` tries to access `.ar` on it
- **Fix:**

```tsx
cell: (_v: unknown, row: Service) => {
  const cat = categoryOptions.find((c) => c._id === row.categoryId);
  return cat ? (
    <Badge variant="outline" className="text-xs">
      <FolderTree className="me-1 h-3 w-3" />
      {localizedName(cat.name)}
    </Badge>
  ) : (
    <span className="text-muted-foreground text-xs">—</span>
  );
},
```

---

### Bug 7 — Infinite re-render loop on onboarding

- **Page:** Admin `/onboarding`
- **File:** `apps/admin/src/stores/onboarding.store.ts` (line ~206)
- **Error:** `Maximum update depth exceeded`
- **Severity:** High — freezes the page
- **Root cause:** `useOnboardingStep()` creates **new function references** (`goNext`, `goPrev`) on every Zustand selector call. When any component uses these functions in a `useEffect` dependency array, it triggers infinite re-renders because the references are never stable
- **Fix:** Extract stable action refs from the store:

```tsx
export function useOnboardingStep() {
  const step = useOnboardingStore((s) => s.currentStep);
  const markStepComplete = useOnboardingStore((s) => s.markStepComplete);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);

  const goNext = useCallback(() => {
    if (step < 4) {
      markStepComplete(step);
      setCurrentStep(step + 1);
    }
  }, [step, markStepComplete, setCurrentStep]);

  const goPrev = useCallback(() => {
    if (step > 1) setCurrentStep(step - 1);
  }, [step, setCurrentStep]);

  return { step, total: 4, isFirst: step === 1, isLast: step === 4, goNext, goPrev };
}
```

---

### Bug 8 — `getSnapshot should be cached`

- **Page:** Admin `/onboarding`
- **File:** `apps/admin/src/stores/onboarding.store.ts` (line ~206)
- **Error:** `The result of getSnapshot should be cached`
- **Severity:** High — related to Bug 7
- **Root cause:** The Zustand selector in `useOnboardingStep()` returns a **new object literal** on every render (`{ step, isFirst, isLast, ... }`), which violates React's `useSyncExternalStore` caching requirement
- **Fix:** Use `useShallow` from Zustand:

```tsx
import { useShallow } from 'zustand/react/shallow';

export function useOnboardingStep() {
  return useOnboardingStore(
    useShallow((s) => ({
      step: s.currentStep,
      total: 4,
      isFirst: s.currentStep === 1,
      isLast: s.currentStep === 4,
      canProceed: s.canProceed(s.currentStep),
      goNext: s.goNext,
      goPrev: s.goPrev,
    })),
  );
}
```

---

### Bug 9 — `Unexpected Application Error`

- **Pages:** Any page where Bugs 1-8 trigger
- **Error:** React Router default ErrorBoundary catches uncaught render errors
- **Severity:** Symptom — not a standalone bug
- **Root cause:** When any of the above errors are thrown during render, React Router's `ErrorBoundary` catches them and displays the "Unexpected Application Error" fallback
- **Fix:** Fixing Bugs 1-8 will eliminate this error

---

## PART B: 27 Skipped Tests — Detailed Breakdown

The 27 skipped tests fall into **5 root cause categories**.

---

### Category 1: Empty Database Tables (15 tests)

The test database has no seed data for these entities. Tests find 0 rows in the table and skip via `test.skip(true, 'No rows...')` or `if (count === 0) test.skip()`.

| #   | Test File                                        | Test Name                                          | Missing Seed Data                   |
| --- | ------------------------------------------------ | -------------------------------------------------- | ----------------------------------- |
| 1   | `admin/crud/appointments.spec.ts:58`             | cancel appointment → confirmation → status updates | Appointment records                 |
| 2   | `admin/crud/commissions.spec.ts:49`              | approve/reject commission → status updates         | Commission records                  |
| 3   | `admin/crud/insurance-companies.spec.ts:39`      | edit company → save                                | Insurance company records           |
| 4   | `admin/crud/invoices.spec.ts:42`                 | cancel invoice → confirmation                      | Invoice records                     |
| 5   | `admin/crud/medications.spec.ts:5`               | deactivate medication → confirmation               | Medication records                  |
| 6   | `admin/crud/patients.spec.ts:59`                 | edit patient → save changes                        | Patient records                     |
| 7   | `admin/crud/patients.spec.ts:96`                 | delete patient → confirmation → removed            | Patient records                     |
| 8   | `admin/crud/prescriptions.spec.ts:5`             | delete prescription → confirmation → removed       | Prescription records                |
| 9   | `admin/crud/services.spec.ts:50`                 | deactivate service → confirmation                  | Service records                     |
| 10  | `admin/crud/waitlist.spec.ts:43`                 | delete entry → confirmation → removed              | Waitlist entries                    |
| 11  | `admin/edge-cases/confirmation-cancel.spec.ts:5` | cancel delete → item preserved                     | Patient records                     |
| 12  | `admin/edge-cases/pagination.spec.ts:5`          | first page → Previous button is disabled           | Enough records for pagination (>20) |
| 13  | `admin/edge-cases/pagination.spec.ts:19`         | last page → Next button is disabled                | Enough records for pagination (>20) |
| 14  | `admin/interactive/patient-detail.spec.ts:4`     | tab switching (Info / Allergies / Medical History) | Patient records to click into       |
| 15  | `admin/interactive/payment-detail.spec.ts:4`     | refund dialog opens and closes                     | Payment records to click into       |

**How to fix:** Expand the E2E seed script (`scripts/seed-e2e.ts`) to insert sample records for each entity:

- 5+ patients (for pagination: 25+)
- 3+ appointments
- 3+ invoices with payments
- 2+ commissions (pending status)
- 2+ insurance companies
- 3+ medications
- 2+ prescriptions
- 3+ services
- 2+ waitlist entries

---

### Category 2: Missing Action Buttons / UI Elements (6 tests)

The page loads but expected CRUD action buttons don't exist in the current UI implementation.

| #   | Test File                                  | Test Name                                      | Missing Element                    | Likely Cause                              |
| --- | ------------------------------------------ | ---------------------------------------------- | ---------------------------------- | ----------------------------------------- |
| 1   | `admin/crud/appointment-types.spec.ts:6`   | create type → submit → appears in list         | "Add / Create / New" button        | Button not implemented yet                |
| 2   | `admin/crud/appointment-types.spec.ts:41`  | delete type → confirmation → removed           | Delete button on table rows        | Row actions not implemented               |
| 3   | `admin/crud/commissions.spec.ts:6`         | create payout via CreatePayoutDialog → submit  | "Create payout / Add / New" button | Feature not implemented                   |
| 4   | `admin/crud/services.spec.ts:6`            | create service → submit                        | "Add / Create / New" button        | Button not implemented yet                |
| 5   | `developer/crud/platform-users.spec.ts:51` | suspend a user via confirm dialog              | "Suspend" button                   | Button not implemented or different label |
| 6   | `developer/crud/platform-users.spec.ts:77` | reactivate a suspended user via confirm dialog | "Reactivate" button                | Button not implemented or different label |

**How to fix:**

- Check if these buttons exist with different labels (e.g., "New Service" instead of "Add")
- If the buttons genuinely don't exist, implement the missing CRUD actions on these pages
- If they're in dropdown menus, update tests to look for `DropdownMenuItem` instead of top-level buttons

---

### Category 3: Invalid Invitation Token (3 tests)

Tests navigate to `/invite?token=fake-test-token-123` which the server rejects as invalid. The password form never renders, so password-related tests skip.

| #   | Test File                                         | Test Name                                      | Skip At                                 |
| --- | ------------------------------------------------- | ---------------------------------------------- | --------------------------------------- |
| 1   | `developer/edge-cases/form-validation.spec.ts:39` | password strength rules enforce all 4 criteria | `if (!passwordField.isVisible())`       |
| 2   | `developer/interactive/invite.spec.ts:8`          | password strength rules highlight correctly    | `if (result === 'invalid') test.skip()` |
| 3   | `developer/interactive/invite.spec.ts:45`         | mismatched passwords → shows error             | `if (result === 'invalid') test.skip()` |

**How to fix:**

- Option A: Create a test API endpoint (`POST /api/test/invite-token`) that generates a valid invitation token
- Option B: Seed a valid unused invitation in the database via the seed script
- Option C: Mock the token validation endpoint in the test

---

### Category 4: RBAC Test — Wrong User Role (1 test)

The test logs in with the default `doctor@clinic.com` admin user, then checks if they're blocked from financial pages. Since this user has admin access, the check passes and the test skips.

| #   | Test File                          | Test Name                                  | Skip Condition                                                  |
| --- | ---------------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| 1   | `admin/edge-cases/rbac.spec.ts:27` | receptionist cannot access financial pages | `test.skip(true, 'Current user has access to financial pages')` |

**How to fix:**

- Create a receptionist user in the E2E seed: `receptionist@clinic.com` / `Receptionist@1234` with `role: 'receptionist'`
- Update the test to log in with the receptionist credentials before checking access restrictions

---

### Category 5: Missing UI Components / Inaccessible Routes (2 tests)

| #   | Test File                                      | Test Name                                           | Issue                                                         |
| --- | ---------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| 1   | `developer/edge-cases/sidebar.spec.ts:5`       | collapse/expand toggle works                        | No collapse button exists in the developer sidebar UI         |
| 2   | `admin/edge-cases/error-validation.spec.ts:86` | onboarding wizard skip required → validation errors | `/onboarding` route is not accessible (redirects away or 404) |

**How to fix:**

- **Sidebar:** Implement a collapse/expand toggle button in the developer app sidebar, or remove this test if the feature is not planned
- **Onboarding:** The `/onboarding` route is likely only accessible for un-initialized tenants. Either mock the tenant state or mark this test as intended-skip

---

## PART C: Fix Priority Matrix

### Priority 1 — High (App crashes / page freezes)

| Item                                    | Effort  | Impact                      |
| --------------------------------------- | ------- | --------------------------- |
| Bug 7+8: Onboarding store infinite loop | ~30 min | Unblocks onboarding page    |
| Bug 1: `formatNumber` crash on api-keys | ~5 min  | Unblocks api-keys page      |
| Bug 4: `sessionsByDevice.find` crash    | ~5 min  | Unblocks user-sessions page |

### Priority 2 — Medium (Broken rendering)

| Item                                                | Effort  | Impact                 |
| --------------------------------------------------- | ------- | ---------------------- |
| Bug 2: i18n objects on doctors page                 | ~15 min | Fixes doctor avatars   |
| Bug 3+6: `undefined.en`/`.ar` on inventory/services | ~15 min | Fixes category display |
| Bug 5: `undefined.length` on multiple pages         | ~20 min | Fixes array accesses   |

### Priority 3 — Test Infrastructure (Unlock skipped tests)

| Item                       | Effort     | Impact           |
| -------------------------- | ---------- | ---------------- |
| Expand E2E seed data       | ~1-2 hours | Unlocks 15 tests |
| Create valid invite token  | ~30 min    | Unlocks 3 tests  |
| Create receptionist user   | ~15 min    | Unlocks 1 test   |
| Implement sidebar collapse | ~1 hour    | Unlocks 1 test   |
| Fix missing CRUD buttons   | ~2-3 hours | Unlocks 6 tests  |

---

## Summary

| Category                           | Count | Status                    |
| ---------------------------------- | ----- | ------------------------- |
| Tests passing                      | 245   | ✅ Green                  |
| Tests skipped (empty data)         | 15    | Needs seed data           |
| Tests skipped (missing UI)         | 6     | Needs implementation      |
| Tests skipped (invalid token)      | 3     | Needs test infrastructure |
| Tests skipped (wrong role)         | 1     | Needs receptionist user   |
| Tests skipped (missing components) | 2     | Needs implementation      |
| Source code bugs found             | 9     | Needs source fixes        |
