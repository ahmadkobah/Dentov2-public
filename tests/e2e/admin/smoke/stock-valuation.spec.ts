import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/reports/stock-valuation', () => {
  test('renders Stock Valuation Report page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/reports/stock-valuation');

    // Heading
    await expect(
      page.getByRole('heading', { name: 'Stock Valuation Report' }).first(),
    ).toBeVisible();

    await console.verify();
  });
});
