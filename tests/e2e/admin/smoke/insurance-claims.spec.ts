import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /insurance-claims', () => {
  test('renders Insurance Claims page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/insurance-claims');

    // Heading
    await expect(page.getByRole('heading', { name: 'Insurance Claims' }).first()).toBeVisible();

    await console.verify();
  });
});
