import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /notifications', () => {
  test('renders Notifications page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/notifications');

    // Heading
    await expect(page.getByRole('heading', { name: 'Notifications' }).first()).toBeVisible();

    await console.verify();
  });
});
