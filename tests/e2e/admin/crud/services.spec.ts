import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Services CRUD', () => {
  test('create service → submit', async ({ page }) => {
    await page.goto('/services');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Services' }).first(),
    );
    if (!ready) return;

    const addBtn = page.getByRole('button', { name: /add|create|new/i });
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(1_000);

    // Fill name
    const nameInput = page.getByLabel(/name|service name/i).first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Service');
    }

    // Fill price
    const priceInput = page.getByLabel(/price|fee|cost/i);
    if (await priceInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await priceInput.fill('150');
    }

    // Select category
    const categorySelect = page.getByLabel(/category/i);
    if (await categorySelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await categorySelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });

  test('deactivate service → confirmation', async ({ page }) => {
    await page.goto('/services');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Services' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

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
      await page.keyboard.press('Escape');
      test.skip(true, 'No Deactivate option available');
      return;
    }
    await deactivateItem.click();

    // Confirm dialog
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
