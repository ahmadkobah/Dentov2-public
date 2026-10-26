import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /onboarding', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders clinic onboarding wizard', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/onboarding');

    // Heading
    await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Set Up Your Clinic' }).first(),
    );

    await console.verify();
  });
});
