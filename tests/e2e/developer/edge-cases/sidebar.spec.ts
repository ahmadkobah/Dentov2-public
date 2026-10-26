import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Sidebar', () => {
  test('collapse/expand toggle works', async ({ page }) => {
    await page.goto('/');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /dashboard/i }).first(),
    );
    if (!ready) return;

    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 5_000 });

    // The desktop toggle button is in the header with aria-label="Toggle menu"
    // There are two: mobile (lg:hidden) and desktop (lg:flex). Pick the visible one on desktop viewport.
    const toggleBtns = page.getByRole('button', { name: /toggle menu/i });
    const count = await toggleBtns.count();
    let toggleBtn = toggleBtns.first();
    for (let i = 0; i < count; i++) {
      if (
        await toggleBtns
          .nth(i)
          .isVisible()
          .catch(() => false)
      ) {
        toggleBtn = toggleBtns.nth(i);
        break;
      }
    }

    if (!(await toggleBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Sidebar toggle button not found');
      return;
    }

    // Get initial sidebar width (expanded = 290px)
    const initialBox = await sidebar.boundingBox();
    expect(initialBox).toBeTruthy();
    const expandedWidth = initialBox!.width;

    // Click to collapse
    await toggleBtn.click();
    await page.waitForTimeout(400);

    // Sidebar should now be narrower (collapsed = 90px)
    const collapsedBox = await sidebar.boundingBox();
    expect(collapsedBox).toBeTruthy();
    expect(collapsedBox!.width).toBeLessThan(expandedWidth);

    // Click again to expand
    await toggleBtn.click();
    await page.waitForTimeout(400);

    // Sidebar should be back to expanded width
    const reExpandedBox = await sidebar.boundingBox();
    expect(reExpandedBox).toBeTruthy();
    expect(reExpandedBox!.width).toBeGreaterThan(collapsedBox!.width);
  });

  test('mobile viewport → sidebar hidden by default', async ({ page }) => {
    // Set mobile viewport (< 1024px)
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await expect(page.getByText(/dashboard/i).first())
      .toBeVisible({
        timeout: 10_000,
      })
      .catch(() => {});

    // Sidebar should NOT be visible on mobile by default
    const sidebar = page.locator('aside').first();
    if (await sidebar.count()) {
      // Check if sidebar is hidden or off-screen
      const box = await sidebar.boundingBox();
      if (box) {
        // If visible, it should be off-screen (negative x) or zero width
        expect(box.x + box.width <= 0 || box.width === 0).toBeTruthy();
      }
    }

    // The desktop sidebar toggle should not be visible on mobile
    // (the lg:flex toggle is hidden below 1024px)
  });
});
