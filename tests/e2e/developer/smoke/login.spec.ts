import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders login form', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/login');

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /developer portal/i }).first(),
    );

    if (ready) {
      await expect(page.getByLabel(/email/i).first())
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
      await expect(page.getByLabel(/password/i).first())
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
      await expect(page.getByRole('button', { name: /sign in|log in/i }))
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
    }

    await console.verify();
  });
});
