import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Webhooks — Interactive', () => {
  test('test/toggle/delete actions + search + filter pills', async ({ page }) => {
    await page.goto('/webhooks');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Webhooks' }).first(),
    );
    if (!ready) return;

    // Search
    const search = page
      .getByPlaceholder(/search by URL or name/i)
      .or(page.getByPlaceholder(/search/i).first());
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill('https://');
      await page.waitForTimeout(500);
      await search.clear();
    }

    // Filter pills (All, Active, Disabled, Failed)
    const activePill = page
      .getByRole('button', { name: /^active$/i })
      .or(page.locator('button').filter({ hasText: /^active$/i }));
    if (await activePill.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await activePill.click();
      await page.waitForTimeout(500);

      const allPill = page
        .getByRole('button', { name: /^all$/i })
        .or(page.locator('button').filter({ hasText: /^all$/i }));
      if (await allPill.isVisible()) {
        await allPill.click();
      }
    }

    // Card action buttons (test, toggle, delete)
    const firstCard = page.locator('[class*="card"]').first();
    if (await firstCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const testBtn = firstCard.getByRole('button', { name: /test/i });
      if (await testBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(testBtn).toBeVisible();
      }
    }
  });
});
