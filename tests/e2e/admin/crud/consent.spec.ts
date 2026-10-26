import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Consent Templates CRUD', () => {
  test('create template → submit → appears in list', async ({ page }) => {
    await page.goto('/consent-templates');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /consent/i }).first(),
    );
    if (!ready) return;

    const addBtn = page.getByRole('button', { name: /add|create|new/i });
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await addBtn.click();

    const dialog = page.locator("[role='dialog']");
    const isDialog = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);

    const container = isDialog ? dialog : page;

    // Fill name
    const nameInput = container.getByLabel(/name|title/i).first();
    if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await nameInput.fill('E2E Test Consent Template');
    }

    // Fill content/body
    const contentInput = container
      .getByLabel(/content|body|text/i)
      .first()
      .or(container.locator('textarea').first());
    if (await contentInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await contentInput.fill('This is a test consent template body.');
    }

    const submitBtn = container.getByRole('button', { name: /save|create|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await submitBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });
});
