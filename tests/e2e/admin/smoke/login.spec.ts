import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders login form with email and password fields', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/login');

    // Heading
    await expect(page.getByRole('heading', { name: 'Welcome to Dento' }).first()).toBeVisible();

    // Form fields
    await expect(page.getByPlaceholder(/doctor@clinic\.com/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    await console.verify();
  });
});
