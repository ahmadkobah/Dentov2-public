import { test, expect } from '@playwright/test';

test.describe('Commissions — Interactive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/commissions');
    await expect(page.getByRole('heading', { name: 'Commissions' }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('tab switching (Commissions / Payouts) + status filter', async ({ page }) => {
    const tabNames = ['Commissions', 'Payouts'];

    for (const tabName of tabNames) {
      const tab = page
        .getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') })
        .or(page.locator('button').filter({ hasText: new RegExp(`^${tabName}$`, 'i') }));

      if (await tab.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    }

    // Status filter
    const statusTrigger = page
      .getByRole('combobox')
      .first()
      .or(page.getByText(/all statuses/i));
    if (await statusTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await statusTrigger.click();
      const pendingOption = page.getByRole('option', { name: /pending/i });
      if (await pendingOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await pendingOption.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test('approve all pending button interaction', async ({ page }) => {
    const approveBtn = page.getByRole('button', { name: /approve all/i });
    if (await approveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await approveBtn.click();

      // Expect confirmation dialog
      const dialog = page.locator("[role='dialog']").or(page.locator("[role='alertdialog']"));
      if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Close confirmation without submitting
        await page.keyboard.press('Escape');
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
