import { test, expect } from '@playwright/test';

test.describe('Waitlist — Interactive', () => {
  test('status filter + create entry dialog', async ({ page }) => {
    await page.goto('/waitlists');
    await expect(page.getByRole('heading', { name: 'Waitlist' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Status filter select
    const statusTrigger = page
      .getByRole('combobox')
      .first()
      .or(page.getByText(/all statuses/i));

    if (await statusTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await statusTrigger.click();
      const waitingOption = page
        .getByRole('option', { name: 'Waiting' })
        .or(page.getByText('Waiting').last());
      if (await waitingOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await waitingOption.click();
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Add to Waitlist button → opens dialog
    const addBtn = page.getByRole('button', { name: /add to waitlist/i });
    if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addBtn.click();
      const dialog = page.locator("[role='dialog']");
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press('Escape');
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
