# Frontend ↔ Backend Audit & E2E Test Plan

> Created: March 5, 2026
> Scope: Developer Portal (23 features, 80+ API endpoints)

---

## Phase 1 — Fix All Remaining Response Shape Mismatches

**Effort: ~30 min | Files: ~4 | Risk: Low**

The frontend consistently expects this envelope:

```jsonc
// List endpoints
{ "success": true, "data": [ ...items ], "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 } }

// Single / stats endpoints
{ "success": true, "data": { ...object } }
```

Frontend hooks use `select: (res) => ({ items: res.data, meta: res.meta })` for lists and `select: (res) => res.data` for objects. Any backend endpoint that wraps data differently crashes the UI.

### Already Fixed ✅

| Endpoint                                | Issue                             | Commit  |
| --------------------------------------- | --------------------------------- | ------- |
| `GET /api/platform/pricing` prefix      | Wrong prefix `/api/pricing`       | e395ebc |
| `GET /api/platform/pricing/modules`     | Missing endpoint                  | 576b081 |
| `GET /api/platform/pricing/stats`       | Missing endpoint                  | 576b081 |
| `GET /api/platform/pricing/coupons`     | Wrapped `{ coupons }`             | 69d309a |
| `GET /api/platform/pricing/discounts`   | Wrapped `{ discounts }`           | 69d309a |
| `GET /api/platform/api-keys` prefix     | Wrong prefix `/api/api-keys`      | 65750c9 |
| `GET /api/platform/api-keys/stats`      | Missing endpoint                  | 65750c9 |
| `GET /api/platform/api-keys` list       | Wrapped `{ apiKeys, pagination }` | 65750c9 |
| `GET /api/platform/webhooks` prefix     | Wrong prefix `/api/webhooks`      | 65750c9 |
| `GET /api/platform/webhooks/deliveries` | Missing endpoint                  | 65750c9 |
| `GET /api/platform/webhooks/stats`      | Missing endpoint                  | 65750c9 |
| `GET /api/backups` list                 | Wrapped `{ backups, pagination }` | abd4e3e |

### Still Broken ❌ — Must fix

| #   | Backend File                               | Endpoint                            | Current Shape                    | Expected Shape          | Frontend Hook                         |
| --- | ------------------------------------------ | ----------------------------------- | -------------------------------- | ----------------------- | ------------------------------------- |
| 1   | `platform/routes/modules/modules.route.ts` | `GET /api/platform/modules`         | `{ modules: [...], pagination }` | flat array + meta param | `useModules()` → `res.data.modules`   |
| 2   | `platform/routes/support/support.route.ts` | `GET /api/support/tickets`          | `{ tickets: [...], pagination }` | flat array + meta param | `useSupportTickets()` → `res.data`    |
| 3   | `platform/routes/storage/storage.route.ts` | `GET /api/platform/storage/tenants` | `{ tenants: [...], meta }`       | flat array + meta param | `useTenantStorageList()` → `res.data` |

### Missing Endpoint ⚠️

| #   | Backend File                                 | Endpoint                              | Frontend Hook                         | Notes                                      |
| --- | -------------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------------ |
| 4   | `platform/routes/sessions/sessions.route.ts` | `GET /api/platform/user-sessions/:id` | `useUserSessionDetail()` → `res.data` | Endpoint doesn't exist — needs new handler |

### Special Cases to Verify 🔍

| #   | Frontend Hook              | Select Pattern                                    | Risk                                               |
| --- | -------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| 5   | `useModules()`             | `res.data.modules` — expects `.modules` key       | Fix #1 must keep `.modules` key OR update frontend |
| 6   | `useCustomFields()`        | `res.data` with `res.pagination` (not `res.meta`) | Different convention — verify backend matches      |
| 7   | `useSupportTicketDetail()` | `res.data.ticket` — expects `.ticket` key         | Verify backend wraps as `{ ticket }`               |
| 8   | `useSupportSessions()`     | `res.data` — needs flat array                     | Verify backend impersonation routes                |

### Phase 1 Task List

```
[ ] Fix #1: modules.route.ts — GET / → use meta param, return flat array
    ⚠️ Frontend uses res.data.modules — either keep wrapper or update hook
    Recommendation: return flat array + update useModules select to (res) => res.data
[ ] Fix #2: support.route.ts — GET /tickets → use meta param, return flat array
    Frontend uses select: (res) => res.data — expects flat array
[ ] Fix #3: storage.route.ts — GET /tenants → use meta param, return flat array
    Frontend accesses res.data directly
[ ] Fix #4: sessions.route.ts — Add GET /:id handler returning single session
[ ] Verify #5: custom-fields response shape (uses res.pagination not res.meta)
[ ] Verify #6: support ticket detail wraps as { ticket }
[ ] Verify #7: impersonation support-sessions list shape
[ ] Verify #8: useHealthStatus hits /api/health which has no envelope
```

---

## Phase 2 — Playwright E2E Test Setup

**Effort: ~2 hours initial setup, then ~5 min per page**

### 2.1 Install & Configure

```bash
# From monorepo root
pnpm add -Dw @playwright/test
npx playwright install chromium
```

