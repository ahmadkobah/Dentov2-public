import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/reports/low-stock', () => {
  test('renders Low Stock Alerts page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/reports/low-stock');

    // Heading
    await expect(page.getByRole('heading', { name: 'Low Stock Alerts' }).first()).toBeVisible();

    await console.verify();
  });
});
