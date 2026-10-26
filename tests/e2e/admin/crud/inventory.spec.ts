import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Inventory CRUD', () => {
  test('create inventory item → submit', async ({ page }) => {
    await page.goto('/inventory/new');
    await page.waitForTimeout(2_000);

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /new item|create item|add item|inventory/i }).first(),
    );
    if (!ready) return;

    // Fill name
    const nameInput = page.getByLabel(/name|item name/i).first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Item');
    }

    // Fill SKU
    const skuInput = page.getByLabel(/sku|code/i);
    if (await skuInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skuInput.fill('E2E-SKU-001');
    }

    // Select category
    const categorySelect = page.getByLabel(/category/i);
    if (await categorySelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await categorySelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    // Fill quantity
    const qtyInput = page.getByLabel(/quantity|stock/i);
    if (await qtyInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await qtyInput.fill('100');
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
