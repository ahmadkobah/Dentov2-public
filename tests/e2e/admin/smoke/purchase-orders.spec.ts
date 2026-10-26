import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/purchase-orders', () => {
  test('renders Purchase Orders page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/purchase-orders');

    // Heading
    await assertPageHeading(page, page.getByRole('heading', { name: 'Purchase Orders' }).first());

    await console.verify();
  });
});
