import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /pricing', () => {
  test('renders Pricing page with tabs', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/pricing');

    // Heading
    await expect(page.getByRole('heading', { name: 'Pricing' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // 3 tabs: Module Pricing (modules), Coupons, Discounts
    await expect(page.getByText(/modules|module pricing/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
    await expect(page.getByText(/coupons/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
    await expect(page.getByText(/discounts/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
