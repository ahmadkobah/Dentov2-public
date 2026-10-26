/**
 * Tenant Webhook Routes — CRUD + Test + Delivery Logs
 *
 * Per DENTO_V2_MASTER_PLAN.md §23 — Webhook System (Zwei Ebenen)
 * Per V2_DATABASE.md §4.7 — TenantWebhookEndpoint + TenantWebhookDelivery
 * Per SECURITY_AND_ENCRYPTION.md §6.3 — HMAC-SHA256 signature
 *
 * Tenant-level webhook management: endpoints, events, test delivery, logs.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createWebhookSchema,
  updateWebhookSchema,
  webhookQuerySchema,
  webhookDeliveryQuerySchema,
  WEBHOOK_SIGNATURE_HEADER,
} from '@dento/shared';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, requireAdmin } from '../../middleware/index.js';
import {
  createTenantWebhookEndpointModel,
  createTenantWebhookDeliveryModel,
} from '../../../tenant/models/webhook.model.js';
import { signPayload } from '../../services/webhook-dispatcher.js';
import { assertPublicHttpsUrl, SsrfBlockedError } from '../../../utils/url-guard.js';
import { regexContains } from '../../services/search.helpers.js';

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function tenantWebhookCrudRoutes(fastify: FastifyInstance) {
  const adminOnly = [authGuard, tenantDbMiddleware, requireAdmin];

  // ─── GET / — List webhook endpoints ───────────────────────
  fastify.get(
    '/',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = webhookQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);

        const skip = (query.page - 1) * query.limit;
        const filter: Record<string, unknown> = {};
        if (query.isActive !== undefined) filter.isActive = query.isActive;
        if (query.search) {
          const rx = regexContains(query.search); // escapes input — no ReDoS (#79)
          filter.$or = [{ name: rx }, { url: rx }];
        }

        const [data, total] = await Promise.all([
          WebhookEndpoint.find(filter)
            .select('-secret') // Never expose secret
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(query.limit)
            .lean(),
          WebhookEndpoint.countDocuments(filter),
        ]);

        return apiResponse(reply, 200, {
          data,
          pagination: {
            page: query.page,
            limit: query.limit,
            total,
            pages: Math.ceil(total / query.limit),
          },
        });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch webhook endpoints');
      }
    },
  );

  // ─── GET /:id — Get a single webhook endpoint ────────────
  fastify.get(
    '/:id',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);

        const endpoint = await WebhookEndpoint.findById(id).select('-secret').lean();
        if (!endpoint) return apiError(reply, 404, 'Webhook endpoint not found');

        return apiResponse(reply, 200, { webhook: endpoint });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch webhook endpoint');
      }
    },
  );

  // ─── POST / — Create a new webhook endpoint ──────────────
  fastify.post(
    '/',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createWebhookSchema.parse(request.body);
        const userId = getUserId(request);
        const tenantDb = getTenantDb(request);
        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);

        const endpoint = await WebhookEndpoint.create({
          ...body,
          createdBy: userId,
        });

        // Return without secret
        const result = endpoint.toObject();
        delete (result as unknown as Record<string, unknown>).secret;

        return apiResponse(reply, 201, { webhook: result }, 'Webhook endpoint created');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to create webhook endpoint');
      }
    },
  );

  // ─── PATCH /:id — Update a webhook endpoint ──────────────
  fastify.patch(
    '/:id',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateWebhookSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);

        const endpoint = await WebhookEndpoint.findByIdAndUpdate(
          id,
          { $set: body },
          { new: true, lean: true },
        );

        if (!endpoint) return apiError(reply, 404, 'Webhook endpoint not found');

        // Strip secret from response
        const { secret: _secret, ...webhook } = endpoint;

        return apiResponse(reply, 200, { webhook }, 'Webhook endpoint updated');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to update webhook endpoint');
      }
    },
  );

  // ─── DELETE /:id — Delete a webhook endpoint ──────────────
  fastify.delete(
    '/:id',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);

        const result = await WebhookEndpoint.findByIdAndDelete(id);
        if (!result) return apiError(reply, 404, 'Webhook endpoint not found');

        return apiResponse(reply, 200, null, 'Webhook endpoint deleted');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to delete webhook endpoint');
      }
    },
  );

  // ─── POST /:id/test — Send a test webhook ────────────────
  fastify.post(
    '/:id/test',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const WebhookEndpoint = createTenantWebhookEndpointModel(tenantDb);

        // #69: secret is `select: false` — explicitly select it to sign the test.
        const endpoint = await WebhookEndpoint.findById(id).select('+secret');
        if (!endpoint) return apiError(reply, 404, 'Webhook endpoint not found');

        // Send a test payload
        const testPayload = {
          event: 'test.ping',
          timestamp: new Date().toISOString(),
          data: {
            message: 'This is a test webhook delivery from Dento',
            webhookId: id,
          },
        };

        // #78: block SSRF — the delivery worker guards outbound URLs, but this
        // test route fetched the admin-supplied URL directly. Reject non-public/HTTPS.
        try {
          await assertPublicHttpsUrl(endpoint.url);
        } catch (ssrfErr) {
          if (ssrfErr instanceof SsrfBlockedError) {
            return apiError(reply, 400, `Webhook URL rejected: ${ssrfErr.message}`);
          }
          throw ssrfErr;
        }

        // Simple test delivery (no BullMQ, direct request)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        // Sign test payload with HMAC-SHA256 (same as production deliveries)
        const timestamp = Math.floor(Date.now() / 1000);
        const body = JSON.stringify(testPayload);
        const signature = signPayload(body, endpoint.secret, timestamp);

        try {
          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [WEBHOOK_SIGNATURE_HEADER]: `t=${timestamp},v1=${signature}`,
              'X-Webhook-Timestamp': String(timestamp),
              'User-Agent': 'DentoWebhook/2.0',
            },
            body,
            signal: controller.signal,
          });
          clearTimeout(timeout);

          return apiResponse(reply, 200, {
            success: response.ok,
            statusCode: response.status,
            message: response.ok
              ? 'Test webhook delivered successfully'
              : 'Webhook endpoint returned an error',
          });
        } catch (fetchErr) {
          clearTimeout(timeout);
          return apiResponse(reply, 200, {
            success: false,
            statusCode: 0,
            message: `Failed to reach endpoint: ${(fetchErr as Error).message}`,
          });
        }
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to test webhook');
      }
    },
  );

  // ─── GET /:id/deliveries — Delivery history for an endpoint
  fastify.get(
    '/:id/deliveries',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const query = webhookDeliveryQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const WebhookDelivery = createTenantWebhookDeliveryModel(tenantDb);

        const skip = (query.page - 1) * query.limit;
        const filter: Record<string, unknown> = { endpointId: id };
        if (query.status) filter.status = query.status;
        if (query.event) filter.event = query.event;

        const [data, total] = await Promise.all([
          WebhookDelivery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
          WebhookDelivery.countDocuments(filter),
        ]);

        return apiResponse(reply, 200, {
          data,
          pagination: {
            page: query.page,
            limit: query.limit,
            total,
            pages: Math.ceil(total / query.limit),
          },
        });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch delivery history');
      }
    },
  );
}
