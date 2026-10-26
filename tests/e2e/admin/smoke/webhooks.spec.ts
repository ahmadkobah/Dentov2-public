import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /webhooks', () => {
  test('renders Webhooks page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/webhooks');

    // Heading
    await assertPageHeading(page, page.getByRole('heading', { name: 'Webhooks' }).first());

    await console.verify();
  });
});
