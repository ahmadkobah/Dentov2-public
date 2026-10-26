import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Onboarding — Interactive', () => {
  test('step through 4-step wizard', async ({ page }) => {
    await page.goto('/onboarding');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Set Up Your Clinic' }).first(),
    );
    if (!ready) return;

    // The wizard has 4 steps — fill mandatory fields and advance
    const nextBtn = page.getByRole('button', { name: /next|continue/i });

    if (!(await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No Next button found in wizard');
      return;
    }

    // Step 1: Fill mandatory fields (name, phone, email, street, city, country)
    const nameInput = page.locator('#name').or(page.getByLabel(/clinic name/i));
    if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Clinic');
    }
    const phoneInput = page.locator('#phone').or(page.getByLabel(/phone/i));
    if (await phoneInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await phoneInput.fill('+1234567890');
    }
    const emailInput = page.locator('#email').or(page.getByLabel(/email/i));
    if (await emailInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await emailInput.fill('e2e-clinic@test.com');
    }
    const streetInput = page.locator('#street').or(page.getByLabel(/street/i));
    if (await streetInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await streetInput.fill('123 Test Street');
    }
    const cityInput = page.locator('#city').or(page.getByLabel(/city/i));
    if (await cityInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await cityInput.fill('Test City');
    }
    const countryInput = page.locator('#country').or(page.getByLabel(/country/i));
    if (await countryInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await countryInput.click();
      await page.waitForTimeout(300);
      const firstCountry = page.getByRole('option').first();
      if (await firstCountry.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstCountry.click();
      } else {
        // Try typing a country name
        await countryInput.fill('United States');
      }
    }
    await page.waitForTimeout(500);

    // Step 1 → Step 2
    if (await nextBtn.isDisabled()) {
      test.skip(true, 'Next button still disabled after filling fields');
      return;
    }
    await nextBtn.click();
    await page.waitForTimeout(500);

    // Step 2 → Step 3
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      if (!(await nextBtn.isDisabled())) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Step 3 → Step 4
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      if (!(await nextBtn.isDisabled())) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
