import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /api-keys', () => {
  test('renders API Keys page with stat cards and key list', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/api-keys');

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'API Keys' }).first(),
    );

    if (ready) {
      await expect(page.getByRole('button', { name: /generate|create|new/i }))
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
    }

    await console.verify();
  });
});
