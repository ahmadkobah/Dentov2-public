import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /commissions', () => {
  test('renders Doctor Commissions page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/commissions');

    // Heading
    await expect(page.getByRole('heading', { name: 'Doctor Commissions' }).first()).toBeVisible();

    await console.verify();
  });
});
