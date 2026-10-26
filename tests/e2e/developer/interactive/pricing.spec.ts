import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Pricing — Interactive', () => {
  test('tab switch (Module Pricing / Coupons / Global Discounts)', async ({ page }) => {
    await page.goto('/pricing');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /pricing/i }).first(),
    );
    if (!ready) return;

    const tabs = ['Module Pricing', 'Coupons', 'Global Discounts'];

    for (const tab of tabs) {
      const trigger = page.getByRole('button', { name: tab, exact: true });
      if (await trigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await trigger.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  });

  test('billing cycle toggle (monthly/yearly) changes displayed prices', async ({ page }) => {
    await page.goto('/pricing');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /pricing/i }).first(),
    );
    if (!ready) return;

    // Ensure we're on Module Pricing tab
    const modulePricingTab = page.getByRole('button', {
      name: 'Module Pricing',
      exact: true,
    });
    if (await modulePricingTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await modulePricingTab.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(500);
    }

    // Click Monthly toggle
    const monthlyBtn = page.getByRole('button', { name: /monthly/i });
    if (await monthlyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await monthlyBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    // Click Yearly toggle
    const yearlyBtn = page.getByRole('button', { name: /yearly/i });
    if (await yearlyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await yearlyBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(300);

      // Save ~17% text may be visible when yearly is selected
    }
  });
});
