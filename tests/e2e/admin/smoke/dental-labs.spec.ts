import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /dental-labs', () => {
  test('renders Dental Labs page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/dental-labs');

    // Heading
    await assertPageHeading(page, page.getByRole('heading', { name: 'Dental Labs' }).first());

    await console.verify();
  });
});
