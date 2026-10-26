import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: / (Dashboard)', () => {
  test('renders Dashboard with stat cards', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/');

    // Heading
    await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible();

    // Stat cards
    await expect(page.getByText("Today's Patients")).toBeVisible();
    await expect(page.getByText(/Appointments Remaining/i)).toBeVisible();

    await console.verify();
  });
});
