import { test, expect } from '@playwright/test';

test.describe('Leave — Interactive', () => {
  test('tab switching (Requests / Types / Balances)', async ({ page }) => {
    await page.goto('/leave');
    await expect(page.getByRole('heading', { name: 'Leave Management' }).first()).toBeVisible({
      timeout: 10_000,
    });

    const tabNames = ['Leave Requests', 'Leave Types', 'Balances'];

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
