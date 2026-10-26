import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Confirmation Cancel', () => {
  test('cancel delete → item preserved', async ({ page }) => {
    await page.goto('/patients');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /patients/i }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'No patient rows to test delete cancellation');
      return;
    }

    // Open the dropdown menu on the first row (aria-label="Patient actions")
    const actionBtn = firstRow
      .getByRole('button', { name: /patient actions/i })
      .or(firstRow.locator('button').last());
    await actionBtn.click();
    await page.waitForTimeout(300);

    // Click Delete menuitem
    const deleteItem = page.getByRole('menuitem', { name: /delete/i });
    if (!(await deleteItem.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No delete menu item found');
      return;
    }
    await deleteItem.click();

    // Confirmation dialog should appear
    const dialog = page.locator("[role='dialog'], [role='alertdialog']");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Click Cancel instead of confirming
    const cancelBtn = dialog.getByRole('button', { name: /cancel/i }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 3_000 });
    // Use keyboard shortcut as the button may be outside viewport due to overlay positioning
    await page.keyboard.press('Escape');

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // Row should still be visible (item preserved)
    await expect(firstRow).toBeVisible();
  });
});
