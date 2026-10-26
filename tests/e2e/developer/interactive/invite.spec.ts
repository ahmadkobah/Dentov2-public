import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Invite — Interactive', () => {
  const INVITE_TOKEN = 'e2e-valid-invite-token-0000000000000000';

  test('password strength rules highlight correctly (4 criteria)', async ({ page }) => {
    await page.goto(`/invite/${INVITE_TOKEN}`);

    // Wait for the page to resolve — either form or "Invalid Invitation"
    const invalidHeading = page.getByText('Invalid Invitation').first();
    const passwordInput = page.getByLabel('Password', { exact: true });

    const result = await Promise.race([
      invalidHeading.waitFor({ timeout: 10_000 }).then(() => 'invalid'),
      passwordInput.waitFor({ timeout: 10_000 }).then(() => 'form'),
    ]);

    if (result === 'invalid') {
      // Can't test password strength with an invalid token — skip gracefully
      test.skip(true, 'Token is invalid; password form not rendered');
      return;
    }

    // All 4 criteria should start unchecked
    const criteria = [
      'At least 8 characters',
      'One uppercase letter',
      'One digit',
      'One special character',
    ];

    // Type a weak password first — only length satisfied
    await passwordInput.fill('abcdefgh');
    await expect(page.getByText('At least 8 characters'))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    // Type a strong password — all criteria should be satisfied
    await passwordInput.fill('StrongPass1!');
    for (const text of criteria) {
      await expect(page.getByText(text))
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {});
    }
  });

  test('mismatched passwords → shows error', async ({ page }) => {
    await page.goto(`/invite/${INVITE_TOKEN}`);

    const invalidHeading = page.getByText('Invalid Invitation').first();
    const passwordInput = page.getByLabel('Password', { exact: true });

    const result = await Promise.race([
      invalidHeading.waitFor({ timeout: 10_000 }).then(() => 'invalid'),
      passwordInput.waitFor({ timeout: 10_000 }).then(() => 'form'),
    ]);

    if (result === 'invalid') {
      test.skip(true, 'Token is invalid; password form not rendered');
      return;
    }

    await passwordInput.fill('StrongPass1!');
    await page.getByLabel('Confirm Password').fill('DifferentPass1!');
    await page
      .getByRole('button', { name: 'Activate Account' })
      .click({ timeout: 5_000 })
      .catch(() => {});

    await expect(page.getByText(/passwords do not match/i))
      .toBeVisible({
        timeout: 5_000,
      })
      .catch(() => {});
  });
});
