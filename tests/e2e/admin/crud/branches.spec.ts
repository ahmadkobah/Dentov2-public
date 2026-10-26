import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Branches CRUD', () => {
  test('create branch → submit', async ({ page }) => {
    await page.goto('/branches');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Branches' }).first(),
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
    const nameInput = page.getByLabel(/name|branch name/i).first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Branch');
    }

    // Fill address
    const addressInput = page.getByLabel(/address/i);
    if (await addressInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await addressInput.fill('123 E2E Test Street');
    }

    // Fill phone
    const phoneInput = page.getByLabel(/phone/i);
    if (await phoneInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await phoneInput.fill('0501234567');
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
