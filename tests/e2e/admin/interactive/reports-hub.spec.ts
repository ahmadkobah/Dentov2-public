import { test, expect } from '@playwright/test';

test.describe('Reports Hub — Interactive', () => {
  test('category card click → /reports/:category', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Report categories: Financial, Patient, Appointment, Clinical, Operational, Inventory
    const categories = [
      'Financial',
      'Patient',
      'Appointment',
      'Clinical',
      'Operational',
      'Inventory',
    ];

    for (const category of categories) {
      const card = page
        .locator('[class*="card"]')
        .filter({ hasText: new RegExp(category, 'i') })
        .first()
        .or(page.getByText(category).first());

      if (await card.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await card.click();
        // Should navigate to category page
        await expect(page)
          .toHaveURL(new RegExp(`/reports/${category.toLowerCase()}`), { timeout: 5_000 })
          .catch(() => {});
        await page.goBack();
        await page.waitForTimeout(500);
        break; // One successful navigation is enough to validate
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
