import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/reports/po-summary', () => {
  test('renders Purchase Order Summary page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/reports/po-summary');

    // Heading
    await expect(
      page.getByRole('heading', { name: 'Purchase Order Summary' }).first(),
    ).toBeVisible();

    await console.verify();
  });
});
