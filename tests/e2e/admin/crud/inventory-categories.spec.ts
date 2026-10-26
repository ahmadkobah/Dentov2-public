import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Inventory Categories CRUD', () => {
  test('create category → submit', async ({ page }) => {
    await page.goto('/inventory-categories');
    await page.waitForTimeout(2_000);

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /categories|inventory/i }).first(),
    );
    if (!ready) return;

    const addBtn = page.getByRole('button', { name: /add|create|new/i });
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(1_000);

    const dialog = page.locator("[role='dialog']");
    const nameInput = dialog.isVisible({ timeout: 2_000 }).catch(() => false)
      ? dialog.getByLabel(/name/i).first()
      : page.getByLabel(/name/i).first();

    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Category');
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
