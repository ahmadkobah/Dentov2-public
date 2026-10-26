import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /forgot-password', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders forgot password form', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/forgot-password');

    // Heading
    await expect(page.getByRole('heading', { name: 'Forgot Password' }).first()).toBeVisible();

    // Email input
    await expect(page.getByPlaceholder(/doctor@clinic\.com/i)).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();

    await console.verify();
  });
});
