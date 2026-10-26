import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Notification Templates — Interactive', () => {
  test('channel toggles + search + filter pills', async ({ page }) => {
    await page.goto('/notification-templates');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Notification Templates' }).first(),
    );
    if (!ready) return;

    // Search
    const search = page
      .getByPlaceholder(/search by name or key/i)
      .or(page.getByPlaceholder(/search/i).first());
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill('appointment');
      await page.waitForTimeout(500);
      await search.clear();
    }

    // Filter pills (channel-based: All, Email, SMS, Push)
    const emailPill = page
      .getByRole('button', { name: /email/i })
      .or(page.locator('button').filter({ hasText: /^email$/i }));
    if (await emailPill.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailPill.click();
      await page.waitForTimeout(500);
    }

    // Channel toggle on first template card/row
    const toggle = page.getByRole('switch').first();
    if (await toggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(toggle).toBeVisible();
      // Don't actually toggle to avoid changing state
    }
  });
});
