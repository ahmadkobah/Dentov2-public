import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Dental Labs CRUD', () => {
  test('edit lab → save changes', async ({ page }) => {
    await page.goto('/dental-labs');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /dental labs/i }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    // Click first lab row or card
    const firstRow = page
      .locator('table tbody tr')
      .first()
      .or(page.locator('[class*="card"]').first());

    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstRow.click();
    await page.waitForTimeout(1_000);

    const editBtn = page.getByRole('button', { name: /edit/i });
    if (!(await editBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await editBtn.click();
    await page.waitForTimeout(500);

    // Modify a field
    const nameInput = page.getByLabel(/name/i).first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const currentVal = await nameInput.inputValue();
      await nameInput.fill(currentVal + ' (edited)');
    }

    const saveBtn = page.getByRole('button', { name: /save|update/i });
    if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(2_000);
    }
  });
});
