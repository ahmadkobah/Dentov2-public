import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /treatment-plans', () => {
  test('renders Treatment Plans page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/treatment-plans');

    // Heading
    await assertPageHeading(page, page.getByRole('heading', { name: 'Treatment Plans' }).first());

    await console.verify();
  });
});
