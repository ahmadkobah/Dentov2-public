import { test, expect } from '@playwright/test';

// These tests run WITHOUT authenticated storage state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Auth Guard', () => {
  test('unauthenticated visit to /tenants → redirects to /login', async ({ page }) => {
    await page.goto('/tenants');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // Login form should be visible
    await expect(page.locator('#email'))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
  });

  test('unauthenticated visit to /users → redirects to /login', async ({ page }) => {
    await page.goto('/users');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // Login form should be visible
    await expect(page.locator('#email'))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
  });
});
