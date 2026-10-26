/**
 * Webhook Routes — Platform & Tenant API
 * Based on DENTO_V2_MASTER_PLAN.md §23 — Webhook System (Zwei Ebenen)
 *
 * Platform Endpoints (Dev Portal — dento_platform DB):
 *   - GET    /api/webhooks/platform           — List platform webhook endpoints
 *   - POST   /api/webhooks/platform           — Create platform webhook endpoint
 *   - PATCH  /api/webhooks/platform/:id       — Update platform webhook endpoint
 *   - DELETE /api/webhooks/platform/:id       — Delete platform webhook endpoint
 *   - GET    /api/webhooks/platform/:id/deliveries — Delivery history
 *   - POST   /api/webhooks/platform/:id/test  — Send test delivery
 *
 * Tenant Endpoints (Admin Portal — tenant_{slug} DB):
 *   - GET    /api/webhooks                    — List tenant webhook endpoints
 *   - POST   /api/webhooks                    — Create tenant webhook endpoint
 *   - PATCH  /api/webhooks/:id                — Update tenant webhook endpoint
 *   - DELETE /api/webhooks/:id                — Delete tenant webhook endpoint
 *   - GET    /api/webhooks/:id/deliveries     — Delivery history
 *   - POST   /api/webhooks/:id/test           — Send test delivery
 *
 * Security: HMAC-SHA256 signature on every delivery
 * Retry: 60s base, exponential backoff, max 3 attempts
 * Auto-Disable: After 10 consecutive failures
 */

import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { PlatformWebhookEndpoint, PlatformWebhookDelivery } from '../../models/webhook.model.js';
import {
  createTenantWebhookEndpointModel,
  createTenantWebhookDeliveryModel,
} from '../../../tenant/models/webhook.model.js';
import {
  PLATFORM_WEBHOOK_EVENTS,
  TENANT_WEBHOOK_EVENTS,
  WEBHOOK_SIGNATURE_HEADER,
} from '@dento/shared';
import { assertPublicHttpsUrl, SsrfBlockedError } from '../../../utils/url-guard.js';
import { regexContains } from '../../../tenant/services/search.helpers.js';

// ── Auth Interface ──────────────────────────────────────────

// ── Validation Schemas ──────────────────────────────────────

const createPlatformWebhookSchema = z
  .object({
    url: z.string().url().max(2000),
    description: z.string().max(500).optional(),
    events: z.array(z.string()).min(1, 'At least one event required'),
  })
  .strict();

const createTenantWebhookSchema = z
  .object({
    url: z.string().url().max(2000),
    description: z.string().max(500).optional(),
    events: z.array(z.string()).min(1, 'At least one event required'),
  })
  .strict();

const updateWebhookSchema = z
  .object({
    url: z.string().url().max(2000).optional(),
    description: z.string().max(500).optional(),
    events: z.array(z.string()).min(1).optional(),
    status: z.enum(['active', 'disabled']).optional(),
  })
  .strict();

// ── Helpers ─────────────────────────────────────────────────

function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// ── Platform Webhook Routes (Dev Portal) ────────────────────

// ── Route Helpers ───────────────────────────────────────────

