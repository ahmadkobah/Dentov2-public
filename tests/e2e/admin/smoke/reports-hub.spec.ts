import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /reports', () => {
  test('renders Reports & Analytics page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/reports');

    // Heading
    await expect(page.getByRole('heading', { name: 'Reports & Analytics' }).first()).toBeVisible();

    await console.verify();
  });
});
