import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/reports/supplier-performance', () => {
  test('renders Supplier Performance page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/reports/supplier-performance');

    // Heading
    await expect(page.getByRole('heading', { name: 'Supplier Performance' }).first()).toBeVisible();

    await console.verify();
  });
});
