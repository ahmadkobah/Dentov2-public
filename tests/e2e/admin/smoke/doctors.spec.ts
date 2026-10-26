import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /doctors', () => {
  test('renders Doctors page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/doctors');

    await assertPageHeading(page, page.getByRole('heading', { name: 'Doctors' }).first());

    await console.verify();
  });
});
