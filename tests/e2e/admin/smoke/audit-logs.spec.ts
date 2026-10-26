import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /audit-logs', () => {
  test('renders Audit Logs page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/audit-logs');

    // Heading
    await expect(page.getByRole('heading', { name: 'Audit Logs' }).first()).toBeVisible();

    await console.verify();
  });
});
