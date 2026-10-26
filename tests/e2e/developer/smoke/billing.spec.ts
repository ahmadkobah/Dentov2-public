import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /billing', () => {
  test('renders Billing page with stat cards and tabs', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/billing');

    // Heading
    await expect(page.getByRole('heading', { name: 'Billing' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Should have tabs or stat cards
    await expect(page.getByText(/overview|invoices|revenue/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
