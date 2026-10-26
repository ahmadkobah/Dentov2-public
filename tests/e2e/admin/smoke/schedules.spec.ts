import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /schedules', () => {
  test('renders Schedules page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/schedules');

    // Heading
    await expect(page.getByRole('heading', { name: 'Schedules' }).first()).toBeVisible();

    await console.verify();
  });
});
