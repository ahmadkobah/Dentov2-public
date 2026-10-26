import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /payments', () => {
  test('renders Payments page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/payments');

    // Heading
    await expect(page.getByRole('heading', { name: 'Payments' }).first()).toBeVisible();

    // Search input
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();

    await console.verify();
  });
});
