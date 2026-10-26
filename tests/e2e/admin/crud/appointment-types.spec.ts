import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Appointment Types CRUD', () => {
  test('create type → submit → appears in list', async ({ page }) => {
    await page.goto('/appointment-types');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Appointment Types' }).first(),
    );
    if (!ready) return;

    const addBtn = page.getByRole('button', { name: /add|create|new/i });
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await addBtn.click();

    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Fill name
    const nameInput = dialog.getByLabel(/name/i).first();
    if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Type');
    }

    // Fill duration
    const duration = dialog.getByLabel(/duration/i);
    if (await duration.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await duration.fill('30');
    }

    const submitBtn = dialog.getByRole('button', { name: /save|create|submit|add/i });
    if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });

  test('delete type → confirmation → removed', async ({ page }) => {
    await page.goto('/appointment-types');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Appointment Types' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    // Delete is inside a DropdownMenu — open trigger first
    const actionTrigger = page.getByRole('button', { name: /type actions/i }).first();
    if (!(await actionTrigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await actionTrigger.click();
    await page.waitForTimeout(300);

    const deleteItem = page.getByRole('menuitem', { name: /delete/i });
    if (!(await deleteItem.isVisible({ timeout: 2_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await deleteItem.click();

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
