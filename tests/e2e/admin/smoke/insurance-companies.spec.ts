import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /insurance-companies', () => {
  test('renders Insurance Companies page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/insurance-companies');

    // Heading
    await expect(page.getByRole('heading', { name: 'Insurance Companies' }).first()).toBeVisible();

    // Search input
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();

    await console.verify();
  });
});
