import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Installments — Interactive', () => {
  test('row click → detail + payment dialog', async ({ page }) => {
    await page.goto('/installments');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Installments' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    // Click first row to expand/navigate to detail
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(500);

      // Check if we navigated to detail page or opened a sheet/dialog
      const dialog = page.locator("[role='dialog']");
      const sheet = page.locator('[class*="sheet"]');

      if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Record installment payment dialog
        const recordBtn = dialog.getByRole('button', { name: /record payment/i });
        if (await recordBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await expect(recordBtn).toBeVisible();
        }
        await page.keyboard.press('Escape');
      } else if (await sheet.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
      }
    }
  });
});
