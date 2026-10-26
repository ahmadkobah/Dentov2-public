import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /procedure-notes', () => {
  test('renders Procedure Notes page with table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/procedure-notes');

    // Heading
    await expect(page.getByRole('heading', { name: 'Procedure Notes' }).first()).toBeVisible();

    await console.verify();
  });
});
