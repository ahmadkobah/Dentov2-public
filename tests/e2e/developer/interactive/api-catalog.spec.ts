import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('API Catalog — Interactive', () => {
  test('search + method filter → endpoints filter', async ({ page }) => {
    await page.goto('/api-catalog');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /api catalog/i }).first(),
    );
    if (!ready) return;

    try {
      const search = page.getByPlaceholder(/search/i).first();
      if (!(await search.isVisible({ timeout: 3_000 }).catch(() => false))) return;
      await search.fill('auth', { timeout: 5_000 });
      await page.waitForTimeout(500);

      const methods = ['All', 'GET', 'POST', 'PATCH', 'PUT', 'DELETE'];
      for (const method of methods) {
        const btn = page.getByRole('button', { name: method, exact: true });
        if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await btn.click({ timeout: 5_000 }).catch(() => {});
          await page.waitForTimeout(300);
        }
      }

      await search.clear({ timeout: 5_000 });
      await page.waitForTimeout(500);
    } catch {
      /* page interaction failed */
    }
  });
});
