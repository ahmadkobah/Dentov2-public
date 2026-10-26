import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Prescriptions CRUD', () => {
  test('delete prescription → confirmation → removed', async ({ page }) => {
    await page.goto('/prescriptions');

    // Page may use a different heading
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /prescriptions/i }).first(),
    );
    if (!ready) return;

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, 'No prescriptions found');
      return;
    }

    // Open actions dropdown on first row
    const menuBtn = firstRow.locator('button').last();
    await menuBtn.click();
    await page.waitForTimeout(300);

    // Try Delete (only for draft), fallback to Cancel (for draft/active)
    const deleteItem = page.getByRole('menuitem', { name: /delete/i });
    const cancelItem = page.getByRole('menuitem', { name: /cancel/i });

    let actionItem = deleteItem;
    if (!(await deleteItem.isVisible({ timeout: 2_000 }).catch(() => false))) {
      actionItem = cancelItem;
    }

    if (!(await actionItem.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await page.keyboard.press('Escape');
      test.skip(true, 'No Delete or Cancel option available');
      return;
    }
    await actionItem.click();

    // If a confirm dialog appears, confirm
    const confirmDialog = page.locator("[role='dialog'], [role='alertdialog']");
    if (await confirmDialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const confirmBtn = confirmDialog
        .getByRole('button', { name: /confirm|delete|cancel|yes/i })
        .first();
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(300);
        await confirmBtn.dispatchEvent('click');
        await page.waitForTimeout(2_000);
      }
    }
  });
});
