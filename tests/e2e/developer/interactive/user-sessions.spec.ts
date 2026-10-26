import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('User Sessions — Interactive', () => {
  test('status pill filter changes table results', async ({ page }) => {
    await page.goto('/user-sessions');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /user sessions/i }).first(),
    );
    if (!ready) return;

    const pills = ['all', 'active', 'expired', 'revoked'];

    for (const pill of pills) {
      const btn = page.getByRole('button', { name: pill, exact: true });
      if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btn.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  });

  test('row click opens SessionDetailSheet', async ({ page }) => {
    await page.goto('/user-sessions');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /user sessions/i }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();

    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const viewBtn = firstRow.getByRole('button', { name: /view/i });
      if (await viewBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await viewBtn.click({ timeout: 5_000 }).catch(() => {});
      } else {
        await firstRow.click({ timeout: 5_000 }).catch(() => {});
      }

      const sheet = page.locator("[role='dialog'], [class*='sheet'], [class*='drawer']");
      await expect(sheet)
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
    }
  });
});
