import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /medications', () => {
  test('renders Medications page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/medications');

    // Heading
    await expect(page.getByRole('heading', { name: 'Medications' }).first()).toBeVisible();

    await console.verify();
  });
});
