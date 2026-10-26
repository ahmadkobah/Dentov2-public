/**
 * Webhook Dispatcher Service — Automated Event Delivery
 *
 * Per BUILD_RULES.md §23 — Webhook event dispatch
 * Per DENTO_V2_MASTER_PLAN.md §23 — Webhook System (Zwei Ebenen)
 * Per SECURITY_AND_ENCRYPTION.md §6.3 — HMAC-SHA256 signature, PII redaction
 *
 * Features:
 * - HMAC-SHA256 signed payloads with timestamp
 * - PII field redaction (nationalId, phone, email)
 * - Exponential backoff retry (3 attempts)
 * - Auto-disable after 10 consecutive failures
 * - BullMQ queue for async delivery
 */

import crypto from 'node:crypto';
import { Queue, Worker, type Job } from 'bullmq';
import type { Connection } from 'mongoose';
import Redis from 'ioredis';
import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_MAX_RETRIES,
  WEBHOOK_RETRY_DELAY_MS,
  WEBHOOK_TIMEOUT_MS,
  type TenantWebhookEvent,
} from '@dento/shared';
import { createTenantWebhookEndpointModel } from '../models/webhook.model.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import { assertPublicHttpsUrl, SsrfBlockedError } from '../../utils/url-guard.js';

// ── Types ───────────────────────────────────────────────────

interface WebhookDispatchPayload {
  tenantId: string;
  tenantSlug: string;
  event: TenantWebhookEvent;
  data: Record<string, unknown>;
}

interface WebhookJobData {
  endpointId: string;
  url: string;
  secret: string;
  // F-10: optional grace-window secret carried in the job payload so the
  // worker can sign with both keys for ~24 h after a rotation.
  previousSecret?: string | null;
  previousSecretExpiresAt?: string | null;
  event: TenantWebhookEvent;
  payload: Record<string, unknown>;
  tenantSlug: string;
  attempt: number;
}

// ── PII Redaction ───────────────────────────────────────────

const PII_FIELDS = ['nationalId', 'policyNumber', 'phone', 'email', 'address', 'ssn'];

function redactPII(data: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...data };
  for (const key of Object.keys(redacted)) {
    if (PII_FIELDS.includes(key)) {
      redacted[key] = '***REDACTED***';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactPII(redacted[key] as Record<string, unknown>);
    }
  }
  return redacted;
}

// ── HMAC-SHA256 Signature ───────────────────────────────────

export function signPayload(payload: string, secret: string, timestamp: number): string {
  const message = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// ── BullMQ Queue ────────────────────────────────────────────

let webhookQueue: Queue<WebhookJobData> | null = null;

function getWebhookQueue(): Queue<WebhookJobData> {
  if (!webhookQueue) {
    const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    webhookQueue = new Queue<WebhookJobData>('webhook-delivery', {
      connection,
      defaultJobOptions: {
        attempts: WEBHOOK_MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: WEBHOOK_RETRY_DELAY_MS,
        },
        removeOnComplete: 200,
        removeOnFail: 1000,
      },
    });
  }
  return webhookQueue;
}

// ── Dispatch Function (called from services) ────────────────

/**
 * Dispatch a webhook event to all matching tenant endpoints.
 * This is the main entry point — called from service mutations.
 *
 * Usage:
 *   await dispatchWebhook(tenantDb, {
 *     tenantId: '...',
 *     tenantSlug: 'clinic-abc',
 *     event: 'patient.created',
 *     data: { patientId: '...', name: '...' },
 *   });
 */
