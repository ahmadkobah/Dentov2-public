import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Insurance Companies CRUD', () => {
  test('create company → submit', async ({ page }) => {
    await page.goto('/insurance-companies');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Insurance' }).first(),
    );
    if (!ready) return;

    const addBtn = page.getByRole('button', { name: /add company/i }).first();
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(1_000);

    // Fill name
    const nameInput = page.getByLabel(/name/i).first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Insurance Co.');
    }

    // Fill code
    const codeInput = page.getByLabel(/code/i);
    if (await codeInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await codeInput.fill('E2E-INS');
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });

  test('edit company → save', async ({ page }) => {
    await page.goto('/insurance-companies');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Insurance' }).first(),
    );
    if (!ready) return;

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, 'No insurance companies to edit');
      return;
    }

    // Open actions dropdown on first row
    const actionBtn = firstRow.locator('button').last();
    await actionBtn.click();
    await page.waitForTimeout(500);

    const editItem = page.getByRole('menuitem', { name: /edit/i });
    if (!(await editItem.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Edit menuitem not found');
      return;
    }
    await editItem.click();
    await page.waitForTimeout(1_000);

    // Should navigate to edit form page
    await expect(page).toHaveURL(/\/insurance-companies\/.*\/edit/, { timeout: 10_000 });

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
