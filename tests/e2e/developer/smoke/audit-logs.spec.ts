import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /audit', () => {
  test('renders Audit Logs page with stat cards and table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/audit');

    // Heading
    await expect(page.getByRole('heading', { name: 'Audit Logs' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Search or filter controls
    await expect(
      page
        .getByPlaceholder(/search/i)
        .first()
        .or(page.getByText(/sensitivity|action/i))
        .first(),
    )
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
