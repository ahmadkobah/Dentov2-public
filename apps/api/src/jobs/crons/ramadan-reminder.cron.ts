/**
 * Ramadan Mode Reminder Cron Job
 *
 * Per GAP_IMPLEMENTATION_PLAN — Sprint 4.4 (P2 #15)
 *
 * Runs daily at 09:00. During Sha'ban (the month before Ramadan),
 * checks proximity to Ramadan start and sends reminder notifications
 * to tenant admins to enable Ramadan mode (adjusted schedules, hours, etc.).
 *
 * Notification triggers:
 *   - 30 days before Ramadan
 *   - 14 days before Ramadan
 *   - 7 days before Ramadan
 *   - 1 day before Ramadan
 */

import type { Job } from 'bullmq';
import mongoose from 'mongoose';
import { QUEUE_NAMES, addCronJob, createWorker, getQueue } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { getTenantDb } from '../../config/database.js';
import type { ITenant } from '../../platform/models/tenant.model.js';
import type { IUser } from '../../platform/models/user.model.js';
import { daysUntilRamadan, isDuringRamadan } from '../../utils/hijri.js';
import { getSettingsModel, type SettingsKey } from '../../tenant/models/settings.model.js';
import { getBranchModel } from '../../tenant/models/branch.model.js';

// Days before Ramadan to send reminders
const REMINDER_DAYS = [30, 14, 7, 1];

// ── Cron Registration ─────────────────────────────────────

export async function startRamadanReminderCron() {
  await addCronJob(QUEUE_NAMES.RAMADAN_REMINDER, 'check-ramadan-proximity', '0 9 * * *');
  await addCronJob(QUEUE_NAMES.RAMADAN_REMINDER, 'auto-toggle-ramadan-mode', '5 0 * * *');

  logger.info('Ramadan Reminder cron registered (daily at 09:00) + auto-toggle (daily at 00:05)');
}

// ── Worker ────────────────────────────────────────────────

export function startRamadanReminderWorker() {
  const worker = createWorker(
    QUEUE_NAMES.RAMADAN_REMINDER,
    async (job: Job) => {
      if (job.name === 'check-ramadan-proximity') {
        await checkAndNotify();
        return;
      }
      if (job.name === 'auto-toggle-ramadan-mode') {
        await autoToggleRamadanMode();
        return;
      }
    },
    { concurrency: 1 },
  );

  logger.info('Ramadan Reminder worker started');
  return worker;
}

// ── Core Logic ────────────────────────────────────────────

async function checkAndNotify() {
  const days = daysUntilRamadan();

  if (days < 0) {
    logger.debug('No upcoming Ramadan found in lookup table — skipping');
    return;
  }

  if (!REMINDER_DAYS.includes(days)) {
    logger.debug({ daysUntilRamadan: days }, 'Not a reminder day — skipping');
    return;
  }

  logger.info({ daysUntilRamadan: days }, 'Ramadan reminder trigger — notifying tenant admins');

  const platformDb = mongoose.connection;
  const Tenant = platformDb.model<ITenant>('Tenant');
  const tenants = await Tenant.find({ status: 'active' }).select('slug').lean();

  const notificationQueue = getQueue(QUEUE_NAMES.NOTIFICATION_DELIVERY);
  let notified = 0;

  for (const tenant of tenants) {
    try {
      const tenantDb = await getTenantDb(tenant.slug);
      const Settings = getSettingsModel(tenantDb);

      // Check if tenant already has Ramadan mode enabled — skip if so.
      // 'ramadan' is not part of the typed SettingsKey union (Ramadan mode is
      // tracked on branches / appointment settings), so the key is asserted to
      // preserve the existing query; a missing key simply resolves to `null`.
      const ramadanSettings = await Settings.findOne({ key: 'ramadan' as SettingsKey }).lean();
      const ramadanEnabled =
        (ramadanSettings?.value as Record<string, unknown> | undefined)?.enabled === true;

      if (ramadanEnabled) continue;

      // Find admin users to notify (User is a platform model)
      const User = mongoose.connection.model<IUser>('User');
      const admins = await User.find({
        tenantSlug: tenant.slug,
        role: { $in: ['tenant_admin'] },
        status: 'active',
      })
        .select('_id')
        .lean();

      if (admins.length === 0) continue;

      // Queue notification for each admin
      for (const admin of admins) {
        await notificationQueue.add('deliver', {
          tenantSlug: tenant.slug,
          userId: String(admin._id),
          type: 'ramadan_reminder',
          title:
            days === 1
              ? 'Ramadan starts tomorrow — enable Ramadan mode'
              : `Ramadan starts in ${days} days — prepare your schedule`,
          body:
            days === 1
              ? 'Enable Ramadan mode to apply adjusted working hours, break schedules, and appointment slots for the holy month.'
              : `Ramadan is ${days} days away. Consider enabling Ramadan mode in clinic settings to prepare adjusted schedules for staff and appointments.`,
          data: { daysUntilRamadan: days },
          channels: ['in_app'],
        });
      }

      notified++;
    } catch (err) {
      logger.error({ err, tenantSlug: tenant.slug }, 'Failed to send Ramadan reminder for tenant');
    }
  }

  logger.info(
    { tenantsNotified: notified, daysUntilRamadan: days },
    'Ramadan reminder batch complete',
  );
}

// ── Auto-Toggle Ramadan Mode ──────────────────────────────

async function autoToggleRamadanMode() {
  const ramadanActive = isDuringRamadan();

  const platformDb = mongoose.connection;
  const Tenant = platformDb.model<ITenant>('Tenant');
  const tenants = await Tenant.find({ status: 'active' }).select('slug').lean();

  let toggled = 0;

  for (const tenant of tenants) {
    try {
      const tenantDb = await getTenantDb(tenant.slug);
      const Branch = getBranchModel(tenantDb);

      if (ramadanActive) {
        // Enable Ramadan mode on branches that have ramadanHours configured but mode is off
        const result = await Branch.updateMany(
          {
            isActive: true,
            isRamadanMode: false,
            'ramadanHours.0': { $exists: true },
          },
          { $set: { isRamadanMode: true } },
        );
        toggled += result.modifiedCount;
      } else {
        // Disable Ramadan mode on all branches where it's still on
        const result = await Branch.updateMany(
          { isRamadanMode: true },
          { $set: { isRamadanMode: false } },
        );
        toggled += result.modifiedCount;
      }
    } catch (err) {
      logger.error(
        { err, tenantSlug: tenant.slug },
        'Failed to auto-toggle Ramadan mode for tenant',
      );
    }
  }

  logger.info({ ramadanActive, branchesToggled: toggled }, 'Auto-toggle Ramadan mode complete');
}
