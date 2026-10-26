import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, assertPageHeading } from '../../helpers/smoke.js';

test.describe('Smoke: /notifications/templates', () => {
  test('renders Notification Templates page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/notifications/templates');

    // Heading
    await assertPageHeading(
      page,
      page.getByRole('heading', { name: 'Notification Templates' }).first(),
    );

    await console.verify();
  });
});
