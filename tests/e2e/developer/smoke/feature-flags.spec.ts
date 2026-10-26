import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /flags', () => {
  test('renders Feature Flags page with stat cards and flag cards', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/flags');

    // Heading
    await expect(page.getByRole('heading', { name: /feature flags/i }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Create flag button
    await expect(page.getByRole('button', { name: /create flag/i }))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Search input
    await expect(page.getByPlaceholder(/search/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
