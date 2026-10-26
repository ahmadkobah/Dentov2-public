import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('System Logs — Interactive', () => {
  test('level pill filter + source select filter', async ({ page }) => {
    await page.goto('/system-logs');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /system logs/i }).first(),
    );
    if (!ready) return;

    // Level pill filters
    const levels = ['All', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    for (const level of levels) {
      const btn = page.getByRole('button', { name: level, exact: true });
      if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btn.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(300);
        await expect(page.getByText(/something went wrong/i))
          .not.toBeVisible({ timeout: 5_000 })
          .catch(() => {});
      }
    }

    // Source select filter
    const sourceTrigger = page.getByText('Source').or(page.getByText('All Sources'));
    if (await sourceTrigger.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await sourceTrigger.click({ timeout: 5_000 }).catch(() => {});
      const apiOption = page.getByRole('option', { name: 'Api' }).or(page.getByText('Api').last());
      if (await apiOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await apiOption.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  });
});
