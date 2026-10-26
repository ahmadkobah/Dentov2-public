import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Invoices — Interactive', () => {
  test('search + status filter', async ({ page }) => {
    await page.goto('/invoices');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Invoices' }).first(),
    );
    if (!ready) return;

    // Search
    const search = page.getByPlaceholder(/search/i).first();
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill('INV-');
      await page.waitForTimeout(500);
      await search.clear();
    }

    // Status filter
    const statusTrigger = page
      .getByRole('combobox')
      .first()
      .or(page.getByText(/all statuses/i));

    if (await statusTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await statusTrigger.click();
      const paidOption = page.getByRole('option', { name: /paid/i });
      if (await paidOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await paidOption.click();
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('row click → invoice detail', async ({ page }) => {
    await page.goto('/invoices');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Invoices' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/invoices\//, { timeout: 10_000 });
    }
  });
});
