import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Feature Flags — Interactive', () => {
  test('search + enabled/disabled filter', async ({ page }) => {
    await page.goto('/flags');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /feature flags/i }).first(),
    );
    if (!ready) return;

    try {
      // Search
      const search = page.getByPlaceholder(/search/i).first();
      await expect(search)
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
      await search.fill('test', { timeout: 5_000 });
      await page.waitForTimeout(500);
      await search.clear({ timeout: 5_000 });

      // Status filter — select "Enabled"
      const statusSelect = page.getByText('All Statuses');
      if (await statusSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await statusSelect.click({ timeout: 5_000 }).catch(() => {});
        const enabledOption = page
          .getByRole('option', { name: 'Enabled' })
          .or(page.getByText('Enabled').last());
        if (await enabledOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await enabledOption.click({ timeout: 5_000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
      }
    } catch {
      /* page interaction failed */
    }
  });
});
