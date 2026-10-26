import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/reports/abc-analysis', () => {
  test('renders ABC Analysis page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/reports/abc-analysis');

    // Heading
    await expect(page.getByRole('heading', { name: 'ABC Analysis' }).first()).toBeVisible();

    await console.verify();
  });
});
