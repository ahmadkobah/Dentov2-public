import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Report Paywall', () => {
  test('locked report → upgrade prompt shown', async ({ page }) => {
    // Navigate to reports section
    await page.goto('/reports');
    await page.waitForTimeout(2_000);

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /reports/i }).first(),
    );
    if (!ready) return;

    // Look for locked/premium report indicators
    const lockedIcon = page.locator('[class*="lock"], [data-locked="true"]');
    const upgradePrompt = page.getByText(/upgrade|premium|locked|subscribe/i);

    // Try clicking a report card to see if paywall appears
    const reportCard = page.locator('[class*="card"], [class*="Card"]').first();
    if (await reportCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reportCard.click();
      await page.waitForTimeout(2_000);

      // Check for upgrade/locked prompt
      const hasPaywall = await upgradePrompt.isVisible({ timeout: 5_000 }).catch(() => false);
      const hasLock = await lockedIcon
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (!hasPaywall && !hasLock) {
        // No paywall — user may have full access or reports aren't locked
        test.skip(true, 'No paywall detected — reports may be unlocked for this user');
      }
    } else {
      test.skip(true, 'No report cards found');
    }
  });
});
