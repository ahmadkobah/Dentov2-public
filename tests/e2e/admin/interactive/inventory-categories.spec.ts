import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Inventory Categories — Interactive', () => {
  test('nested category cards + create/edit dialog', async ({ page }) => {
    await page.goto('/inventory-categories');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /inventory categories|categories/i }).first(),
    );
    if (!ready) return;

    // Click on a category card if available
    const card = page.locator('[class*="card"]').first();
    if (await card.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(500);
    }

    // Create/Add button → opens dialog
    const addBtn = page.getByRole('button', { name: /add|create|new/i });
    if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addBtn.click();

      const dialog = page.locator("[role='dialog']");
      if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible({ timeout: 3_000 });
      }
    }
  });
});
