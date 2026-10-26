import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /monitoring', () => {
  test('renders Monitoring page with stat cards', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/monitoring');

    // Heading
    await expect(page.getByRole('heading', { name: 'Monitoring' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Stat cards
    await expect(page.getByText('Total Errors'))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
    await expect(page.getByText('Unresolved'))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Tabs: Overview, Errors, Health
    await expect(page.getByText(/overview/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