function getUser(request: unknown): Record<string, string> {
  return ((request as unknown as Record<string, unknown>).user ?? {}) as Record<string, string>;
}

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function platformWebhookRoutes(fastify: FastifyInstance) {
  // ─── LIST PLATFORM WEBHOOKS ─────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'read')] },
    async (_request, reply) => {
      try {
        const endpoints = await PlatformWebhookEndpoint.find().sort({ createdAt: -1 }).lean();

        return apiResponse(reply, 200, endpoints);
      } catch (_err) {
        return apiError(reply, 500, 'Failed to list webhooks');
      }
    },
  );

  // ─── CREATE PLATFORM WEBHOOK ────────────────────────────
  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'create')] },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const data = createPlatformWebhookSchema.parse(request.body);

        // F-3 / F-6: SSRF guard — reject private / loopback / metadata URLs
        // before they ever reach the dispatcher (defence in depth: dispatcher
        // re-checks at fetch time to defeat DNS-rebinding TOCTOU).
        await assertPublicHttpsUrl(data.url);

        // Validate events
        const invalidEvents = data.events.filter(
          (e) => !PLATFORM_WEBHOOK_EVENTS.includes(e as (typeof PLATFORM_WEBHOOK_EVENTS)[number]),
        );
        if (invalidEvents.length > 0) {
          return apiError(
            reply,
            400,
            `Invalid events: ${invalidEvents.join(', ')}. Valid: ${PLATFORM_WEBHOOK_EVENTS.join(', ')}`,
          );
        }

        const secret = generateWebhookSecret();
        const endpoint = await PlatformWebhookEndpoint.create({
          ...data,
          secret,
          createdBy: user.id,
        });

        return apiResponse(reply, 201, {
          endpoint: endpoint.toObject(),
          // Secret is shown only on creation (§23 security)
          secret,
        });
      } catch (err) {
        if (err instanceof SsrfBlockedError) {
          return apiError(reply, 400, err.message);
        }
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to create webhook');
      }
    },
  );

  // ─── UPDATE PLATFORM WEBHOOK ────────────────────────────
  fastify.patch(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateWebhookSchema.parse(request.body);

        // F-3 / F-6: SSRF guard on URL changes too.
        if (data.url) await assertPublicHttpsUrl(data.url);

        // Validate events if provided
        if (data.events) {
          const invalidEvents = data.events.filter(
            (e) => !PLATFORM_WEBHOOK_EVENTS.includes(e as (typeof PLATFORM_WEBHOOK_EVENTS)[number]),
          );
          if (invalidEvents.length > 0) {
            return apiError(reply, 400, `Invalid events: ${invalidEvents.join(', ')}`);
          }
        }

        // Reset consecutive failures if re-enabling
        const updateData: Record<string, unknown> = { ...data };
        if (data.status === 'active') {
          updateData.consecutiveFailures = 0;
        }

        const endpoint = await PlatformWebhookEndpoint.findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true },
        ).lean();

        if (!endpoint) {
          return apiError(reply, 404, 'Webhook endpoint not found');
        }

        return apiResponse(reply, 200, { endpoint });
      } catch (err) {
        if (err instanceof SsrfBlockedError) {
          return apiError(reply, 400, err.message);
        }
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to update webhook');
      }
    },
  );

  // ─── DELETE PLATFORM WEBHOOK ────────────────────────────
  fastify.delete(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const endpoint = await PlatformWebhookEndpoint.findByIdAndDelete(id);

        if (!endpoint) {
          return apiError(reply, 404, 'Webhook endpoint not found');
        }

        // Also clean up delivery history
        await PlatformWebhookDelivery.deleteMany({ endpointId: id });

        return apiResponse(reply, 200, { message: 'Webhook endpoint deleted' });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to delete webhook');
      }
    },
  );

  // ─── PLATFORM DELIVERY HISTORY ──────────────────────────
  fastify.get(
    '/:id/deliveries',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const query = request.query as { page?: string; limit?: string; status?: string };

        const page = Math.max(1, parseInt(query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = { endpointId: id };
        if (query.status) filter.status = query.status;

        const [deliveries, total] = await Promise.all([
          PlatformWebhookDelivery.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          PlatformWebhookDelivery.countDocuments(filter),
        ]);

        return apiResponse(reply, 200, {
          deliveries,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to list deliveries');
      }
    },
  );

  // ─── ROTATE PLATFORM WEBHOOK SECRET (F-10) ──────────
  // POST /api/webhooks/platform/:id/rotate-secret
  // Generates a fresh `whsec_…`, demotes the current secret to
  // `previousSecret` for a 24-hour grace window, and returns the new
  // plaintext value (one-time view). During the grace window the
  // dispatcher signs each delivery with BOTH secrets so the consumer can
  // roll over without dropping events.
  fastify.post(
    '/:id/rotate-secret',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'update')] },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const { id } = request.params as { id: string };
        // Need the current `secret` even though it is `select:false` on read.
        const endpoint =
          await PlatformWebhookEndpoint.findById(id).select('+secret +previousSecret');
        if (!endpoint) {
          return apiError(reply, 404, 'Webhook endpoint not found');
        }

        const newSecret = generateWebhookSecret();
        const graceUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

        endpoint.previousSecret = endpoint.secret;
        endpoint.previousSecretExpiresAt = graceUntil;
        endpoint.secret = newSecret;
        endpoint.updatedBy = user.id as unknown as typeof endpoint.updatedBy;
        await endpoint.save();

        return apiResponse(reply, 200, {
          // Plaintext returned ONCE — caller must store it now.
          secret: newSecret,
          previousSecretExpiresAt: graceUntil.toISOString(),
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to rotate webhook secret');
      }
    },
  );

  // ─── TEST DELIVERY ────────────────────────────────
  fastify.post(
    '/:id/test',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'create')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        // #69: secret is `select: false` — explicitly select it to sign the test.
        const endpoint = await PlatformWebhookEndpoint.findById(id).select('+secret');

        if (!endpoint) {
          return apiError(reply, 404, 'Webhook endpoint not found');
        }

        const testPayload = {
          event: 'test.ping',
          data: {
            message: 'This is a test webhook delivery from Dento Platform',
            timestamp: new Date().toISOString(),
          },
        };

        const payloadStr = JSON.stringify(testPayload);
        const signature = signPayload(payloadStr, endpoint.secret);

        // Create delivery record
        const delivery = await PlatformWebhookDelivery.create({
          endpointId: endpoint._id,
          event: 'test.ping',
          payload: testPayload,
          status: 'pending',
          attempts: 1,
          maxAttempts: 1,
          signature,
        });

        // Attempt delivery
        const startTime = Date.now();
        try {
          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [WEBHOOK_SIGNATURE_HEADER]: signature,
            },
            body: payloadStr,
            signal: AbortSignal.timeout(30_000),
          });

          delivery.duration = Date.now() - startTime;
          delivery.httpStatus = response.status;
          delivery.responseBody = (await response.text()).slice(0, 5000);
          delivery.status = response.ok ? 'success' : 'failed';

          if (!response.ok) {
            delivery.error = `HTTP ${response.status}`;
          }
        } catch (fetchErr) {
          delivery.duration = Date.now() - startTime;
          delivery.status = 'failed';
          delivery.error = fetchErr instanceof Error ? fetchErr.message : 'Unknown error';
        }

        await delivery.save();

        return apiResponse(reply, 200, { delivery: delivery.toObject() });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to send test delivery');
      }
    },
  );

  // ─── ALL DELIVERIES (across all endpoints) ──────────────
  fastify.get(
    '/deliveries',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'read')] },
    async (request, reply) => {
      try {
        const query = request.query as { search?: string; page?: string; limit?: string };
        const page = Math.max(1, parseInt(query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = {};
        if (query.search) {
          filter.event = regexContains(query.search);
        }

        const [deliveries, total] = await Promise.all([
          PlatformWebhookDelivery.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          PlatformWebhookDelivery.countDocuments(filter),
        ]);

        return apiResponse(reply, 200, deliveries, undefined, {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to list deliveries');
      }
    },
  );

  // ─── WEBHOOK STATS ──────────────────────────────────────
  fastify.get(
    '/stats',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'read')] },
    async (_request, reply) => {
      try {
        const [endpoints, totalDeliveries, successfulDeliveries] = await Promise.all([
          PlatformWebhookEndpoint.find().lean(),
          PlatformWebhookDelivery.countDocuments(),
          PlatformWebhookDelivery.countDocuments({ status: 'success' }),
        ]);

        const totalEndpoints = endpoints.length;
        const activeEndpoints = endpoints.filter((e) => e.status === 'active').length;
        const avgSuccessRate =
          totalDeliveries > 0
            ? `${((successfulDeliveries / totalDeliveries) * 100).toFixed(1)}%`
            : '0%';

        return apiResponse(reply, 200, {
          totalEndpoints,
          activeEndpoints,
          totalDeliveries: String(totalDeliveries),
          avgSuccessRate,
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to get webhook stats');
      }
    },
  );
}

// ── Tenant Webhook Routes (Admin Portal) ────────────────────

export async function tenantWebhookRoutes(fastify: FastifyInstance) {
  // ─── LIST TENANT WEBHOOKS ───────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'read')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);

        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);
        const endpoints = await WebhookEndpoint.find().sort({ createdAt: -1 }).lean();

        return apiResponse(reply, 200, {
          endpoints,
          availableEvents: TENANT_WEBHOOK_EVENTS,
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to list webhooks');
      }
    },
  );

  // ─── CREATE TENANT WEBHOOK ──────────────────────────────
  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'create')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const user = getUser(request);

        const data = createTenantWebhookSchema.parse(request.body);

        // F-3 / F-6: SSRF guard — see platform create handler above.
        await assertPublicHttpsUrl(data.url);

        // Validate events
        const invalidEvents = data.events.filter(
          (e) => !TENANT_WEBHOOK_EVENTS.includes(e as (typeof TENANT_WEBHOOK_EVENTS)[number]),
        );
        if (invalidEvents.length > 0) {
          return apiError(
            reply,
            400,
            `Invalid events: ${invalidEvents.join(', ')}. Valid: ${TENANT_WEBHOOK_EVENTS.join(', ')}`,
          );
        }

        const secret = generateWebhookSecret();
        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);
        const endpoint = await WebhookEndpoint.create({
          ...data,
          secret,
          createdBy: user.id,
        });

        return apiResponse(reply, 201, {
          endpoint: endpoint.toObject(),
          secret, // Shown only on creation
        });
      } catch (err) {
        if (err instanceof SsrfBlockedError) {
          return apiError(reply, 400, err.message);
        }
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to create webhook');
      }
    },
  );

  // ─── UPDATE TENANT WEBHOOK ──────────────────────────────
  fastify.patch(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);

        const { id } = request.params as { id: string };
        const data = updateWebhookSchema.parse(request.body);

        // F-3 / F-6: SSRF guard on URL changes too.
        if (data.url) await assertPublicHttpsUrl(data.url);

        if (data.events) {
          const invalidEvents = data.events.filter(
            (e) => !TENANT_WEBHOOK_EVENTS.includes(e as (typeof TENANT_WEBHOOK_EVENTS)[number]),
          );
          if (invalidEvents.length > 0) {
            return apiError(reply, 400, `Invalid events: ${invalidEvents.join(', ')}`);
          }
        }

        const updateData: Record<string, unknown> = { ...data };
        if (data.status === 'active') {
          updateData.consecutiveFailures = 0;
        }

        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);
        const endpoint = await WebhookEndpoint.findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true },
        ).lean();

        if (!endpoint) {
          return apiError(reply, 404, 'Webhook endpoint not found');
        }

        return apiResponse(reply, 200, { endpoint });
      } catch (err) {
        if (err instanceof SsrfBlockedError) {
          return apiError(reply, 400, err.message);
        }
        if (err instanceof SsrfBlockedError) {
          return apiError(reply, 400, err.message);
        }
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to update webhook');
      }
    },
  );

  // ─── DELETE TENANT WEBHOOK ──────────────────────────────
  fastify.delete(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'delete')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);

        const { id } = request.params as { id: string };
        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);
        const endpoint = await WebhookEndpoint.findByIdAndDelete(id);

        if (!endpoint) {
          return apiError(reply, 404, 'Webhook endpoint not found');
        }

        const WebhookDelivery = createTenantWebhookDeliveryModel(tenantDb);
        await WebhookDelivery.deleteMany({ endpointId: id });

        return apiResponse(reply, 200, { message: 'Webhook endpoint deleted' });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to delete webhook');
      }
    },
  );

  // ─── TENANT DELIVERY HISTORY ────────────────────────────
  fastify.get(
    '/:id/deliveries',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'read')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);

        const { id } = request.params as { id: string };
        const query = request.query as { page?: string; limit?: string; status?: string };

        const page = Math.max(1, parseInt(query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = { endpointId: id };
        if (query.status) filter.status = query.status;

        const WebhookDelivery = createTenantWebhookDeliveryModel(tenantDb);
        const [deliveries, total] = await Promise.all([
          WebhookDelivery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
          WebhookDelivery.countDocuments(filter),
        ]);

        return apiResponse(reply, 200, {
          deliveries,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to list deliveries');
      }
    },
  );
  // ─── ROTATE TENANT WEBHOOK SECRET (F-10) ────────────
  // POST /api/webhooks/:id/rotate-secret
  // See platform-side comment for rationale and grace-window semantics.
  fastify.post(
    '/:id/rotate-secret',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const user = getUser(request);
        const { id } = request.params as { id: string };
        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);
        const endpoint = await WebhookEndpoint.findById(id).select('+secret +previousSecret');
        if (!endpoint) {
          return apiError(reply, 404, 'Webhook endpoint not found');
        }

        const newSecret = generateWebhookSecret();
        const graceUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

        endpoint.previousSecret = endpoint.secret;
        endpoint.previousSecretExpiresAt = graceUntil;
        endpoint.secret = newSecret;
        endpoint.updatedBy = user.id as unknown as typeof endpoint.updatedBy;
        await endpoint.save();

        return apiResponse(reply, 200, {
          secret: newSecret,
          previousSecretExpiresAt: graceUntil.toISOString(),
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to rotate webhook secret');
      }
    },
  );
  // ─── TEST DELIVERY ──────────────────────────────────────
  fastify.post(
    '/:id/test',
    { preHandler: [authGuard, platformGuard('platform_webhooks', 'create')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);

        const { id } = request.params as { id: string };
        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);
        // #69: secret is `select: false` — explicitly select it to sign the test.
        const endpoint = await WebhookEndpoint.findById(id).select('+secret');

        if (!endpoint) {
          return apiError(reply, 404, 'Webhook endpoint not found');
        }

        const testPayload = {
          event: 'test.ping',
          data: {
            message: 'This is a test webhook delivery from your Dento clinic',
            timestamp: new Date().toISOString(),
            tenantSlug: getUser(request).tenantSlug,
          },
        };

        const payloadStr = JSON.stringify(testPayload);
        const signature = signPayload(payloadStr, endpoint.secret);

        const WebhookDelivery = createTenantWebhookDeliveryModel(tenantDb);
        const delivery = await WebhookDelivery.create({
          endpointId: endpoint._id?.toString(),
          event: 'test.ping',
          payload: testPayload,
          status: 'pending',
          attempts: 1,
          maxAttempts: 1,
          signature,
        });

        const startTime = Date.now();
        try {
          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [WEBHOOK_SIGNATURE_HEADER]: signature,
            },
            body: payloadStr,
            signal: AbortSignal.timeout(30_000),
          });

          delivery.duration = Date.now() - startTime;
          delivery.httpStatus = response.status;
          delivery.responseBody = (await response.text()).slice(0, 5000);
          delivery.status = response.ok ? 'success' : 'failed';

          if (!response.ok) {
            delivery.error = `HTTP ${response.status}`;
          }
        } catch (fetchErr) {
          delivery.duration = Date.now() - startTime;
          delivery.status = 'failed';
          delivery.error = fetchErr instanceof Error ? fetchErr.message : 'Unknown error';
        }

        await delivery.save();

        return apiResponse(reply, 200, { delivery: delivery.toObject() });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to send test delivery');
      }
    },
  );
}
