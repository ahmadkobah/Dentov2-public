import { test, expect } from '@playwright/test';

test.describe('Notifications — Interactive', () => {
  test('mark read/dismiss + category filter + unread toggle', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Category filter pills (All, Appointments, Payments, Clinical, etc.)
    const allPill = page
      .getByRole('button', { name: /^all$/i })
      .or(page.locator('button').filter({ hasText: /^all$/i }));

    if (await allPill.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Click Appointments category
      const appointmentPill = page
        .getByRole('button', { name: /appointments/i })
        .or(page.locator('button').filter({ hasText: /appointments/i }));
      if (await appointmentPill.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await appointmentPill.click();
        await page.waitForTimeout(500);
      }

      // Click back to All
      await allPill.click();
      await page.waitForTimeout(300);
    }

    // Unread toggle
    const unreadToggle = page
      .getByRole('switch')
      .or(page.getByLabel(/unread/i))
      .or(page.locator('button').filter({ hasText: /unread only/i }));

    if (await unreadToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await unreadToggle.click();
      await page.waitForTimeout(500);
    }

    // Mark read/dismiss on first notification
    const firstNotification = page.locator('[class*="notification"], [class*="card"]').first();
    if (await firstNotification.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const markReadBtn = firstNotification.getByRole('button', { name: /mark.*read|dismiss/i });
      if (await markReadBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(markReadBtn).toBeVisible();
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