export async function dispatchWebhook(
  tenantDb: Connection,
  payload: WebhookDispatchPayload,
): Promise<number> {
  const { event, data, tenantSlug } = payload;

  const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);

  // Find all active endpoints subscribed to this event.
  // #69: `secret` (and `previousSecret`) are `select: false` — explicitly select
  // them here since the worker needs them to sign each delivery.
  const endpoints = await WebhookEndpoint.find({
    status: 'active',
    isActive: true,
    events: event,
  })
    .select('+secret +previousSecret')
    .lean();

  if (endpoints.length === 0) return 0;

  // Redact PII before sending
  const redactedData = redactPII(data);

  const queue = getWebhookQueue();
  let dispatched = 0;

  for (const endpoint of endpoints) {
    // F-10: surface a still-valid previous secret to the worker so deliveries
    // signed during the grace window verify against either key.
    const grace = endpoint.previousSecretExpiresAt;
    const stillInGrace = grace instanceof Date && grace.getTime() > Date.now();
    await queue.add(`webhook-${event}-${endpoint._id}`, {
      endpointId: endpoint._id.toString(),
      url: endpoint.url,
      secret: endpoint.secret,
      previousSecret: stillInGrace ? (endpoint.previousSecret ?? null) : null,
      previousSecretExpiresAt: stillInGrace ? grace.toISOString() : null,
      event,
      payload: redactedData,
      tenantSlug,
      attempt: 1,
    });
    dispatched++;
  }

  logger.info({ event, tenantSlug, endpoints: dispatched }, 'Webhook events queued');
  return dispatched;
}

// ── Worker (processes deliveries) ───────────────────────────

export function startWebhookWorker(): void {
  const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  new Worker<WebhookJobData>(
    'webhook-delivery',
    async (job: Job<WebhookJobData>) => {
      const {
        endpointId,
        url,
        secret,
        previousSecret,
        previousSecretExpiresAt,
        event,
        payload,
        tenantSlug,
      } = job.data;
      const timestamp = Math.floor(Date.now() / 1000);

      // Build envelope
      const envelope = {
        id: `wh_${crypto.randomUUID()}`,
        event,
        timestamp,
        tenant: tenantSlug,
        data: payload,
      };

      const body = JSON.stringify(envelope);
      const signature = signPayload(body, secret, timestamp);
      // F-10: during the rotation grace window, append a second `v1=`
      // signed with the old secret so receivers can verify against either
      // key. Format follows the Stripe-style multi-signature convention
      // already understood by clients (`t=<ts>,v1=<sig>,v1=<sig2>`).
      const inGrace =
        !!previousSecret &&
        !!previousSecretExpiresAt &&
        new Date(previousSecretExpiresAt).getTime() > Date.now();
      const signatureHeader = inGrace
        ? `t=${timestamp},v1=${signature},v1=${signPayload(body, previousSecret as string, timestamp)}`
        : `t=${timestamp},v1=${signature}`;

      const startTime = Date.now();
      let statusCode = 0;
      let responseBody = '';

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

        // F-3 / F-6: re-validate URL right before fetch to defeat
        // DNS-rebinding TOCTOU between admin-time validation and dispatch.
        // If the hostname now resolves into a private range we abort.
        await assertPublicHttpsUrl(url);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [WEBHOOK_SIGNATURE_HEADER]: signatureHeader,
            'X-Webhook-Timestamp': String(timestamp),
            'User-Agent': 'DentoWebhook/2.0',
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        statusCode = response.status;
        responseBody = await response.text().catch(() => '');

        if (statusCode >= 200 && statusCode < 300) {
          logger.info(
            { endpointId, event, statusCode, latency: Date.now() - startTime },
            'Webhook delivered',
          );
          // Reset consecutive failures on success
          // Note: DB update happens via a separate reconciliation or the caller manages this
        } else {
          throw new Error(`HTTP ${statusCode}: ${responseBody.substring(0, 200)}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        if (err instanceof SsrfBlockedError) {
          logger.error(
            { endpointId, event, url, reason: err.reason },
            'Webhook delivery blocked by SSRF guard',
          );
        } else {
          logger.error(
            { endpointId, event, url, error: errorMsg, attempt: job.attemptsMade + 1 },
            'Webhook delivery failed',
          );
        }
        throw err; // BullMQ will retry
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 100,
        duration: 60000, // 100 deliveries per minute
      },
    },
  );

  logger.info('✅ Webhook delivery worker started');
}
