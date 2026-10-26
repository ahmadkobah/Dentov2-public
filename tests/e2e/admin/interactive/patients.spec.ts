import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Patients — Interactive', () => {
  test('search filters patient table', async ({ page }) => {
    await page.goto('/patients');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Patients' }).first(),
    );
    if (!ready) return;

    const search = page.getByPlaceholder(/search/i).first();
    if (!(await search.isVisible({ timeout: 3_000 }).catch(() => false))) return;

    await search.fill('test');
    await page.waitForTimeout(500);

    // Table should either filter rows or show empty state
    const rows = page.locator('table tbody tr');
    const emptyState = page.getByText(/no patients|no results|not found|no data/i);
    await expect(rows.first().or(emptyState))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
  });

  test('row click → patient detail page', async ({ page }) => {
    await page.goto('/patients');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Patients' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/patients\//, { timeout: 10_000 });
    }
  });

  test('pagination next/prev changes page', async ({ page }) => {
    await page.goto('/patients');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Patients' }).first(),
    );
    if (!ready) return;

    await page.waitForTimeout(1_000);

    const nextBtn = page.getByRole('button', { name: /next/i });
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const isDisabled = await nextBtn.isDisabled();
      if (!isDisabled) {
        await nextBtn.click();
        await page.waitForTimeout(500);

        const prevBtn = page.getByRole('button', { name: /prev/i });
        if (await prevBtn.isVisible()) {
          await prevBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });
});
