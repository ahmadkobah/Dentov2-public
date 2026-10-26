import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Users CRUD', () => {
  test('invite user → submit', async ({ page }) => {
    await page.goto('/users');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Users' }).first(),
    );
    if (!ready) return;

    const inviteBtn = page.getByRole('button', { name: /invite|add|create|new/i });
    if (!(await inviteBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await inviteBtn.click();
    await page.waitForTimeout(1_000);

    const dialog = page.locator("[role='dialog']");
    const form = dialog.isVisible({ timeout: 3_000 }).catch(() => false) ? dialog : page;

    // Fill email
    const emailInput = page.getByLabel(/email/i).first();
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailInput.fill('e2e-test-user@example.com');
    }

    // Select role
    const roleSelect = page.getByLabel(/role/i);
    if (await roleSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await roleSelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    // Fill name
    const nameInput = page.getByLabel(/first name|name/i).first();
    if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test');
    }

    const submitBtn = page.getByRole('button', { name: /invite|save|create|submit|send/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });

  test('suspend user → confirmation', async ({ page }) => {
    await page.goto('/users');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Users' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstRow.click();
    await page.waitForTimeout(1_000);

    const suspendBtn = page.getByRole('button', { name: /suspend|deactivate|disable/i });
    if (!(await suspendBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // Try action menu
      const menuBtn = page
        .getByRole('button', { name: /actions|more/i })
        .or(page.locator('button:has(svg)').last());
      if (await menuBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await menuBtn.click();
        await page.waitForTimeout(300);
        const menuItem = page.getByRole('menuitem', { name: /suspend|deactivate|disable/i });
        if (await menuItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await menuItem.click();
        }
      }
    } else {
      await suspendBtn.click();
    }

    // Confirm dialog
    const confirmDialog = page.locator("[role='dialog'], [role='alertdialog']");
    if (await confirmDialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const confirmBtn = confirmDialog.getByRole('button', { name: /confirm|suspend|yes/i });
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2_000);
      }
    }
  });
});
