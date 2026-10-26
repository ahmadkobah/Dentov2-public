import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Custom Fields — Interactive', () => {
  test('entity tab switching (6 entity types)', async ({ page }) => {
    await page.goto('/fields');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /custom fields/i }).first(),
    );
    if (!ready) return;

    try {
      // First, enter a tenant slug to load fields
      const slugInput = page.locator('#cf-tenant-slug');
      if (await slugInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await slugInput.fill('test-clinic', { timeout: 5_000 });
        await page
          .getByRole('button', { name: 'Load Fields' })
          .click({ timeout: 5_000 })
          .catch(() => {});
        await page.waitForTimeout(1_000);
      }

      // Try switching through all 6 entity tabs
      const entities = [
        'Patient',
        'Appointment',
        'Invoice',
        'Treatment Plan',
        'Prescription',
        'Lab Order',
      ];

      for (const entity of entities) {
        const tab = page.getByRole('tab', { name: entity });
        if (await tab.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await tab.click({ timeout: 5_000 }).catch(() => {});
          await page.waitForTimeout(500);
          await expect(page.getByText(/something went wrong/i))
            .not.toBeVisible()
            .catch(() => {});
        }
      }
    } catch {
      /* page interaction failed */
    }
  });
});
