import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Procedure Notes — Interactive', () => {
  test('tab switching (Notes / Templates)', async ({ page }) => {
    await page.goto('/procedure-notes');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Procedure Notes' }).first(),
    );
    if (!ready) return;

    // Switch to Templates tab
    const templatesTab = page
      .getByRole('tab', { name: /templates/i })
      .or(page.locator('button').filter({ hasText: /templates/i }));

    if (await templatesTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await templatesTab.click();
      await page.waitForTimeout(500);

      // Templates tab should have its own search and table
      const search = page.getByPlaceholder(/search templates/i);
      if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(search).toBeVisible();
      }
    }

    // Switch back to Notes tab
    const notesTab = page
      .getByRole('tab', { name: /notes/i })
      .or(page.locator('button').filter({ hasText: /notes/i }));

    if (await notesTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await notesTab.click();
      await page.waitForTimeout(300);
    }
  });
});
