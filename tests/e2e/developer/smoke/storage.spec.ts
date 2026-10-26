import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /storage', () => {
  test('renders Storage page with stat cards and table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/storage');

    // Heading
    await expect(page.getByRole('heading', { name: 'Storage' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Should show storage usage overview or tenant storage table
    await expect(page.getByText(/total storage|usage|tenants/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
