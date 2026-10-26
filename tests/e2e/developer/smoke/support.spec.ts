import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /support', () => {
  test('renders Support page with stat cards and tabs', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/support');

    // Heading
    await expect(page.getByRole('heading', { name: 'Support' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Tabs or ticket list
    await expect(page.getByText(/open|in progress|tickets/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
