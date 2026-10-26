/**
 * Chat Push Worker — Offline Push Notifications for Chat Messages
 *
 * Per DEEP_SCAN_GAPS_REPORT — P1 #10
 *
 * When a chat message is sent via REST and the recipient has no active
 * socket connection, this worker sends a push notification so they are
 * aware of the new message.
 *
 * Job data: { tenantSlug, channelId, messageId, senderName, text, recipientIds }
 */

import { QUEUE_NAMES, getQueue, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import type { Job } from 'bullmq';

// ── Job Data ────────────────────────────────────────────────

export interface ChatPushJobData {
  tenantSlug: string;
  channelId: string;
  messageId: string;
  senderName: string;
  text: string;
  recipientIds: string[];
}

// ── Worker Processor ────────────────────────────────────────

async function processChatPush(job: Job<ChatPushJobData>) {
  const { tenantSlug, channelId, senderName, text, recipientIds } = job.data;

  logger.info(
    { tenantSlug, channelId, recipients: recipientIds.length },
    'Processing chat push notification',
  );

  for (const recipientId of recipientIds) {
    try {
      // Use the notification emitter to send push to offline users
      // The actual push delivery (VAPID web-push / FCM / Expo) is handled
      // by the existing NOTIFICATION_DELIVERY worker when we enqueue
      // a notification for the user.
      const notificationQueue = getQueue(QUEUE_NAMES.NOTIFICATION_DELIVERY);

      await notificationQueue.add(
        'chat-push-notification',
        {
          tenantSlug,
          recipientId,
          channels: ['push'],
          notification: {
            type: 'chat_message',
            title: senderName,
            body: text.length > 100 ? `${text.slice(0, 100)}…` : text,
            data: {
              channelId,
              messageId: job.data.messageId,
            },
          },
        },
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
        },
      );

      logger.debug({ recipientId, channelId }, 'Chat push notification enqueued');
    } catch (err) {
      logger.error({ recipientId, channelId, err }, 'Failed to enqueue chat push for recipient');
    }
  }
}

// ── Worker Start ────────────────────────────────────────────

export function startChatPushWorker() {
  return createWorker(QUEUE_NAMES.CHAT_PUSH, processChatPush, {
    concurrency: 10,
  });
}

// ── Helper: enqueue chat push job ───────────────────────────

export async function enqueueChatPush(data: ChatPushJobData) {
  const queue = getQueue(QUEUE_NAMES.CHAT_PUSH);
  await queue.add('chat-push', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
  });
}
