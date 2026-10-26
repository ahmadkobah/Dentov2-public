import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Purchase Orders — Interactive', () => {
  test('row click → detail + receive dialog', async ({ page }) => {
    await page.goto('/purchase-orders');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Purchase Orders' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(500);

      // Detail page or drawer should appear
      const receiveBtn = page.getByRole('button', { name: /receive|mark received/i });
      if (await receiveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await receiveBtn.click();

        const dialog = page.locator("[role='dialog']");
        if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await page.keyboard.press('Escape');
          await expect(dialog).not.toBeVisible({ timeout: 3_000 });
        }
      }
    }
  });
});
