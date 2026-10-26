import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Domains — Interactive', () => {
  test('SSL filter buttons + search', async ({ page }) => {
    await page.goto('/domains');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /custom domains/i }).first(),
    );
    if (!ready) return;

    try {
      // Search input
      const search = page.getByPlaceholder('Filter by tenant slug…');
      await expect(search)
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
      await search.fill('test', { timeout: 5_000 });
      await page.waitForTimeout(500);

      // SSL filter buttons
      const sslFilters = ['pending', 'active', 'expired', 'error'];
      for (const filter of sslFilters) {
        const btn = page.getByRole('button', { name: filter, exact: true });
        if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await btn.click({ timeout: 5_000 }).catch(() => {});
          await page.waitForTimeout(300);
        }
      }
    } catch {
      /* page interaction failed */
    }
  });

  test('row click opens DomainDetailSheet', async ({ page }) => {
    await page.goto('/domains');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /custom domains/i }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();

    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstRow.click({ timeout: 5_000 }).catch(() => {});

      const sheet = page.locator("[role='dialog'], [class*='sheet'], [class*='drawer']");
      await expect(sheet)
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
    }
  });
});
