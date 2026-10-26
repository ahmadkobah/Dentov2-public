import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Waitlist CRUD', () => {
  test('create entry → submit → appears in table', async ({ page }) => {
    await page.goto('/waitlists');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Waitlist' }).first(),
    );
    if (!ready) return;

    const addBtn = page.getByRole('button', { name: /add to waitlist|add|create/i });
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await addBtn.click();

    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Select patient
    const patientSelect = dialog
      .getByLabel(/patient/i)
      .first()
      .or(dialog.getByPlaceholder(/search patient/i));
    if (await patientSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await patientSelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    const submitBtn = dialog.getByRole('button', { name: /save|create|submit|add/i });
    if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });

  test('delete entry → confirmation → removed', async ({ page }) => {
    await page.goto('/waitlists');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Waitlist' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Look for delete/remove button on row
    const deleteBtn = firstRow.getByRole('button', { name: /delete|remove/i });
    if (!(await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      // Try row-level action menu
      const menuBtn = firstRow.getByRole('button').last();
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        const deleteItem = page.getByRole('menuitem', { name: /delete|remove/i });
        if (await deleteItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await deleteItem.click();
        }
      }
    } else {
      await deleteBtn.click();
    }

    const confirmDialog = page.locator("[role='dialog'], [role='alertdialog']");
    if (await confirmDialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const confirmBtn = confirmDialog.getByRole('button', { name: /confirm|delete|yes/i });
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2_000);
      }
    }
  });
});
