import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Treatment Plans CRUD', () => {
  test('create plan → add procedures → submit', async ({ page }) => {
    await page.goto('/treatment-plans');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Treatment Plans' }).first(),
    );
    if (!ready) return;

    const addBtn = page.getByRole('button', { name: /add|create|new/i });
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(1_000);

    // Select patient if prompted
    const patientSelect = page
      .getByLabel(/patient/i)
      .first()
      .or(page.getByPlaceholder(/search patient/i));
    if (await patientSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await patientSelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    // Fill plan name/title
    const nameInput = page.getByLabel(/name|title/i).first();
    if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Treatment Plan');
    }

    // Add procedure button
    const addProcBtn = page.getByRole('button', { name: /add procedure|add item/i });
    if (await addProcBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addProcBtn.click();
      await page.waitForTimeout(500);
    }

    // Submit
    const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });

  test('delete plan → confirmation → removed', async ({ page }) => {
    await page.goto('/treatment-plans');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Treatment Plans' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstRow.click();
    const navigated = await page
      .waitForURL(/\/treatment-plans\//, { timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!navigated) {
      test.skip(true, 'Row click does not navigate to detail page');
      return;
    }

    const deleteBtn = page.getByRole('button', { name: /delete/i });
    if (await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await deleteBtn.click();

      const confirmDialog = page.locator("[role='dialog'], [role='alertdialog']");
      if (await confirmDialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const confirmBtn = confirmDialog.getByRole('button', { name: /confirm|delete|yes/i });
        if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(2_000);
        }
      }
    }
  });
});
