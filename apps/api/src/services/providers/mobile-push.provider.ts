/**
 * Mobile Push Notification Provider — Expo Push + FCM v1
 *
 * Per GAP_IMPLEMENTATION_PLAN §5.2 — Mobile Push Provider
 * Supports:
 *   - Expo Push API: tokens starting with 'ExponentPushToken['
 *   - Firebase Cloud Messaging (FCM) v1: all other mobile tokens
 *
 * Dependencies (optional — gracefully simulates when absent):
 *   - `expo-server-sdk` for Expo push
 *   - `firebase-admin` for FCM
 *
 * Falls back to simulation mode if SDKs are not installed,
 * so the rest of the notification pipeline works without them.
 */

import { logger } from '../../utils/logger.js';

// ── Types ───────────────────────────────────────────────────

export interface MobilePushOptions {
  tokens: Array<{ token: string; platform: 'ios' | 'android' }>;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
}

export interface MobilePushResult {
  success: boolean;
  sent: number;
  failed: number;
  provider: 'expo' | 'fcm' | 'simulated';
  errors?: string[];
}

// ── Expo Push Helpers ───────────────────────────────────────

function isExpoToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

let expoClient: unknown = null;
let expoAvailable: boolean | null = null;

async function getExpoClient(): Promise<unknown> {
  if (expoAvailable === false) return null;

  try {
    // Dynamic import — only loads if expo-server-sdk is installed
    // @ts-expect-error - optional peer dependency
    const { Expo } = await import('expo-server-sdk');
    expoAvailable = true;
    if (!expoClient) {
      expoClient = new Expo();
    }
    return expoClient;
  } catch {
    expoAvailable = false;
    logger.warn('expo-server-sdk not installed — Expo push will be simulated');
    return null;
  }
}

// ── FCM Helpers ─────────────────────────────────────────────

let fcmAvailable: boolean | null = null;
let messagingInstance: unknown = null;

async function getFCMMessaging(): Promise<unknown> {
  if (fcmAvailable === false) return null;

  try {
    // @ts-expect-error - optional peer dependency
    const admin = await import('firebase-admin');
    fcmAvailable = true;

    // Initialize only once
    if (admin.default.apps?.length === 0) {
      admin.default.initializeApp({
        credential: admin.default.credential.applicationDefault(),
      });
    }

    if (!messagingInstance) {
      messagingInstance = admin.default.messaging();
    }
    return messagingInstance;
  } catch {
    fcmAvailable = false;
    logger.warn('firebase-admin not installed — FCM push will be simulated');
    return null;
  }
}

// ── Send Mobile Push ────────────────────────────────────────

async function sendViaExpo(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<MobilePushResult> {
  const client = (await getExpoClient()) as {
    chunkPushNotifications: (
      msgs: Array<{ to: string; title: string; body: string; data?: Record<string, unknown> }>,
    ) => Array<Array<{ to: string; title: string; body: string; data?: Record<string, unknown> }>>;
    sendPushNotificationsAsync: (
      chunk: Array<{ to: string; title: string; body: string; data?: Record<string, unknown> }>,
    ) => Promise<Array<{ status: string; message?: string }>>;
  } | null;

  if (!client) {
    // Simulate
    logger.info({ title, tokenCount: tokens.length }, 'Expo push (simulated)');
    return { success: true, sent: tokens.length, failed: 0, provider: 'simulated' };
  }

  const messages = tokens.map((token) => ({ to: token, title, body, data }));
  const chunks = client.chunkPushNotifications(messages);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const chunk of chunks) {
    try {
      const receipts = await client.sendPushNotificationsAsync(chunk);
      for (const receipt of receipts) {
        if (receipt.status === 'ok') sent++;
        else {
          failed++;
          if (receipt.message) errors.push(receipt.message);
        }
      }
    } catch (err) {
      failed += chunk.length;
      errors.push(String(err));
    }
  }

  return {
    success: failed === 0,
    sent,
    failed,
    provider: 'expo',
    ...(errors.length > 0 && { errors }),
  };
}

async function sendViaFCM(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<MobilePushResult> {
  const messaging = (await getFCMMessaging()) as {
    sendEachForMulticast: (msg: {
      tokens: string[];
      notification: { title: string; body: string };
      data?: Record<string, string>;
    }) => Promise<{
      successCount: number;
      failureCount: number;
      responses: Array<{ success: boolean; error?: { message: string } }>;
    }>;
  } | null;

  if (!messaging) {
    // Simulate
    logger.info({ title, tokenCount: tokens.length }, 'FCM push (simulated)');
    return { success: true, sent: tokens.length, failed: 0, provider: 'simulated' };
  }

  try {
    const stringData = data
      ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
      : undefined;

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      ...(stringData && { data: stringData }),
    });

    const errors = response.responses
      .filter((r) => !r.success && r.error)
      .map((r) => r.error!.message);

    return {
      success: response.failureCount === 0,
      sent: response.successCount,
      failed: response.failureCount,
      provider: 'fcm',
      ...(errors.length > 0 && { errors }),
    };
  } catch (err) {
    return {
      success: false,
      sent: 0,
      failed: tokens.length,
      provider: 'fcm',
      errors: [String(err)],
    };
  }
}

// ── Main Entry Point ────────────────────────────────────────

export async function sendMobilePush(options: MobilePushOptions): Promise<MobilePushResult> {
  const { tokens: tokenList, title, body, data } = options;

  if (tokenList.length === 0) {
    return { success: true, sent: 0, failed: 0, provider: 'simulated' };
  }

  // Split tokens by provider
  const expoTokens: string[] = [];
  const fcmTokens: string[] = [];

  for (const { token } of tokenList) {
    if (isExpoToken(token)) {
      expoTokens.push(token);
    } else {
      fcmTokens.push(token);
    }
  }

  const results: MobilePushResult[] = [];

  if (expoTokens.length > 0) {
    results.push(await sendViaExpo(expoTokens, title, body, data));
  }
  if (fcmTokens.length > 0) {
    results.push(await sendViaFCM(fcmTokens, title, body, data));
  }

  // Merge results
  const totalSent = results.reduce((s, r) => s + r.sent, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);
  const allErrors = results.flatMap((r) => r.errors ?? []);
  const provider = results.length === 1 ? results[0].provider : 'simulated';

  logger.info(
    { sent: totalSent, failed: totalFailed, expo: expoTokens.length, fcm: fcmTokens.length },
    'Mobile push notifications dispatched',
  );

  return {
    success: totalFailed === 0,
    sent: totalSent,
    failed: totalFailed,
    provider,
    ...(allErrors.length > 0 && { errors: allErrors }),
  };
}
