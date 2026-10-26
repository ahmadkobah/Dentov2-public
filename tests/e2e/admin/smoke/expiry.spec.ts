import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/expiry', () => {
  test('renders Expiry Dashboard page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/expiry');

    // Heading
    await expect(page.getByRole('heading', { name: 'Expiry Dashboard' }).first()).toBeVisible();

    await console.verify();
  });
});
