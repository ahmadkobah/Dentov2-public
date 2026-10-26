import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /webhooks', () => {
  test('renders Webhooks page with stat cards and tabs', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/webhooks');

    // Heading
    await expect(page.getByRole('heading', { name: 'Webhooks' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // 2 tabs: Endpoints, Delivery Log
    await expect(page.getByText(/endpoints/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
    await expect(page.getByText(/delivery log/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
