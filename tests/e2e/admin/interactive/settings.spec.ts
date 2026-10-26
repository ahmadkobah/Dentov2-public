import { test, expect } from '@playwright/test';

test.describe('Settings — Interactive', () => {
  test('tab navigation (General / Branding / Notifications / ...)', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Settings uses button-based custom tabs
    const tabNames = [
      'General',
      'Branding',
      'Notifications',
      'Users',
      'Sessions',
      'Billing',
      'Custom Fields',
    ];

    for (const tabName of tabNames) {
      const tab = page
        .getByRole('tab', { name: new RegExp(tabName, 'i') })
        .or(page.locator('button').filter({ hasText: new RegExp(`^${tabName}$`, 'i') }));

      if (await tab.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(300);
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
