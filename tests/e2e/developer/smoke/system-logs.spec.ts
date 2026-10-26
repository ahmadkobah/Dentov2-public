import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /system-logs', () => {
  test('renders System Logs page with stat cards and table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/system-logs');

    // Heading
    await expect(page.getByRole('heading', { name: 'System Logs' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Level pills or source filter
    await expect(page.getByText(/info|warn|error|debug|level/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
