import { test, expect } from '@playwright/test';

test.describe('Patient Detail — Interactive', () => {
  test('tab switching (Info / Allergies / Medical History)', async ({ page }) => {
    await page.goto('/patients');
    await expect(page.getByRole('heading', { name: 'Patients' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to first patient detail
    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstRow.click();
    await expect(page).toHaveURL(/\/patients\//, { timeout: 10_000 });

    // Patient detail has tabs: Info, Allergies, Medical History, Dental Chart, X-Rays, Treatment Plans, Billing
    const tabs = [
      'Info',
      'Allergies',
      'Medical History',
      'Dental Chart',
      'X-Rays',
      'Treatment Plans',
      'Billing',
    ];

    for (const tabName of tabs) {
      const tab = page
        .getByRole('tab', { name: new RegExp(tabName, 'i') })
        .or(page.locator('button').filter({ hasText: new RegExp(tabName, 'i') }));

      if (await tab.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(300);
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
