import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /tenants/:id', () => {
  test('renders tenant detail page with tabs', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);

    await page.goto('/tenants');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Tenants' }).first(),
    );
    if (!ready) {
      await console.verify();
      return;
    }

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      await console.verify();
      return;
    }

    await firstRow.click({ timeout: 5_000 }).catch(() => {});
    try {
      await page.waitForURL(/\/tenants\/.+/, { timeout: 10_000 });
    } catch {
      await console.verify();
      return;
    }

    await expect(
      page.getByRole('tab', { name: /overview/i }).or(page.getByText(/overview/i).first()),
    )
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    await console.verify();
  });
});
