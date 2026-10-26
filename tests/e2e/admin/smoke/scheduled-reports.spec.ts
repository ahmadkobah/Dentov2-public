import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /reports/scheduled', () => {
  test('renders Scheduled Reports page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/reports/scheduled');

    // Heading
    await expect(page.getByRole('heading', { name: 'Scheduled Reports' }).first()).toBeVisible();

    await console.verify();
  });
});
