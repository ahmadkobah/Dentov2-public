import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/categories', () => {
  test('renders Inventory Categories page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/categories');

    // Heading
    await expect(page.getByRole('heading', { name: 'Inventory Categories' }).first()).toBeVisible();

    await console.verify();
  });
});
