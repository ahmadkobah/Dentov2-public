import { test, expect } from '@playwright/test';

test.describe('Schedules — Interactive', () => {
  test('tab switching (Doctor Schedules / Exceptions / Shifts / Staff)', async ({ page }) => {
    await page.goto('/schedules');
    await expect(page.getByRole('heading', { name: 'Schedules' }).first()).toBeVisible({
      timeout: 10_000,
    });

    const tabNames = ['Doctor Schedules', 'Exceptions', 'Shift Templates', 'Staff Schedules'];

    for (const tabName of tabNames) {
      const tab = page
        .getByRole('tab', { name: new RegExp(tabName, 'i') })
        .or(page.locator('button').filter({ hasText: new RegExp(tabName, 'i') }));

      if (await tab.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(300);
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
