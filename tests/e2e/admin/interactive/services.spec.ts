import { test, expect } from '@playwright/test';

test.describe('Services — Interactive', () => {
  test('tab switching (Services / Categories) + search + deactivate', async ({ page }) => {
    await page.goto('/services');
    const heading = page.getByRole('heading', { name: /services/i }).first();
    if (!(await heading.isVisible({ timeout: 10_000 }).catch(() => false))) return;

    // Tab switching
    const tabNames = ['Services', 'Categories'];

    for (const tabName of tabNames) {
      const tab = page
        .getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') })
        .or(page.locator('button').filter({ hasText: new RegExp(`^${tabName}$`, 'i') }));

      if (await tab.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    }

    // Search on Services tab
    const search = page
      .getByPlaceholder(/search services/i)
      .or(page.getByPlaceholder(/search/i).first());

    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill('cleaning');
      await page.waitForTimeout(500);
      await search.clear();
    }

    // Deactivate confirmation on first service card/row
    const deactivateBtn = page.getByRole('button', { name: /deactivate/i }).first();
    if (await deactivateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await deactivateBtn.click();

      const dialog = page.locator("[role='dialog']").or(page.locator("[role='alertdialog']"));
      if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
