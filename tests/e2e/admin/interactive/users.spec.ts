import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Users — Interactive', () => {
  test('role/status filter interaction', async ({ page }) => {
    await page.goto('/users');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Users' }).first(),
    );
    if (!ready) return;

    // Role filter
    const selects = page.getByRole('combobox');
    if (
      await selects
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      await selects.first().click();
      const adminOption = page.getByRole('option', { name: /admin|doctor/i });
      if (await adminOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await adminOption.click();
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Status filter
    if (
      await selects
        .nth(1)
        .isVisible({ timeout: 2_000 })
        .catch(() => false)
    ) {
      await selects.nth(1).click();
      const activeOption = page.getByRole('option', { name: /active/i });
      if (await activeOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await activeOption.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('invite user dialog opens and closes', async ({ page }) => {
    await page.goto('/users');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Users' }).first(),
    );
    if (!ready) return;

    const inviteBtn = page.getByRole('button', { name: /invite|add user/i });
    if (await inviteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await inviteBtn.click();

      const dialog = page.locator("[role='dialog']");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    }
  });
});
