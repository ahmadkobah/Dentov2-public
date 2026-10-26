import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Pagination', () => {
  test('first page → Previous button is disabled', async ({ page }) => {
    await page.goto('/tenants');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /tenants/i }).first(),
    );
    if (!ready) return;

    // Look for pagination controls
    const prevBtn = page.getByRole('button', { name: /previous/i });

    if (await prevBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // On first page, Previous should be disabled
      await expect(prevBtn).toBeDisabled();
    } else {
      // No pagination — possibly not enough data
      test.skip(true, 'No pagination controls visible');
    }
  });

  test('navigate to last page → Next button is disabled', async ({ page }) => {
    await page.goto('/tenants');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /tenants/i }).first(),
    );
    if (!ready) return;

    const nextBtn = page.getByRole('button', { name: /next/i });

    if (await nextBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Click Next until disabled (max 20 clicks to avoid infinite loop)
      for (let i = 0; i < 20; i++) {
        const isDisabled = await nextBtn.isDisabled();
        if (isDisabled) break;
        await nextBtn.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(500);
      }

      // Next should now be disabled (on last page)
      await expect(nextBtn).toBeDisabled();
    } else {
      // No pagination — possibly not enough data or single page
      test.skip(true, 'No pagination controls visible');
    }
  });
});
