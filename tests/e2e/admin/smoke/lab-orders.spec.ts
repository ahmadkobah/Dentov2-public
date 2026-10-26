import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /lab-orders', () => {
  test('renders Lab Orders page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/lab-orders');

    // Heading
    await expect(page.getByRole('heading', { name: 'Lab Orders' }).first()).toBeVisible();

    await console.verify();
  });
});
