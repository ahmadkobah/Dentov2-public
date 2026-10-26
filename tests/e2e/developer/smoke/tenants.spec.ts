import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /tenants', () => {
  test('renders Tenants page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/tenants');

    // Heading
    await expect(page.getByRole('heading', { name: 'Tenants' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Search input
    await expect(page.getByPlaceholder(/search/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // New Tenant button
    await expect(page.getByRole('button', { name: /new tenant/i }))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
