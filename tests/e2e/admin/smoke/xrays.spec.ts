import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /xrays', () => {
  test('renders X-Rays page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/xrays');

    // Heading
    await expect(page.getByRole('heading', { name: 'X-Rays' }).first()).toBeVisible();

    await console.verify();
  });
});
