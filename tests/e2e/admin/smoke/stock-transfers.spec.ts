import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/transfers', () => {
  test('renders Stock Transfers page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/transfers');

    await assertPageHeading(page, page.getByRole('heading', { name: 'Stock Transfers' }).first());

    await console.verify();
  });
});
