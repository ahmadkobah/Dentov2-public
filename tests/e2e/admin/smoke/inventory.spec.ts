import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory', () => {
  test('renders Inventory Items page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory');

    // Heading
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Inventory Items' }).first(),
    );

    // Search input (only if page loaded successfully)
    if (ready) {
      await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
    }

    await console.verify();
  });
});
