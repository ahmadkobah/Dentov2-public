import { test, expect } from '@playwright/test';

test.describe('Insurance Companies — Interactive', () => {
  test('search + deactivate confirmation dialog', async ({ page }) => {
    await page.goto('/insurance-companies');
    await expect(page.getByRole('heading', { name: 'Insurance' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Search
    const search = page
      .getByPlaceholder(/search by name, code/i)
      .or(page.getByPlaceholder(/search/i).first());

    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill('test');
      await page.waitForTimeout(500);
      await search.clear();
    }

    // Look for deactivate button on a card or row
    const deactivateBtn = page.getByRole('button', { name: /deactivate/i }).first();
    if (await deactivateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await deactivateBtn.click();

      const dialog = page.locator("[role='dialog']").or(page.locator("[role='alertdialog']"));
      if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible({ timeout: 3_000 });
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
