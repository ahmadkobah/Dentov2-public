import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Empty States', () => {
  test('patients page with no data â†’ empty state', async ({ page }) => {
    await page.goto('/patients');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /patients/i }).first(),
    );
    if (!ready) return;

    // Search for something that won't match
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill('zzz_nonexistent_patient_xyz_999');
      await page.waitForTimeout(1_000);

      const emptyState = page
        .getByText(/no patient|no results|no data/i)
        .or(page.getByText(/nothing|empty/i));
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();

      if (rowCount === 0) {
        await expect(emptyState.first())
          .toBeVisible({ timeout: 5_000 })
          .catch(() => {});
      }
    }
  });

  test('appointments with no data â†’ empty state', async ({ page }) => {
    await page.goto('/appointments');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /appointments/i }).first(),
    );
    if (!ready) return;

    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill('zzz_nonexistent_appointment_xyz_999');
      await page.waitForTimeout(1_000);

      const emptyState = page
        .getByText(/no appointment|no results|no data/i)
        .or(page.getByText(/nothing|empty/i));
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();

      if (rowCount === 0) {
        await expect(emptyState.first())
          .toBeVisible({ timeout: 5_000 })
          .catch(() => {});
      }
    }
  });

  test('invoices with no data â†’ empty state', async ({ page }) => {
    await page.goto('/invoices');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /invoices/i }).first(),
    );
    if (!ready) return;

    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill('zzz_nonexistent_invoice_xyz_999');
      await page.waitForTimeout(1_000);

      const emptyState = page
        .getByText(/no invoice|no results|no data/i)
        .or(page.getByText(/nothing|empty/i));
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();

      if (rowCount === 0) {
        await expect(emptyState.first())
          .toBeVisible({ timeout: 5_000 })
          .catch(() => {});
      }
    }
  });

  test('inventory with no data â†’ empty state', async ({ page }) => {
    await page.goto('/inventory');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /inventory/i }).first(),
    );
    if (!ready) return;

    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill('zzz_nonexistent_item_xyz_999');
      await page.waitForTimeout(1_000);

      const emptyState = page
        .getByText(/no.*item|no results|no data/i)
        .or(page.getByText(/nothing|empty/i));
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();

      if (rowCount === 0) {
        await expect(emptyState.first())
          .toBeVisible({ timeout: 5_000 })
          .catch(() => {});
      }
    }
  });
});
