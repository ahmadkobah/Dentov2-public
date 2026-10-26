import { test, expect } from '@playwright/test';

test.describe('Appointments — Interactive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/appointments');
    await expect(page.getByRole('heading', { name: 'Appointments' }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('calendar/list view toggle', async ({ page }) => {
    // Look for view toggle buttons (calendar vs list/table)
    const calendarView = page
      .getByRole('button', { name: /calendar/i })
      .or(page.locator('button').filter({ hasText: /calendar/i }));
    const listView = page
      .getByRole('button', { name: /list|table/i })
      .or(page.locator('button').filter({ hasText: /list|table/i }));

    if (await calendarView.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await calendarView.click();
      await page.waitForTimeout(500);
    }

    if (await listView.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await listView.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test('date navigation (next/prev)', async ({ page }) => {
    // Look for date navigation buttons
    const nextBtn = page
      .getByRole('button', { name: /next|chevron.*right|→/i })
      .or(page.locator('[aria-label*="next"]'));
    const prevBtn = page
      .getByRole('button', { name: /prev|chevron.*left|←/i })
      .or(page.locator('[aria-label*="prev"]'));

    if (
      await nextBtn
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      await nextBtn.first().click();
      await page.waitForTimeout(500);
    }

    if (
      await prevBtn
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      await prevBtn.first().click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
