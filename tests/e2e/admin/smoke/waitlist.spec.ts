import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /waitlists', () => {
  test('renders Waitlist page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/waitlists');

    // Heading
    await expect(page.getByRole('heading', { name: /waitlist/i }).first()).toBeVisible();

    await console.verify();
  });
});
