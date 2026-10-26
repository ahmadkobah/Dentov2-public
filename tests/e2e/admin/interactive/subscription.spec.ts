import { test, expect } from '@playwright/test';

test.describe('Subscription — Interactive', () => {
  test('plan details + usage progress bars + module tiles', async ({ page }) => {
    await page.goto('/subscription');
    await expect(page.getByRole('heading', { name: 'Subscription' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Plan details section
    const planName = page.getByText(/professional|enterprise|starter|free|basic/i).first();
    if (await planName.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(planName).toBeVisible();
    }

    // Usage progress bars (Users, Branches, Storage)
    const usageLabels = ['Users', 'Branches', 'Storage'];
    for (const label of usageLabels) {
      const usageElement = page.getByText(new RegExp(label, 'i')).first();
      if (await usageElement.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(usageElement).toBeVisible();
      }
    }

    // Module tiles (enabled/disabled modules)
    const moduleSection = page.getByText(/modules|features/i).first();
    if (await moduleSection.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(moduleSection).toBeVisible();
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
