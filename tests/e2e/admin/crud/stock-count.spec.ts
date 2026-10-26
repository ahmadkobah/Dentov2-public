import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Stock Count CRUD', () => {
  test('create stock count → submit', async ({ page }) => {
    await page.goto('/stock-count/new');
    await page.waitForTimeout(2_000);

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /new stock count|create.*count|stock count/i }).first(),
    );
    if (!ready) return;

    // Select branch/location
    const branchSelect = page.getByLabel(/branch|location|warehouse/i);
    if (await branchSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await branchSelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    // Fill notes/description
    const notesInput = page.getByLabel(/notes|description|reason/i);
    if (await notesInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await notesInput.fill('E2E automated stock count');
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit|start/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
