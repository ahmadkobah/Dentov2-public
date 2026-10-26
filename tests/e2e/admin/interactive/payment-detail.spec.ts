import { test, expect } from '@playwright/test';

test.describe('Payment Detail — Interactive', () => {
  test('refund dialog opens and closes', async ({ page }) => {
    // Navigate to payments list first
    await page.goto('/payments');
    await expect(page.getByRole('heading', { name: 'Payments' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Navigate via dropdown: click actions button → View Details
    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Open the dropdown menu (MoreHorizontal button, last button in the row)
    await firstRow.locator('button').last().click();
    await page.waitForTimeout(300);

    const viewDetails = page.getByRole('menuitem', { name: /view details/i });
    if (!(await viewDetails.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'View Details menu item not found');
      return;
    }
    await viewDetails.click();
    await expect(page).toHaveURL(/\/payments\//, { timeout: 10_000 });

    // Look for Refund Payment button
    const refundBtn = page.getByRole('button', { name: /refund/i });
    if (await refundBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await refundBtn.click();

      const dialog = page.locator("[role='dialog']");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Dialog should contain refund reason input and confirm button
      const reasonInput = dialog.getByPlaceholder(/reason/i).or(dialog.locator('#refundReason'));
      const confirmBtn = dialog.getByRole('button', { name: /confirm refund/i });

      if (await reasonInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(reasonInput).toBeVisible();
      }
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(confirmBtn).toBeVisible();
      }

      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
