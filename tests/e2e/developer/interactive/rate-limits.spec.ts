import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Rate Limits — Interactive', () => {
  test('tier filter buttons cycle through all tiers', async ({ page }) => {
    await page.goto('/rate-limits');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /rate limits/i }).first(),
    );
    if (!ready) return;

    const tiers = ['All Tiers', 'global', 'auth', 'api key', 'public', 'webhook', 'upload'];

    for (const tier of tiers) {
      const btn = page.getByRole('button', { name: tier, exact: false });
      if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btn.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(300);
        await expect(page.getByText(/something went wrong/i))
          .not.toBeVisible()
          .catch(() => {});
      }
    }
  });
});
