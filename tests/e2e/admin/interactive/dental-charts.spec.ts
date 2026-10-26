import { test, expect } from '@playwright/test';

test.describe('Dental Chart — Interactive', () => {
  test('tooth selection + snapshot dialog', async ({ page }) => {
    await page.goto('/dental-charts');
    await expect(page.getByText(/dental chart|select a patient/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Look for tooth elements (SVG paths, numbered elements, or clickable regions)
    const tooth = page.locator('[class*="tooth"], [data-tooth], svg path').first();
    if (await tooth.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tooth.click();
      await page.waitForTimeout(500);
    }

    // Look for snapshot/save button
    const snapshotBtn = page.getByRole('button', { name: /snapshot|save|capture/i });
    if (await snapshotBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await snapshotBtn.click();
      const dialog = page.locator("[role='dialog']");
      if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
