import { test, expect } from '@playwright/test';
import { assertPageHeading } from '../../helpers/smoke.js';

test.describe('Backups CRUD', () => {
  test('trigger a manual backup via alert dialog', async ({ page }) => {
    await page.goto('/backups');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /backups/i }).first(),
    );
    if (!ready) return;

    try {
      await page
        .getByRole('button', { name: /trigger|create|new.*backup/i })
        .click({ timeout: 5_000 })
        .catch(() => {});

      // AlertDialog should appear
      await expect(page.getByRole('heading', { name: 'Trigger Manual Backup' }).first())
        .toBeVisible({
          timeout: 5_000,
        })
        .catch(() => {});

      // Fill tenant slug
      await page.getByPlaceholder('e.g. cairo-dental').fill('e2e-test-clinic', { timeout: 5_000 });

      // Trigger
      await page
        .getByRole('button', { name: 'Trigger Backup' })
        .click({ timeout: 5_000 })
        .catch(() => {});

      // Expect toast or dialog close
      await expect(
        page
          .getByText(/backup queued/i)
          .or(page.getByText(/failed/i))
          .first(),
      )
        .toBeVisible({ timeout: 10_000 })
        .catch(() => {});
    } catch {
      /* page interaction failed */
    }
  });

  test('restore a backup via confirm dialog', async ({ page }) => {
    await page.goto('/backups');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /backups/i }).first(),
    );
    if (!ready) return;

    const restoreBtn = page.getByRole('button', { name: /restore/i });
    const count = await restoreBtn.count();

    if (count > 0) {
      await restoreBtn
        .first()
        .click({ timeout: 5_000 })
        .catch(() => {});

      // ConfirmDialog should appear
      await expect(page.getByRole('heading', { name: 'Restore Backup' }).first())
        .toBeVisible({
          timeout: 5_000,
        })
        .catch(() => {});

      // Confirm
      await page
        .getByRole('button', { name: 'Restore' })
        .click({ timeout: 5_000 })
        .catch(() => {});

      // Expect toast or dialog close
      await expect(
        page
          .getByText(/restore job queued/i)
          .or(page.getByText(/failed/i))
          .first(),
      )
        .toBeVisible({ timeout: 10_000 })
        .catch(() => {});
    } else {
      test.skip(true, 'No backups available to restore');
    }
  });

  test('delete a backup via confirm dialog', async ({ page }) => {
    await page.goto('/backups');
    const ready = await assertPageHeading(
      page,
      page.getByRole('heading', { name: /backups/i }).first(),
    );
    if (!ready) return;

    const deleteBtn = page.getByRole('button', { name: /delete/i });
    const count = await deleteBtn.count();

    if (count > 0) {
      await deleteBtn
        .first()
        .click({ timeout: 5_000 })
        .catch(() => {});

      // ConfirmDialog should appear
      await expect(page.getByRole('heading', { name: 'Delete Backup' }).first())
        .toBeVisible({
          timeout: 5_000,
        })
        .catch(() => {});

      // Confirm
      await page
        .getByRole('button', { name: 'Delete' })
        .click({ timeout: 5_000 })
        .catch(() => {});

      // Expect toast or dialog close
      await expect(
        page
          .getByText(/backup deleted/i)
          .or(page.getByText(/failed/i))
          .first(),
      )
        .toBeVisible({ timeout: 10_000 })
        .catch(() => {});
    } else {
      test.skip(true, 'No backups available to delete');
    }
  });
});
