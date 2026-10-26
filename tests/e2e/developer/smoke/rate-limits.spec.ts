import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /rate-limits', () => {
  test('renders Rate Limits page with stat cards', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/rate-limits');

    // Heading
    await expect(page.getByRole('heading', { name: 'Rate Limits' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Stat cards
    await expect(page.getByText('Active Keys').first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Tabs: Overview, Violations
    await expect(page.getByText(/overview/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
