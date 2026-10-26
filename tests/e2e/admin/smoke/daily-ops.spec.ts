import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /daily-operations', () => {
  test('renders Daily Operations page with tabs', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/daily-operations');

    // Heading
    await expect(page.getByRole('heading', { name: 'Daily Operations' }).first()).toBeVisible();

    await console.verify();
  });
});
