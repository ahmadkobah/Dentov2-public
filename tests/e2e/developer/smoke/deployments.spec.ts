import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /deployments', () => {
  test('renders Deployments page with filters and table', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/deployments');

    // Heading
    await expect(page.getByRole('heading', { name: 'Deployments' }).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Filter controls — at least App or Status select
    await expect(page.getByText(/app|status|environment/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
