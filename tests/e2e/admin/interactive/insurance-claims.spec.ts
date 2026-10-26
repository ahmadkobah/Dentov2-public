import { test, expect } from '@playwright/test';

test.describe('Insurance Claims — Interactive', () => {
  test('status filter + date range', async ({ page }) => {
    await page.goto('/insurance-claims');
    await expect(page.getByRole('heading', { name: 'Insurance Claims' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Status filter
    const statusTrigger = page
      .getByRole('combobox')
      .first()
      .or(page.getByText(/all statuses/i));

    if (await statusTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await statusTrigger.click();
      const pendingOption = page.getByRole('option', { name: /pending/i });
      if (await pendingOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await pendingOption.click();
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Date range picker
    const dateBtn = page
      .getByRole('button', { name: /date|range|period/i })
      .or(page.locator('[data-testid*="date"]'));

    if (await dateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await dateBtn.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
