import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /reports/saved', () => {
  test('renders Saved Reports page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/reports/saved');

    // Heading
    await expect(page.getByRole('heading', { name: 'Saved Reports' }).first()).toBeVisible();

    await console.verify();
  });
});
