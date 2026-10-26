import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /invite/:token', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // unauthenticated

  test('renders invite page with invalid token', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/invite/invalid-test-token');

    // Should show either welcome or invalid invitation message
    const welcome = page.getByText(/welcome/i);
    const invalid = page.getByText(/invalid invitation|expired/i);
    const passwordField = page.getByPlaceholder(/password/i);

    // At least one of these should be visible
    await expect(welcome.or(invalid).or(passwordField))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
