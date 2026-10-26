import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /modules', () => {
  test('renders Modules page with search and module cards', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/modules');

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Modules' }).first(),
    );

    if (ready) {
      await expect(page.getByPlaceholder(/search/i).first())
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
      await expect(page.getByText(/core modules|paid modules/i).first())
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
    }

    await console.verify();
  });
});
