import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /reconciliation', () => {
  test('renders Daily Reconciliation page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/reconciliation');

    // Heading
    await expect(page.getByRole('heading', { name: 'Daily Reconciliation' }).first()).toBeVisible();

    await console.verify();
  });
});
