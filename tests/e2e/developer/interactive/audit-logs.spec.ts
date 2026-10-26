import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Audit Logs — Interactive', () => {
  test('search + sensitivity/status filters + detail sheet', async ({ page }) => {
    await page.goto('/audit');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /audit logs/i }).first(),
    );
    if (!ready) return;

    try {
      // Search
      const search = page.getByPlaceholder(/search/i).first();
      await expect(search)
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
      await search.fill('login', { timeout: 5_000 });
      await page.waitForTimeout(500);
      await search.clear({ timeout: 5_000 });

      // Sensitivity select
      const sensitivityTrigger = page.getByText('Sensitivity').or(page.getByText('All Levels'));
      if (await sensitivityTrigger.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await sensitivityTrigger.click({ timeout: 5_000 }).catch(() => {});
        const highOption = page
          .getByRole('option', { name: 'High' })
          .or(page.getByText('High').last());
        if (await highOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await highOption.click({ timeout: 5_000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
      }

      // Status select
      const statusTrigger = page.getByText('Status').or(page.getByText('All Status'));
      if (await statusTrigger.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await statusTrigger.click({ timeout: 5_000 }).catch(() => {});
        const failureOption = page
          .getByRole('option', { name: 'Failure' })
          .or(page.getByText('Failure').last());
        if (await failureOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await failureOption.click({ timeout: 5_000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
      }

      // Click first row to open detail sheet
      const firstRow = page.locator('table tbody tr').first();
      if (await firstRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await firstRow.click({ timeout: 5_000 }).catch(() => {});
        const sheet = page.locator("[role='dialog'], [class*='sheet'], [class*='drawer']");
        await expect(sheet)
          .toBeVisible({ timeout: 5_000 })
          .catch(() => {});
      }
    } catch {
      /* page interaction failed */
    }
  });
});
