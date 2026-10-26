import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /appointments', () => {
  test('renders Appointments page with calendar', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/appointments');

    // Heading
    await expect(page.getByRole('heading', { name: 'Appointments' }).first()).toBeVisible();

    await console.verify();
  });
});
