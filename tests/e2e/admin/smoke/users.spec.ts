import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /users', () => {
  test('renders Staff Management page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/users');

    // Heading
    await expect(page.getByRole('heading', { name: 'Staff Management' }).first()).toBeVisible();

    // Key element
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();

    await console.verify();
  });
});
