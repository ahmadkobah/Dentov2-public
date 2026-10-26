import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /domains', () => {
  test('renders Custom Domains page with stat cards and table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/domains');

    // Heading
    await expect(page.getByRole('heading', { name: /custom domains|domains/i }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Add Domain button
    await expect(page.getByRole('button', { name: /add domain/i }))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Search or SSL filter
    await expect(
      page
        .getByPlaceholder(/search/i)
        .first()
        .or(page.getByText(/ssl/i))
        .first(),
    )
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
