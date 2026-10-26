import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /invoices', () => {
  test('renders Invoices page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/invoices');

    // Heading
    await expect(page.getByRole('heading', { name: 'Invoices' }).first()).toBeVisible();

    // Search input
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();

    await console.verify();
  });
});
