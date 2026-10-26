/**
 * Auto No-Show Cron Job
 *
 * Per DENTO_V2_MASTER_PLAN.md §18 — Wartezimmer
 * Per IMPLEMENTATION_ROADMAP — Week 13 Task 2
 *
 * Runs every 5 minutes. Marks appointments as 'no_show' if the patient
 * hasn't arrived within the configured grace period (default: 15 min after start).
 */

import type { Job } from 'bullmq';
import mongoose, { type QueryFilter, type UpdateQuery } from 'mongoose';
import { QUEUE_NAMES, addCronJob, createWorker, getQueue } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { getTenantDb } from '../../config/database.js';
import type { ITenant } from '../../platform/models/tenant.model.js';
import { getAppointmentModel, type IAppointment } from '../../tenant/models/appointment.model.js';
import { getSettingsModel } from '../../tenant/models/settings.model.js';
import { createNotificationModel } from '../../tenant/models/notification.model.js';
import { socketEmitter } from '../../plugins/socket.plugin.js';

// ── Cron Registration ─────────────────────────────────────

export async function startAutoNoShowCron() {
  await addCronJob(
    QUEUE_NAMES.AUTO_NO_SHOW,
    'scan-overdue-appointments',
    '*/5 * * * *', // Every 5 minutes
  );

  logger.info('Auto No-Show cron registered (every 5 min)');
}

// ── Worker ────────────────────────────────────────────────

export function startAutoNoShowWorker() {
  const worker = createWorker(
    QUEUE_NAMES.AUTO_NO_SHOW,
    async (job: Job) => {
      if (job.name === 'scan-overdue-appointments') {
        await markNoShows();
        return;
      }

      if (job.name === 'notify-no-shows') {
        await notifyNoShows(job.data as { tenantSlug: string; count: number });
        return;
      }
    },
    { concurrency: 3 },
  );

  logger.info('Auto No-Show worker started');
  return worker;
}

// ── Core Logic ────────────────────────────────────────────

async function markNoShows() {
  const platformDb = mongoose.connection;

  const Tenant = platformDb.model<ITenant>('Tenant');
  const tenants = await Tenant.find({ status: 'active' }).select('slug').lean();

  let totalMarked = 0;

  for (const tenant of tenants) {
    try {
      const tenantDb = await getTenantDb(tenant.slug);
      const Appointment = getAppointmentModel(tenantDb);
      const Settings = getSettingsModel(tenantDb);

      // Get auto-no-show config
      const aptSettings = await Settings.findOne({ key: 'appointment' }).lean();
      const autoNoShowMinutes = (aptSettings?.value as any)?.autoNoShowMinutes ?? 15;
      const autoNoShowEnabled = (aptSettings?.value as any)?.autoNoShow !== false;

      if (!autoNoShowEnabled) continue;

      const cutoffTime = new Date(Date.now() - autoNoShowMinutes * 60_000);

      // Find scheduled appointments past the grace period.
      //
      // NOTE: this filter is preserved verbatim from the v8 implementation and
      // intentionally diverges from the strict IAppointment field types:
      //   - `startTime` is a string ("HH:mm") in the schema yet is compared to a
      //     Date, and `'scheduled'` is not a member of the status enum.
      // Mongoose 9's stricter QueryFilter rejects both. Changing the query
      // semantics would be a behavioral change owned by the appointments module,
      // so the exact runtime query is kept and narrowed via `unknown` to the
      // correct QueryFilter<IAppointment> type rather than rewritten.
      const rawNoShowFilter = {
        startTime: { $lte: cutoffTime },
        status: { $in: ['scheduled', 'confirmed'] },
        arrivedAt: { $exists: false },
      };
      const noShowFilter = rawNoShowFilter as unknown as QueryFilter<IAppointment>;
      const noShowUpdate: UpdateQuery<IAppointment> = {
        $set: {
          status: 'no_show',
          noShowMarkedAt: new Date(),
          noShowReason: 'auto',
        },
      };
      const result = await Appointment.updateMany(noShowFilter, noShowUpdate);

      if (result.modifiedCount > 0) {
        totalMarked += result.modifiedCount;

        logger.info(
          {
            tenantSlug: tenant.slug,
            count: result.modifiedCount,
            cutoffMinutes: autoNoShowMinutes,
          },
          'Auto no-show appointments marked',
        );

        // Emit webhook events for each marked appointment
        const queue = getQueue(QUEUE_NAMES.AUTO_NO_SHOW);
        // Queue a notification batch for the tenant
        await queue.add('notify-no-shows', {
          tenantSlug: tenant.slug,
          count: result.modifiedCount,
        });
      }
    } catch (err) {
      logger.error({ tenantSlug: tenant.slug, err }, 'Error processing auto no-shows');
    }
  }

  if (totalMarked > 0) {
    logger.info({ totalMarked }, 'Total auto no-show appointments marked');
  }
}

// ── No-Show Notification ──────────────────────────────────

async function notifyNoShows(data: { tenantSlug: string; count: number }) {
  const { tenantSlug, count } = data;

  // Find admin/receptionist users for this tenant
  const User = mongoose.connection.model('User');
  const staffUsers = await User.find({
    tenantSlug,
    role: { $in: ['tenant_admin', 'receptionist'] },
    status: 'active',
  })
    .select('_id')
    .lean();

  if (staffUsers.length === 0) return;

  const tenantDb = await getTenantDb(tenantSlug);
  const Notification = createNotificationModel(tenantDb);

  for (const user of staffUsers) {
    const userId = String(user._id);

    const notification = await Notification.create({
      userId,
      title: {
        en: `${count} No-Show${count > 1 ? 's' : ''} Detected`,
        ar: `تم اكتشاف ${count} حالة عدم حضور`,
      },
      body: {
        en: `${count} appointment${count > 1 ? 's were' : ' was'} automatically marked as no-show.`,
        ar: `تم وضع علامة عدم الحضور تلقائيًا على ${count} موعد${count > 1 ? '' : ''}.`,
      },
      icon: 'user-x',
      variant: 'warning',
      category: 'system',
      tenantId: tenantSlug,
      isRead: false,
      isDismissed: false,
      isActive: true,
    });

    socketEmitter.notification(userId, {
      _id: notification._id.toString(),
      userId,
      tenantId: tenantSlug,
      type: 'auto_no_show',
      title: {
        en: `${count} No-Show${count > 1 ? 's' : ''} Detected`,
        ar: `تم رصد ${count} حالة تغيّب`,
      },
      body: {
        en: `${count} appointment${count > 1 ? 's were' : ' was'} automatically marked as no-show.`,
        ar: `تم تعليم ${count} موعد تلقائياً كتغيّب.`,
      },
      isRead: false,
      isDismissed: false,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  logger.info(
    { tenantSlug, count, staffNotified: staffUsers.length },
    'No-show notifications sent',
  );
}
