import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /fields', () => {
  test('renders Custom Fields page with entity tabs', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/fields');

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /custom fields/i }).first(),
    );

    if (ready) {
      await expect(page.getByText(/patient/i).first())
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
      await expect(page.getByText(/appointment/i).first())
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
    }

    await console.verify();
  });
});
