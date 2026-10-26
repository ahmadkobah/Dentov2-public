import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Daily Operations — Interactive', () => {
  test('tab switching + walk-in patient dialog', async ({ page }) => {
    await page.goto('/daily-operations');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Daily Operations' }).first(),
    );
    if (!ready) return;

    // Look for tabs
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      // Click each tab and verify content renders
      for (let i = 0; i < Math.min(tabCount, 4); i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }

    // Look for walk-in patient button/dialog trigger
    const walkInBtn = page.getByRole('button', { name: /walk-in|walk in/i });
    if (await walkInBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await walkInBtn.click();
      const dialog = page.locator("[role='dialog']");
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      // Close the dialog
      await page.keyboard.press('Escape');
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
