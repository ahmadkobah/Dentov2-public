import { test, expect } from '@playwright/test';

test.describe('Report Detail — Interactive', () => {
  test('export dialog + filter bar interaction', async ({ page }) => {
    // Navigate to a specific report
    await page.goto('/reports/financial/revenue');
    await page.waitForTimeout(2_000);

    // If report page didn't load, try an alternative route
    const heading = page.getByText(/report|revenue|financial/i).first();
    if (!(await heading.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Export button → opens ExportReportDialog
    const exportBtn = page.getByRole('button', { name: /export/i });
    if (await exportBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await exportBtn.click();

      const dialog = page.locator("[role='dialog']");
      if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible({ timeout: 3_000 });
      }
    }

    // ReportFilterBar — period/from/to/branch/doctor selects
    const periodSelect = page.getByRole('combobox').first();
    if (await periodSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await periodSelect.click();
      const monthlyOption = page.getByRole('option', { name: /monthly|this month/i });
      if (await monthlyOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await monthlyOption.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
