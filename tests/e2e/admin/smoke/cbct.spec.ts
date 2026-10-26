import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /cbct', () => {
  test('renders CBCT Orders page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/cbct');

    // Heading
    await expect(page.getByRole('heading', { name: 'CBCT Orders' }).first()).toBeVisible();

    await console.verify();
  });
});
