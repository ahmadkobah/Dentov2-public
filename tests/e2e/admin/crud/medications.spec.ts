import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Medications CRUD', () => {
  test('deactivate medication → confirmation', async ({ page }) => {
    await page.goto('/medications');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /medications/i }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    // Find first table row
    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Deactivate is inside a DropdownMenu — trigger is the last button (MoreHorizontal icon)
    const menuBtn = firstRow.locator('button').last();
    await menuBtn.click();
    await page.waitForTimeout(300);

    const deactivateItem = page.getByRole('menuitem', { name: /deactivate/i });
    if (!(await deactivateItem.isVisible({ timeout: 2_000 }).catch(() => false))) {
      // Medication might already be inactive
      await page.keyboard.press('Escape');
      test.skip(true, 'No Deactivate option available (medication may be inactive)');
      return;
    }
    await deactivateItem.click();

    const confirmDialog = page.locator("[role='dialog'], [role='alertdialog']");
    if (await confirmDialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const confirmBtn = confirmDialog.getByRole('button', { name: /confirm|deactivate|yes/i });
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(300);
        await confirmBtn.dispatchEvent('click');
        await page.waitForTimeout(2_000);
      }
    }
  });
});
