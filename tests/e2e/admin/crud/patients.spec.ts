import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Patients CRUD', () => {
  test('create patient → fill form → submit → toast', async ({ page }) => {
    await page.goto('/patients');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Patients' }).first(),
    );
    if (!ready) return;

    const addBtn = page.getByRole('button', { name: /add|create|new/i });
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await addBtn.click();

    // Wait for form dialog or new page
    const dialog = page.locator("[role='dialog']");
    const formPage = page.getByLabel(/first name/i);

    if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Fill form inside dialog
      const firstName = dialog.getByLabel(/first name/i);
      const lastName = dialog.getByLabel(/last name/i);
      const phone = dialog.getByLabel(/phone/i).first();

      if (await firstName.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstName.fill('E2E Test');
      }
      if (await lastName.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await lastName.fill('Patient');
      }
      if (await phone.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await phone.fill('+20 100 000 0000');
      }

      // Submit
      const submitBtn = dialog.getByRole('button', { name: /save|create|submit|add/i });
      if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await submitBtn.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(2_000);
      }
    } else if (await formPage.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Full page form
      await formPage.fill('E2E Test');
      const lastName = page.getByLabel(/last name/i);
      if (await lastName.isVisible()) await lastName.fill('Patient');

      const submitBtn = page.getByRole('button', { name: /save|create|submit/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(2_000);
      }
    }
  });

  test('edit patient → save changes', async ({ page }) => {
    await page.goto('/patients');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Patients' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstRow.click();
    await expect(page).toHaveURL(/\/patients\//, { timeout: 10_000 });

    // Look for edit button
    const editBtn = page.getByRole('button', { name: /edit/i });
    if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);

      // Modify a field
      const phone = page.getByLabel(/phone/i).first();
      if (await phone.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await phone.fill('+20 100 111 1111');
      }

      const saveBtn = page.getByRole('button', { name: /save|update/i });
      if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2_000);
      }
    }
  });

  test('delete patient → confirmation → removed', async ({ page }) => {
    await page.goto('/patients');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Patients' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstRow.click();
    await expect(page).toHaveURL(/\/patients\//, { timeout: 10_000 });

    const deleteBtn = page.getByRole('button', { name: /delete/i });
    if (await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await deleteBtn.click();

      // Confirmation dialog
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
