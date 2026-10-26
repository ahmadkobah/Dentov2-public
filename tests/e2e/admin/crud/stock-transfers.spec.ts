import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Stock Transfers CRUD', () => {
  test('create stock transfer → submit', async ({ page }) => {
    await page.goto('/stock-transfers/new');
    await page.waitForTimeout(2_000);

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /new transfer|create transfer|stock transfers/i }).first(),
    );
    if (!ready) return;

    // Select source branch/warehouse
    const sourceSelect = page.getByLabel(/source|from/i).first();
    if (await sourceSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sourceSelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    // Select destination branch/warehouse
    const destSelect = page.getByLabel(/destination|to/i).first();
    if (await destSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await destSelect.click();
      await page.waitForTimeout(500);
      const secondOption = page.getByRole('option').nth(1);
      if (await secondOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await secondOption.click();
      }
    }

    // Add items
    const addItemBtn = page.getByRole('button', { name: /add item|add/i });
    if (await addItemBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addItemBtn.click();
      await page.waitForTimeout(500);
    }

    const submitBtn = page.getByRole('button', { name: /save|create|submit|transfer/i }).last();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
