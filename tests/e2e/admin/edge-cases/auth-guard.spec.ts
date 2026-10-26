import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

// These tests run WITHOUT authenticated storage state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Auth Guard', () => {
  test('unauthenticated visit → redirects to /login', async ({ page }) => {
    await page.goto('/patients');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // Login form should be visible
    const emailInput = page
      .locator('#email')
      .or(page.getByLabel(/email/i))
      .or(page.getByPlaceholder(/email/i));
    await expect(emailInput.first()).toBeVisible();
  });

  test('expired session → redirects to login', async ({ page }) => {
    // Set an expired/invalid token in storage
    await page.context().addCookies([
      {
        name: 'token',
        value: 'expired-invalid-token-xyz',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/patients');
    await page.waitForTimeout(3_000);

    // Should redirect to login after backend rejects the token
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
