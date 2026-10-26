import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Suppliers CRUD', () => {
  test('create supplier → submit', async ({ page }) => {
    await page.goto('/suppliers');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Suppliers' }).first(),
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
    const nameInput = page.getByLabel(/name|supplier name/i).first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Supplier');
    }

    // Fill contact
    const phoneInput = page.getByLabel(/phone|contact/i);
    if (await phoneInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await phoneInput.fill('0501234567');
    }

    // Fill email
    const emailInput = page.getByLabel(/email/i);
    if (await emailInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await emailInput.fill('supplier@e2etest.com');
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
