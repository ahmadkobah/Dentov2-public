import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/reports/dead-stock', () => {
  test('renders Dead Stock Report page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/reports/dead-stock');

    // Heading
    await expect(page.getByRole('heading', { name: 'Dead Stock Report' }).first()).toBeVisible();

    await console.verify();
  });
});
