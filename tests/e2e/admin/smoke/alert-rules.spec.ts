import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /notifications/alert-rules', () => {
  test('renders Alert Rules page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/notifications/alert-rules');

    // Heading
    await assertPageHeading(page, page.getByRole('heading', { name: 'Alert Rules' }).first());

    await console.verify();
  });
});
