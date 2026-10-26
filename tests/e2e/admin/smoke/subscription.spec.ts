import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /subscription', () => {
  test('renders Subscription & Billing page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/subscription');

    // Heading
    await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Subscription & Billing' }).first(),
    );

    await console.verify();
  });
});
