/**
 * Push Notification Provider — web-push (VAPID)
 *
 * Per DENTO_V2_MASTER_PLAN.md §20 — Push Channel
 * Uses Web Push Protocol (VAPID) via `web-push` package
 * Compatible with FCM/APNs via service worker integration
 */

import webPush from 'web-push';
import { logger } from '../../utils/logger.js';
import type { PushCredentials } from '../provider-credentials.service.js';

// ── Types ───────────────────────────────────────────────────

export interface PushSendOptions {
  tokens: string[]; // Push subscription endpoints/tokens
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface PushSendResult {
  success: boolean;
  sent: number;
  failed: number;
  provider: 'web-push';
  errors?: string[];
}

// ── VAPID Configuration (platform defaults) ─────────────────

const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@dento.app';
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

let configured = false;

function ensureVapidConfigured(): boolean {
  if (configured) return true;
  if (!vapidPublicKey || !vapidPrivateKey) return false;

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  configured = true;
  return true;
}

// ── Push Send Function ──────────────────────────────────────

export async function sendPush(
  options: PushSendOptions,
  tenantConfig?: PushCredentials,
): Promise<PushSendResult> {
  const { tokens, title, body, icon, url, data } = options;

  // Determine if we use tenant VAPID or platform default
  const useTenantVapid =
    tenantConfig?.useCustom && tenantConfig.vapidPublicKey && tenantConfig.vapidPrivateKey;

  if (!useTenantVapid && !ensureVapidConfigured()) {
    logger.warn('VAPID keys not configured — push notifications simulated');
    logger.info({ title, tokenCount: tokens.length }, 'Push notification (simulated)');
    return { success: true, sent: tokens.length, failed: 0, provider: 'web-push' };
  }

  const payload = JSON.stringify({
    title,
    body,
    ...(icon && { icon }),
    ...(url && { url }),
    ...(data && { data }),
  });

  // Build per-call VAPID options for tenant or use global
  const sendOptions: webPush.RequestOptions = { TTL: 3600 };
  if (useTenantVapid) {
    sendOptions.vapidDetails = {
      subject: tenantConfig!.vapidSubject || 'mailto:support@dento.app',
      publicKey: tenantConfig!.vapidPublicKey!,
      privateKey: tenantConfig!.vapidPrivateKey!,
    };
  }

  const results = await Promise.allSettled(
    tokens.map((token) => {
      // Token can be a JSON subscription object or a simple endpoint URL
      let subscription: webPush.PushSubscription;
      try {
        subscription =
          typeof token === 'string' && token.startsWith('{')
            ? JSON.parse(token)
            : { endpoint: token, keys: { p256dh: '', auth: '' } };
      } catch {
        subscription = { endpoint: token, keys: { p256dh: '', auth: '' } };
      }

      return webPush.sendNotification(subscription, payload, sendOptions);
    }),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => String(r.reason));

  logger.info({ sent, failed, total: tokens.length }, 'Push notifications dispatched');

  return {
    success: failed === 0,
    sent,
    failed,
    provider: 'web-push',
    ...(errors.length > 0 && { errors }),
  };
}
