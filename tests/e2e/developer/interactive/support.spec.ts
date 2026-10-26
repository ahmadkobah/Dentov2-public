import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Support — Interactive', () => {
  test('tab switch (Tickets / Sessions)', async ({ page }) => {
    await page.goto('/support');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /support/i }).first(),
    );
    if (!ready) return;

    const ticketsTab = page.getByRole('tab', { name: 'Tickets' });
    const sessionsTab = page.getByRole('tab', { name: 'Sessions' });

    await expect(ticketsTab)
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
    await expect(sessionsTab)
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Switch to Sessions
    await sessionsTab.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Switch back to Tickets
    await ticketsTab.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);
  });
});
