/**
 * Inventory Expiry Cron Job
 *
 * Per DENTO_V2_MASTER_PLAN.md §16 — Inventory Management
 * Per PHASE_5_REMAINING_IMPLEMENTATION_PLAN — Phase B1
 *
 * Runs daily at 02:00. Processes expired inventory batches and
 * dispatches webhooks for newly expired / expiring-soon items.
 */

import type { Job } from 'bullmq';
import mongoose from 'mongoose';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { getTenantDb } from '../../config/database.js';
import { InventoryStockService } from '../../tenant/services/inventory-stock.service.js';
import { dispatchWebhook } from '../../tenant/services/webhook-dispatcher.js';
import { createNotificationModel } from '../../tenant/models/notification.model.js';
import type { ITenant } from '../../platform/models/tenant.model.js';
import type { IUser } from '../../platform/models/user.model.js';
import { socketEmitter } from '../../plugins/socket.plugin.js';

// ── Cron Registration ─────────────────────────────────────

export async function startExpiryCron() {
  await addCronJob(
    QUEUE_NAMES.INVENTORY_EXPIRY,
    'check-expiry',
    '0 2 * * *', // Daily at 02:00
  );

  logger.info('Inventory Expiry cron registered (daily at 02:00)');
}

// ── Worker ────────────────────────────────────────────────

export function startExpiryWorker() {
  const worker = createWorker(
    QUEUE_NAMES.INVENTORY_EXPIRY,
    async (job: Job) => {
      if (job.name === 'check-expiry') {
        await processAllTenantExpiry();
        return;
      }
    },
    { concurrency: 1 },
  );

  logger.info('Inventory Expiry worker started');
  return worker;
}

// ── Core Logic ────────────────────────────────────────────

async function processAllTenantExpiry() {
  const platformDb = mongoose.connection;

  const Tenant = platformDb.model<ITenant>('Tenant');
  const tenants = await Tenant.find({ status: 'active' }).select('slug').lean<ITenant[]>();

  let totalProcessed = 0;

  for (const tenant of tenants) {
    try {
      const tenantDb = await getTenantDb(tenant.slug);
      const tenantSlug = tenant.slug;

      // 1. Process expired batches (marks them as expired + creates movements)
      const stockService = new InventoryStockService(tenantDb);
      const { processedCount } = await stockService.processExpiredBatches();

      if (processedCount > 0) {
        totalProcessed += processedCount;

        // Dispatch inventory.expired webhook
        dispatchWebhook(tenantDb, {
          tenantId: tenantSlug,
          tenantSlug,
          event: 'inventory.expired',
          data: { processedCount, processedAt: new Date().toISOString() },
        }).catch((err) => logger.warn({ err, tenantSlug }, 'Webhook failed: inventory.expired'));
      }

      // 2. Check for batches expiring within 30 days
      const expiringBatches = await stockService.getExpiringBatches({
        daysAhead: 30,
      });

      const expiringCount = Array.isArray(expiringBatches) ? expiringBatches.length : 0;

      if (expiringCount > 0) {
        dispatchWebhook(tenantDb, {
          tenantId: tenantSlug,
          tenantSlug,
          event: 'inventory.expiring_soon',
          data: {
            expiringCount,
            windowDays: 30,
            checkedAt: new Date().toISOString(),
          },
        }).catch((err) =>
          logger.warn({ err, tenantSlug }, 'Webhook failed: inventory.expiring_soon'),
        );

        // Create in-app notification for tenant admin users
        try {
          const Notification = createNotificationModel(tenantDb);

          // Resolve admin users by role from platform User model
          const User = mongoose.connection.model<IUser>('User');
          const admins = await User.find({
            tenantSlug,
            role: { $in: ['tenant_admin'] },
            status: 'active',
          })
            .select('_id')
            .lean<IUser[]>();

          for (const admin of admins) {
            const userId = String(admin._id);

            const notification = await Notification.create({
              userId,
              title: {
                en: `Expiry Alert: ${expiringCount} batch(es) expiring within 30 days`,
                ar: `تنبيه انتهاء الصلاحية: ${expiringCount} دفعة ستنتهي خلال 30 يومًا`,
              },
              body: {
                en: `${expiringCount} inventory batch(es) will expire in the next 30 days. Review and plan disposals.`,
                ar: `ستنتهي صلاحية ${expiringCount} دفعة مخزون خلال 30 يومًا القادمة. راجع وخطط للتخلص منها.`,
              },
              icon: 'alert-triangle',
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
              type: 'inventory_expiring_soon',
              title: {
                en: `Expiry Alert: ${expiringCount} batch(es) expiring within 30 days`,
                ar: `تنبيه انتهاء الصلاحية: ${expiringCount} دفعة تنتهي خلال 30 يوماً`,
              },
              body: {
                en: `${expiringCount} inventory batch(es) will expire in the next 30 days.`,
                ar: `${expiringCount} دفعة من المخزون ستنتهي صلاحيتها خلال الـ 30 يوماً القادمة.`,
              },
              isRead: false,
              isDismissed: false,
              createdAt: notification.createdAt.toISOString(),
            });
          }
        } catch {
          // Notification model may not exist
        }
      }

      if (processedCount > 0 || expiringCount > 0) {
        logger.info({ tenantSlug, processedCount, expiringCount }, 'Tenant expiry check completed');
      }
    } catch (err) {
      logger.error({ tenantSlug: tenant.slug, err }, 'Error processing expiry for tenant');
    }
  }

  logger.info({ totalProcessed }, 'Inventory expiry cron completed');
}
