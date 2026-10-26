import { test, expect } from '@playwright/test';

test.describe('Sidebar — Interactive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('group expand/collapse', async ({ page }) => {
    // Sidebar has section groups: Core, Clinical, Financial, Operations, Reports, System
    const groups = ['Clinical', 'Financial', 'Operations', 'Reports', 'System'];

    for (const group of groups) {
      const groupHeader = page.locator('nav').getByText(new RegExp(`^${group}$`, 'i'));
      if (await groupHeader.isVisible({ timeout: 2_000 }).catch(() => false)) {
        // Click to collapse
        await groupHeader.click();
        await page.waitForTimeout(300);
        // Click to expand again
        await groupHeader.click();
        await page.waitForTimeout(300);
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test('navigation to nested routes', async ({ page }) => {
    // Click through a few sidebar links to verify nested routes work
    const navLinks = [
      { name: /patients/i, url: /\/patients/ },
      { name: /appointments/i, url: /\/appointments/ },
      { name: /invoices/i, url: /\/invoices/ },
      { name: /settings/i, url: /\/settings/ },
    ];

    for (const link of navLinks) {
      const navItem = page
        .locator('nav')
        .getByRole('link', { name: link.name })
        .first()
        .or(page.locator('nav a').filter({ hasText: link.name }).first());

      if (await navItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await navItem.click();
        await expect(page).toHaveURL(link.url, { timeout: 5_000 });
        await page.waitForTimeout(300);
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
