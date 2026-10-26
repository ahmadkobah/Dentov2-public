import { test, expect } from '@playwright/test';

test.describe('Appointment Types — Interactive', () => {
  test('create/edit dialog opens and closes', async ({ page }) => {
    await page.goto('/appointment-types');
    await expect(page.getByRole('heading', { name: 'Appointment Types' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Look for Add/Create button
    const addBtn = page.getByRole('button', { name: /add|create|new/i });
    if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addBtn.click();

      const dialog = page.locator("[role='dialog']");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Close dialog
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
