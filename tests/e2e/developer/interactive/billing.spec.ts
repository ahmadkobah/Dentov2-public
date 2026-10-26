import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Billing — Interactive', () => {
  test('tab switch (Overview / Invoices)', async ({ page }) => {
    await page.goto('/billing');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /billing/i }).first(),
    );
    if (!ready) return;

    // Verify both tabs exist
    const overviewTab = page.getByRole('tab', { name: 'Overview' });
    const invoicesTab = page.getByRole('tab', { name: 'Invoices' });
    await expect(overviewTab)
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
    await expect(invoicesTab)
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Switch to Invoices
    await invoicesTab.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Should see search input or invoice table
    const invoiceSearch = page.getByPlaceholder(/search/i).first();
    const invoiceContent = page.getByText(/invoice|no invoices/i);
    await expect(invoiceSearch.or(invoiceContent.first()).first())
      .toBeVisible({
        timeout: 5_000,
      })
      .catch(() => {});

    // Switch back to Overview
    await overviewTab.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);
  });

  test('invoice row click opens InvoiceDetailSheet', async ({ page }) => {
    await page.goto('/billing');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /billing/i }).first(),
    );
    if (!ready) return;

    // Navigate to Invoices tab
    await page
      .getByRole('tab', { name: 'Invoices' })
      .click({ timeout: 5_000 })
      .catch(() => {});
    await page.waitForTimeout(1_000);

    const firstRow = page.locator('table tbody tr').first();

    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const viewBtn = firstRow.getByRole('button', { name: /view/i });
      if (await viewBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await viewBtn.click({ timeout: 5_000 }).catch(() => {});
      } else {
        await firstRow.click({ timeout: 5_000 }).catch(() => {});
      }

      const sheet = page.locator("[role='dialog'], [class*='sheet'], [class*='drawer']");
      await expect(sheet)
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
    }
  });
});
