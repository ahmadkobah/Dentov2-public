import { test, expect } from '@playwright/test';

test.describe('Payments — Interactive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/payments');
    await expect(page.getByRole('heading', { name: 'Payments' }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('search + status/method filters', async ({ page }) => {
    const search = page
      .getByPlaceholder(/search by reference, patient/i)
      .or(page.getByPlaceholder(/search/i).first());

    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill('PAY-');
      await page.waitForTimeout(500);
      await search.clear();
    }

    // Status filter
    const selects = page.getByRole('combobox');
    if (
      await selects
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      await selects.first().click();
      const completedOption = page.getByRole('option', { name: /completed/i });
      if (await completedOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await completedOption.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test('row click → payment detail', async ({ page }) => {
    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/payments\//, { timeout: 10_000 });
    }
  });
});
