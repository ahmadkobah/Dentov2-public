import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /installments', () => {
  test('renders Installment Plans page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/installments');

    // Heading
    await expect(page.getByRole('heading', { name: 'Installment Plans' }).first()).toBeVisible();

    await console.verify();
  });
});
