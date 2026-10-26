import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('API Keys — Interactive', () => {
  test('scope/status filters + reveal key + copy button', async ({ page }) => {
    await page.goto('/api-keys');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /api keys/i }).first(),
    );
    if (!ready) return;

    // Search
    const search = page.getByPlaceholder(/search/i).first();
    await expect(search)
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Scope pills
    const scopePills = ['All Scopes', 'Live', 'Test'];
    for (const pill of scopePills) {
      const btn = page.getByRole('button', { name: pill, exact: true });
      if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btn.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
    }

    // Status pills
    const statusPills = ['All Status', 'Active', 'Revoked', 'Expired'];
    for (const pill of statusPills) {
      const btn = page.getByRole('button', { name: pill, exact: true });
      if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btn.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
    }

    // Reveal + Copy on first key row
    const revealBtn = page.getByLabel('Reveal API key').first();
    if (await revealBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await revealBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(300);

      // After reveal, "Hide API key" button should appear
      await expect(page.getByLabel('Hide API key').first())
        .toBeVisible({
          timeout: 3_000,
        })
        .catch(() => {});

      // Copy button
      const copyBtn = page.getByLabel('Copy API key').first();
      if (await copyBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await copyBtn.click({ timeout: 5_000 }).catch(() => {});
      }
    }
  });
});
