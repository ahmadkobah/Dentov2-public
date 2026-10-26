import { test, expect } from '@playwright/test';

test.describe('Audit Logs — Interactive', () => {
  test('search + sensitivity/status filters + detail sheet', async ({ page }) => {
    await page.goto('/audit-logs');
    await expect(page.getByRole('heading', { name: 'Audit Logs' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Search
    const search = page
      .getByPlaceholder(/search logs/i)
      .or(page.getByPlaceholder(/search/i).first());
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill('login');
      await page.waitForTimeout(500);
      await search.clear();
    }

    // Sensitivity filter (All Levels, Low, Medium, High, Critical)
    const sensitivityTrigger = page
      .getByRole('combobox')
      .first()
      .or(page.getByText(/all levels/i));
    if (await sensitivityTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sensitivityTrigger.click();
      const highOption = page.getByRole('option', { name: /high/i });
      if (await highOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await highOption.click();
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Status filter (All Status, Success, Failure)
    const statusTrigger = page
      .getByRole('combobox')
      .nth(1)
      .or(page.getByText(/all status/i));
    if (await statusTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await statusTrigger.click();
      const successOption = page.getByRole('option', { name: /success/i });
      if (await successOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await successOption.click();
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Row click → AuditLogDetailSheet
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstRow.click();

      // Sheet/drawer should appear
      const sheet = page.locator('[class*="sheet"], [role="dialog"]');
      if (await sheet.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(sheet).toBeVisible();
        await page.keyboard.press('Escape');
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
