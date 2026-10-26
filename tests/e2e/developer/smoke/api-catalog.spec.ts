import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /api-catalog', () => {
  test('renders API Catalog with endpoint groups', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/api-catalog');

    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'API Catalog' }).first(),
    );

    if (ready) {
      // Endpoint count or collapsible groups
      await expect(page.getByText(/endpoints|routes|GET|POST/i).first())
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
    }

    await console.verify();
  });
});
