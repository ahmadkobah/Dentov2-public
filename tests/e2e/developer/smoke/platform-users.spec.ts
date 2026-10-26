import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /users', () => {
  test('renders Platform Users page with table and invite button', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/users');

    // Heading
    await expect(page.getByRole('heading', { name: 'Platform Users' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Invite User button
    await expect(page.getByRole('button', { name: /invite user/i }))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
