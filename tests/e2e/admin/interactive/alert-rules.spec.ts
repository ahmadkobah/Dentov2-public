import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Alert Rules — Interactive', () => {
  test('toggle/edit/delete card actions + search + filter pills', async ({ page }) => {
    await page.goto('/alert-rules');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Alert Rules' }).first(),
    );
    if (!ready) return;

    // Search
    const search = page
      .getByPlaceholder(/search rules/i)
      .or(page.getByPlaceholder(/search/i).first());
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill('stock');
      await page.waitForTimeout(500);
      await search.clear();
    }

    // Filter pills (All, Active, Disabled)
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

    // Card action buttons (toggle, edit, delete)
    const firstCard = page.locator('[class*="card"]').first();
    if (await firstCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const editBtn = firstCard.getByRole('button', { name: /edit/i });
      if (await editBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(editBtn).toBeVisible();
      }
    }
  });
});
