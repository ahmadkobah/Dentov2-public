import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/stock-count', () => {
  test('renders Stock Counts page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/stock-count');

    await assertPageHeading(page, page.getByRole('heading', { name: 'Stock Counts' }).first());

    await console.verify();
  });
});
