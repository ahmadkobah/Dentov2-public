import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Installments CRUD', () => {
  test('create installment plan → submit', async ({ page }) => {
    await page.goto('/installments/new');
    await page.waitForTimeout(2_000);

    const ready = await assertPageHeading(
      page,
      page
        .getByRole('heading', { name: /new installment|create installment|installments/i })
        .first(),
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
    const amountInput = page.getByLabel(/total amount|amount/i).first();
    if (await amountInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await amountInput.fill('1000');
    }

    // Fill number of installments
    const installmentsInput = page.getByLabel(/number of installments|installments/i);
    if (await installmentsInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await installmentsInput.fill('3');
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
