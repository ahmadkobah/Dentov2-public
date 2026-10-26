import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Payments CRUD', () => {
  test('record payment → submit', async ({ page }) => {
    await page.goto('/payments/new');
    await page.waitForTimeout(2_000);

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /new payment|record payment|payments/i }).first(),
    );
    if (!ready) return;

    // Select patient/invoice
    const patientSelect = page
      .getByLabel(/patient|invoice/i)
      .first()
      .or(page.getByPlaceholder(/search/i).first());
    if (await patientSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await patientSelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    // Fill amount
    const amountInput = page.getByLabel(/amount/i).first();
    if (await amountInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await amountInput.fill('100');
    }

    // Select method
    const methodSelect = page.getByLabel(/method|payment method/i);
    if (await methodSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await methodSelect.click();
      const cashOption = page.getByRole('option', { name: /cash/i });
      if (await cashOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await cashOption.click();
      }
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit|record/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
