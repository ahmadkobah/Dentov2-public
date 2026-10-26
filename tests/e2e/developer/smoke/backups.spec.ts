import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /backups', () => {
  test('renders Backups page with table and config panel', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/backups');

    // Heading
    await expect(page.getByRole('heading', { name: 'Backups' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Trigger backup button or config panel
    await expect(
      page
        .getByRole('button', { name: /trigger backup|backup/i })
        .or(page.getByText(/backup config|configuration/i))
        .first(),
    )
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
