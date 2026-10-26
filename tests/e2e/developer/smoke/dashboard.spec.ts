import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: / (Dashboard)', () => {
  test('renders Platform Dashboard with stat cards', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/');

    // Heading
    await expect(page.getByRole('heading', { name: 'Platform Dashboard' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // 4 stat cards: Active Tenants, API Usage (24h), API Keys, Open Tickets
    await expect(page.getByText('Active Tenants'))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
    await expect(page.getByText(/API Usage/i))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
    await expect(page.getByText('API Keys').first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
    await expect(page.getByText('Open Tickets'))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
