import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /online-bookings', () => {
  test('renders Online Bookings page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/online-bookings');

    await assertPageHeading(page, page.getByRole('heading', { name: 'Online Bookings' }).first());

    await console.verify();
  });
});
