/**
 * Notification Delivery Worker — Generic In-App / Push Router
 *
 * Consumes the NOTIFICATION_DELIVERY queue, which is fed by:
 *   - ramadan-reminder.cron  (job name: 'deliver')
 *   - chat-push.worker       (job name: 'chat-push-notification')
 *
 * Both producers use slightly different job shapes, so we normalise
 * before routing to the appropriate delivery channel.
 */

import type { Job } from 'bullmq';
import type { NotificationType } from '@dento/shared';
import { QUEUE_NAMES, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { getTenantDb } from '../../config/database.js';
import {
  createNotificationModel,
  createDeviceTokenModel,
} from '../../tenant/models/notification.model.js';
import { socketEmitter } from '../../plugins/socket.plugin.js';
import { getPushQueue } from '../../services/notification.service.js';

// ── Normalised Job Shape ────────────────────────────────────

interface NormalisedDelivery {
  tenantSlug: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: string[];
}

/**
 * Shape A — ramadan-reminder (flat fields):
 *   { tenantSlug, userId, type, title, body, data, channels }
 *
 * Shape B — chat-push (nested notification):
 *   { tenantSlug, recipientId, channels, notification: { type, title, body, data } }
 */
function normalise(raw: Record<string, unknown>): NormalisedDelivery {
  if (raw.notification && typeof raw.notification === 'object') {
    // Shape B
    const n = raw.notification as Record<string, unknown>;
    return {
      tenantSlug: String(raw.tenantSlug),
      userId: String(raw.recipientId),
      type: String(n.type ?? 'generic'),
      title: String(n.title ?? ''),
      body: String(n.body ?? ''),
      data: (n.data as Record<string, unknown>) ?? undefined,
      channels: (raw.channels as string[]) ?? ['in_app'],
    };
  }

  // Shape A (flat)
  return {
    tenantSlug: String(raw.tenantSlug),
    userId: String(raw.userId),
    type: String(raw.type ?? 'generic'),
    title: String(raw.title ?? ''),
    body: String(raw.body ?? ''),
    data: (raw.data as Record<string, unknown>) ?? undefined,
    channels: (raw.channels as string[]) ?? ['in_app'],
  };
}

// ── Processor ───────────────────────────────────────────────

async function processDelivery(job: Job) {
  const delivery = normalise(job.data as Record<string, unknown>);

  logger.info(
    { tenantSlug: delivery.tenantSlug, userId: delivery.userId, channels: delivery.channels },
    'Processing notification delivery',
  );

  for (const channel of delivery.channels) {
    try {
      switch (channel) {
        case 'in_app': {
          const tenantDb = await getTenantDb(delivery.tenantSlug);
          const Notification = createNotificationModel(tenantDb);

          const notification = await Notification.create({
            userId: delivery.userId,
            title: { en: delivery.title, ar: delivery.title },
            body: { en: delivery.body, ar: delivery.body },
            icon: 'bell',
            variant: 'info',
            category: 'system',
            tenantId: delivery.tenantSlug,
            isRead: false,
            isDismissed: false,
            isActive: true,
          });

          socketEmitter.notification(delivery.userId, {
            _id: notification._id.toString(),
            userId: delivery.userId,
            tenantId: delivery.tenantSlug,
            type: delivery.type as NotificationType,
            title: { en: delivery.title, ar: delivery.title },
            body: { en: delivery.body, ar: delivery.body },
            isRead: false,
            isDismissed: false,
            createdAt: notification.createdAt.toISOString(),
          });

          logger.debug({ userId: delivery.userId }, 'In-app notification delivered');
          break;
        }

        case 'push': {
          const tenantDb = await getTenantDb(delivery.tenantSlug);
          const DeviceToken = createDeviceTokenModel(tenantDb);

          const tokens = await DeviceToken.find({
            userId: delivery.userId,
            isActive: true,
          })
            .select('token platform')
            .lean();

          if (tokens.length === 0) {
            logger.debug({ userId: delivery.userId }, 'No device tokens — skipping push');
            break;
          }

          await getPushQueue().add('send-push', {
            tokens: tokens.map((t: any) => t.token),
            tokenPlatforms: tokens.map((t: any) => t.platform ?? 'web'),
            title: delivery.title,
            body: delivery.body,
            tenantId: delivery.tenantSlug,
            templateKey: '',
            logId: '',
          });

          logger.debug({ userId: delivery.userId, tokenCount: tokens.length }, 'Push queued');
          break;
        }

        default:
          logger.warn({ channel }, 'Unsupported delivery channel — skipping');
      }
    } catch (err) {
      logger.error({ channel, userId: delivery.userId, err }, 'Channel delivery failed');
    }
  }
}

// ── Worker Start ────────────────────────────────────────────

export function startNotificationDeliveryWorker() {
  const worker = createWorker(QUEUE_NAMES.NOTIFICATION_DELIVERY, processDelivery, {
    concurrency: 10,
  });

  logger.info('Notification delivery worker started');
  return worker;
}
