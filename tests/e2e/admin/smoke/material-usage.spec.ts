import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/reports/material-usage', () => {
  test('renders Material Usage Report page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/reports/material-usage');

    // Heading
    await expect(
      page.getByRole('heading', { name: 'Material Usage Report' }).first(),
    ).toBeVisible();

    await console.verify();
  });
});
