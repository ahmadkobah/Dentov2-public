import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /dental-charts', () => {
  test('renders Dental Chart page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/dental-charts');

    // Heading — shows "Select a Patient" when no patient loaded, or "Dental Chart"
    await expect(
      page.getByRole('heading', { name: /Dental Chart|Select a Patient/i }).first(),
    ).toBeVisible();

    await console.verify();
  });
});
