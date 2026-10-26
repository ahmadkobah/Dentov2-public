import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /prescriptions', () => {
  test('renders Prescriptions page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/prescriptions');

    // Heading
    await expect(page.getByRole('heading', { name: 'Prescriptions' }).first()).toBeVisible();

    await console.verify();
  });
});
