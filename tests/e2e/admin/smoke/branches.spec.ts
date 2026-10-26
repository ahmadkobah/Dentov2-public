import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /branches', () => {
  test('renders Branches page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/branches');

    // Heading
    await expect(page.getByRole('heading', { name: 'Branches' }).first()).toBeVisible();

    // Key element
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();

    await console.verify();
  });
});
