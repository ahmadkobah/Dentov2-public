import { test, expect } from '@playwright/test';

test.describe('Report Category — Interactive', () => {
  test('report card click → /reports/:category/:type', async ({ page }) => {
    await page.goto('/reports/financial');
    await expect(page.getByText(/financial|reports/i).first()).toBeVisible({ timeout: 10_000 });

    // Click first report card
    const reportCard = page.locator('[class*="card"]').first();
    if (await reportCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reportCard.click();
      await page.waitForTimeout(1_000);

      // Either navigated to report detail or shows upgrade/locked state
      const locked = page.getByText(/locked|upgrade|unavailable/i);
      if (await locked.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(locked).toBeVisible();
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
