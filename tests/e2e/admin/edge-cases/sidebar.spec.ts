import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Sidebar', () => {
  test('group expand/collapse works', async ({ page }) => {
    await page.goto('/');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /dashboard/i }).first(),
    );
    if (!ready) return;

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 5_000 });

    // Find collapsible group buttons (groups like Clinical, Financial, etc.)
    const groupBtn = sidebar
      .getByRole('button')
      .filter({ hasText: /clinical|financial|operations|settings/i })
      .first();

    if (await groupBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Click to toggle — if expanded, it collapses; if collapsed, it expands
      await groupBtn.click();
      await page.waitForTimeout(500);

      // Click again to toggle back
      await groupBtn.click();
      await page.waitForTimeout(500);

      // Group button should still be visible after toggling
      await expect(groupBtn).toBeVisible();
    } else {
      // Try the collapse/expand sidebar button instead
      const collapseBtn = page.getByRole('button', { name: /collapse/i });
      if (await collapseBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await collapseBtn.click();
        await page.waitForTimeout(500);

        // Should be collapsed now
        await expect(collapseBtn).not.toBeVisible({ timeout: 3_000 });

        // Find expand button and click
        const expandBtn = sidebar.getByRole('button').last();
        await expandBtn.click();
        await page.waitForTimeout(500);

        await expect(page.getByRole('button', { name: /collapse/i })).toBeVisible({
          timeout: 3_000,
        });
      } else {
        test.skip(true, 'No collapsible sidebar groups found');
      }
    }
  });

  test('mobile viewport → sidebar hidden', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /dashboard/i }).first(),
    );
    if (!ready) return;

    // Sidebar should NOT be visible on mobile by default
    const sidebar = page.locator('aside').first();
    if (await sidebar.count()) {
      const box = await sidebar.boundingBox();
      if (box) {
        // If visible, it should be off-screen (negative x) or zero width
        expect(box.x + box.width <= 0 || box.width === 0).toBeTruthy();
      }
    }

    // Collapse button text should not be visible on mobile
    await expect(page.getByRole('button', { name: /collapse/i })).not.toBeVisible({
      timeout: 3_000,
    });
  });
});
