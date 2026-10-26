import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /appointment-types', () => {
  test('renders Appointment Types page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/appointment-types');

    // Heading
    await expect(page.getByRole('heading', { name: 'Appointment Types' }).first()).toBeVisible();

    // Search input
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();

    await console.verify();
  });
});
