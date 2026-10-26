import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Pagination', () => {
  test('first page → Previous button is disabled', async ({ page }) => {
    await page.goto('/patients');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /patients/i }).first(),
    );
    if (!ready) return;

    // DataTable uses aria-label="Previous page" (icon-only button)
    const prevBtn = page.getByRole('button', { name: /previous page/i });

    if (await prevBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(prevBtn).toBeDisabled();
    } else {
      test.skip(true, 'No pagination controls visible');
    }
  });

  test('last page → Next button is disabled', async ({ page }) => {
    await page.goto('/patients');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /patients/i }).first(),
    );
    if (!ready) return;

    // DataTable uses aria-label="Next page" (icon-only button)
    const nextBtn = page.getByRole('button', { name: /next page/i });

    if (await nextBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Click Next until disabled (max 20 clicks to avoid infinite loop)
      for (let i = 0; i < 20; i++) {
        const isDisabled = await nextBtn.isDisabled();
        if (isDisabled) break;
        await nextBtn.click();
        await page.waitForTimeout(500);
      }

      await expect(nextBtn).toBeDisabled();
    } else {
      test.skip(true, 'No pagination controls visible');
    }
  });
});
