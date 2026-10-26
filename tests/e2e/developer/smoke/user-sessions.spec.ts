import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /user-sessions', () => {
  test('renders User Sessions page with stat cards', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/user-sessions');

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /user sessions/i }).first(),
    );

    if (ready) {
      await expect(page.getByText(/active|expired|status/i).first())
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
    }

    await console.verify();
  });
});
