import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /reports/history', () => {
  test('renders Report History page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/reports/history');

    // Heading
    await expect(page.getByRole('heading', { name: 'Report History' }).first()).toBeVisible();

    await console.verify();
  });
});
