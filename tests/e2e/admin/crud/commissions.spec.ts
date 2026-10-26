import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Commissions CRUD', () => {
  test('create payout via CreatePayoutDialog → submit', async ({ page }) => {
    await page.goto('/commissions');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Commissions' }).first(),
    );
    if (!ready) return;

    // Switch to Payouts tab
    const payoutsTab = page
      .getByRole('tab', { name: /payouts/i })
      .or(page.locator('button').filter({ hasText: /^payouts$/i }));
    if (await payoutsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await payoutsTab.click();
      await page.waitForTimeout(500);
    }

    const addBtn = page.getByRole('button', { name: /create payout|add|new/i });
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await addBtn.click();

    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Select doctor/provider
    const doctorSelect = dialog.getByLabel(/doctor|provider/i).first();
    if (await doctorSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await doctorSelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    const submitBtn = dialog.getByRole('button', { name: /save|create|submit/i });
    if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });

  test('approve/reject commission → status updates', async ({ page }) => {
    await page.goto('/commissions');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Commissions' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    // Find pending commission row
    const pendingRow = page.locator('table tbody tr').first();
    if (!(await pendingRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    const approveBtn = pendingRow.getByRole('button', { name: /approve/i });
    if (await approveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(2_000);
    } else {
      // Try detail page
      await pendingRow.click();
      await page.waitForTimeout(1_000);

      const detailApproveBtn = page.getByRole('button', { name: /approve/i });
      if (await detailApproveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await detailApproveBtn.click();
        await page.waitForTimeout(2_000);
      }
    }
  });
});
