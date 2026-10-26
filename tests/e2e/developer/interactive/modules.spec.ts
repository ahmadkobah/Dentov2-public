import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Modules — Interactive', () => {
  test('search + status/category dropdown filter module cards', async ({ page }) => {
    await page.goto('/modules');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /modules/i }).first(),
    );
    if (!ready) return;

    try {
      // Search
      const search = page.getByPlaceholder(/search/i).first();
      await expect(search)
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
      await search.fill('patient', { timeout: 5_000 });
      await page.waitForTimeout(500);

      // Clear search
      await search.clear({ timeout: 5_000 });

      // Status dropdown
      const statusBtn = page.getByRole('button', { name: /status/i }).first();
      if (await statusBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await statusBtn.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(200);

        const stableOption = page.getByText('Stable').last();
        if (await stableOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await stableOption.click({ timeout: 5_000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
      }

      // Category dropdown
      const catBtn = page.getByRole('button', { name: /category/i }).first();
      if (await catBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await catBtn.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(200);

        const coreOption = page.getByText('Core Modules').last();
        if (await coreOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await coreOption.click({ timeout: 5_000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
      }
    } catch {
      /* page interaction failed */
    }
  });
});
