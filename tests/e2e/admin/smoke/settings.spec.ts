import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /settings', () => {
  test('renders Settings page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/settings');

    // Heading
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();

    await console.verify();
  });
});
