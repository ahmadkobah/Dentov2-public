import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /consent', () => {
  test('renders Consent Forms page with tabs', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/consent');

    // Heading
    await expect(page.getByRole('heading', { name: 'Consent Forms' }).first()).toBeVisible();

    await console.verify();
  });
});
