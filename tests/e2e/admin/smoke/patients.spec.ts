import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /patients', () => {
  test('renders Patients page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/patients');

    // Heading
    await expect(page.getByRole('heading', { name: 'Patients' }).first()).toBeVisible();

    // Search input
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();

    await console.verify();
  });
});
