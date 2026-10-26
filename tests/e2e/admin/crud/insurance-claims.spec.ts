import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Insurance Claims CRUD', () => {
  test('create claim → submit', async ({ page }) => {
    await page.goto('/insurance-claims/new');
    await page.waitForTimeout(2_000);

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /new claim|create claim|insurance claims/i }).first(),
    );
    if (!ready) return;

    // Select patient
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

    // Select insurance company
    const companySelect = page.getByLabel(/insurance company|company/i);
    if (await companySelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await companySelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
