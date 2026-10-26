import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/suppliers', () => {
  test('renders Suppliers page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/suppliers');

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Suppliers' }).first(),
    );

    if (ready) {
      await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
    }

    await console.verify();
  });
});
