import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /services', () => {
  test('renders Services Catalog page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/services');

    await assertPageHeading(page, page.getByRole('heading', { name: 'Services Catalog' }).first());

    await console.verify();
  });
});
