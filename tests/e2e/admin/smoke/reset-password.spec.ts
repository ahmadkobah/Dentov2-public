import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /reset-password', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders reset password form', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/reset-password');

    // Without a token, page shows "Invalid Reset Link"
    // With a token, page shows "Reset Password" form
    await expect(
      page.getByRole('heading', { name: /reset password|invalid reset link/i }).first(),
    ).toBeVisible();

    await console.verify();
  });
});
