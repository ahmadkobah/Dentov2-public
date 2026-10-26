import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /attendance', () => {
  test('renders Attendance page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/attendance');

    // Heading
    await expect(page.getByRole('heading', { name: 'Attendance' }).first()).toBeVisible();

    await console.verify();
  });
});
