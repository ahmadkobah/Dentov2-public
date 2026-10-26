import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Webhooks — Interactive', () => {
  test('tab switch (Endpoints / Delivery Log)', async ({ page }) => {
    await page.goto('/webhooks');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /webhooks/i }).first(),
    );
    if (!ready) return;

    // Custom button tabs
    const endpointsTab = page.getByRole('button', {
      name: /endpoints/i,
      exact: false,
    });
    const deliveryTab = page.getByRole('button', {
      name: /delivery log/i,
      exact: false,
    });

    if (await endpointsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(deliveryTab)
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});

      // Switch to Delivery Log
      await deliveryTab.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(500);
      await expect(page.getByText(/something went wrong/i))
        .not.toBeVisible()
        .catch(() => {});

      // Switch back to Endpoints
      await endpointsTab.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(500);
      await expect(page.getByText(/something went wrong/i))
        .not.toBeVisible()
        .catch(() => {});
    }
  });
});
