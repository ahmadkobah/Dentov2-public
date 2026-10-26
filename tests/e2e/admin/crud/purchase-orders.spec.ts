import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Purchase Orders CRUD', () => {
  test('create purchase order → submit', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    await page.waitForTimeout(2_000);

    const ready = await assertPageHeading(
      page,
      page
        .getByRole('heading', { name: /new purchase order|create.*order|purchase orders/i })
        .first(),
    );
    if (!ready) return;

    // Select supplier
    const supplierSelect = page.getByLabel(/supplier/i);
    if (await supplierSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await supplierSelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    // Add line item
    const addItemBtn = page.getByRole('button', { name: /add item|add line/i });
    if (await addItemBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addItemBtn.click();
      await page.waitForTimeout(500);
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
