import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /leave', () => {
  test('renders Leave Management page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/leave');

    // Heading
    await expect(page.getByRole('heading', { name: 'Leave Management' }).first()).toBeVisible();

    await console.verify();
  });
});
