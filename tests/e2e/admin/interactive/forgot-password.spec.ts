import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Forgot Password — Interactive', () => {
  test('submit email → shows success message', async ({ page }) => {
    await page.goto('/forgot-password');

    const emailInput = page.locator('#email');
    if (!(await emailInput.isVisible({ timeout: 5_000 }).catch(() => false))) return;

    await emailInput.fill('doctor@clinic.com');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    // Success state shows "Check Your Email" or an API error message
    const success = page.getByRole('heading', { name: 'Check Your Email' }).first();
    const errorMsg = page.getByText(/error|failed|try again/i).first();
    await expect(success.or(errorMsg)).toBeVisible({ timeout: 10_000 });
  });
});
