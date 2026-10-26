import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from '../../helpers/smoke.js';

test.describe('Smoke: /inventory/reports/consumption-forecast', () => {
  test('renders Consumption Forecast page', async ({ page }) => {
    const console = await assertNoConsoleErrors(page);
    await page.goto('/inventory/reports/consumption-forecast');

    // Heading
    await expect(page.getByRole('heading', { name: 'Consumption Forecast' }).first()).toBeVisible();

    await console.verify();
  });
});
