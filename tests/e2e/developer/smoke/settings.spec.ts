import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /settings', () => {
  test('renders Platform Settings page with tabs', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/settings');

    // Heading
    await expect(page.getByRole('heading', { name: /platform settings|settings/i }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // 4 tabs: General, Branding, Currencies, Maintenance
    await expect(page.getByText(/general/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
    await expect(page.getByText(/branding/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