Create `playwright.config.ts` at root:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3002', // Developer portal
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm dev',
      port: 3002,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
  projects: [
    { name: 'developer-portal', testDir: './e2e/developer' },
    { name: 'admin-portal', testDir: './e2e/admin', use: { baseURL: 'http://localhost:3000' } },
  ],
});
```

### 2.2 Auth Setup (reusable login)

```typescript
// e2e/fixtures/auth.ts
import { test as base, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@dento.dev');
  await page.fill('[name="password"]', 'Admin@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL('/'); // Dashboard
}

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});
```

### 2.3 Smoke Test Per Page (Template)

One test per page that asserts:

1. Page loads without console errors
2. No React ErrorBoundary triggered
3. Data table / content renders (not empty / not loading forever)

```typescript
// e2e/developer/backups.spec.ts
import { test } from '../fixtures/auth';
import { expect } from '@playwright/test';

test('Backups page loads without errors', async ({ authenticatedPage: page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/backups');
  await page.waitForLoadState('networkidle');

  // No React errors
  await expect(page.locator('text=Something went wrong')).not.toBeVisible();

  // Data or empty state rendered
  const hasTable = await page.locator('table').isVisible();
  const hasEmpty = await page.locator('text=No backups').isVisible();
  expect(hasTable || hasEmpty).toBe(true);

  // No console errors (except React DevTools notice)
  const realErrors = errors.filter((e) => !e.includes('React DevTools'));
  expect(realErrors).toHaveLength(0);
});
```

### 2.4 Page Coverage Matrix

Each page below gets one smoke test. Mark ✅ as implemented:

| #   | Page Route        | Test File                | Status |
| --- | ----------------- | ------------------------ | ------ |
| 1   | `/`               | `dashboard.spec.ts`      | ☐      |
| 2   | `/tenants`        | `tenants.spec.ts`        | ☐      |
| 3   | `/tenants/:id`    | `tenant-detail.spec.ts`  | ☐      |
| 4   | `/monitoring`     | `monitoring.spec.ts`     | ☐      |
| 5   | `/rate-limits`    | `rate-limits.spec.ts`    | ☐      |
| 6   | `/deployments`    | `deployments.spec.ts`    | ☐      |
| 7   | `/user-sessions`  | `user-sessions.spec.ts`  | ☐      |
| 8   | `/billing`        | `billing.spec.ts`        | ☐      |
| 9   | `/domains`        | `domains.spec.ts`        | ☐      |
| 10  | `/support`        | `support.spec.ts`        | ☐      |
| 11  | `/modules`        | `modules.spec.ts`        | ☐      |
| 12  | `/pricing`        | `pricing.spec.ts`        | ☐      |
| 13  | `/feature-flags`  | `feature-flags.spec.ts`  | ☐      |
| 14  | `/custom-fields`  | `custom-fields.spec.ts`  | ☐      |
| 15  | `/settings`       | `settings.spec.ts`       | ☐      |
| 16  | `/storage`        | `storage.spec.ts`        | ☐      |
| 17  | `/backups`        | `backups.spec.ts`        | ☐      |
| 18  | `/api-keys`       | `api-keys.spec.ts`       | ☐      |
| 19  | `/webhooks`       | `webhooks.spec.ts`       | ☐      |
| 20  | `/api-catalog`    | `api-catalog.spec.ts`    | ☐      |
| 21  | `/audit-logs`     | `audit-logs.spec.ts`     | ☐      |
| 22  | `/system-logs`    | `system-logs.spec.ts`    | ☐      |
| 23  | `/platform-users` | `platform-users.spec.ts` | ☐      |

### 2.5 npm Script

```jsonc
// package.json (root)
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
  },
}
```

---

## Phase 3 — API Contract Tests (Optional, Future)

**When:** After Phase 1 + 2 are stable
**Why:** Catches shape mismatches at CI time without spinning up a browser

### Option A: Vitest Integration Tests (recommended — already have vitest)

```typescript
// apps/api/src/__tests__/contract/backups.contract.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../server';

describe('GET /api/backups', () => {
  it('returns flat array with meta', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/backups',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = JSON.parse(res.body);

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toHaveProperty('page');
    expect(body.meta).toHaveProperty('total');
  });
});
```

### Option B: MSW for Frontend Unit Tests

Intercept and validate request/response shapes in component tests without a real server.

---

## Execution Order

```
Phase 1  ──────────────────────────>  ~30 min
  Fix 3 broken response shapes
  Add 1 missing endpoint
  Verify 4 edge cases
  Commit + test in browser

Phase 2  ──────────────────────────>  ~2 hours
  Install Playwright
  Auth fixture
  23 smoke tests (template-based)
  Add to package.json scripts

Phase 3  ──────────────────────────>  Future (when CI pipeline exists)
  Vitest contract tests
  MSW mocks
```

---

## Appendix: All 80+ Frontend API URLs

See full inventory in session notes. Key pattern:

- **21 features** with API hooks
- **51 GET**, **18 POST**, **12 PATCH**, **10 DELETE** endpoints
- All use `apiClient` with `{ success, data, meta? }` envelope convention
- Lists: `select: (res) => ({ items: res.data, meta: res.meta })`
- Singles: `select: (res) => res.data`
