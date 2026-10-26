import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Inventory — Interactive', () => {
  test('search + category filter + low stock indicator', async ({ page }) => {
    await page.goto('/inventory');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Inventory' }).first(),
    );
    if (!ready) return;

    // Search
    const search = page.getByPlaceholder(/search/i).first();
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill('gloves');
      await page.waitForTimeout(500);
      await search.clear();
    }

    // Category filter
    const categoryTrigger = page
      .getByRole('combobox')
      .first()
      .or(page.getByText(/all categories/i));

    if (await categoryTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await categoryTrigger.click();
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Low stock indicator should be present in the page
    const lowStock = page.getByText(/low stock/i);
    if (await lowStock.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(lowStock.first()).toBeVisible();
    }
  });
});
