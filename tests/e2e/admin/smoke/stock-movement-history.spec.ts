import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/reports/stock-movement-history', () => {
  test('renders Stock Movement History page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/reports/stock-movement-history');

    // Heading
    await expect(
      page.getByRole('heading', { name: 'Stock Movement History' }).first(),
    ).toBeVisible();

    await console.verify();
  });
});
