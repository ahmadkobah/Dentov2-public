/**
 * Stock Count Routes — Full CRUD + complete + approve + cancel
 *
 * Per DENTO_V2_MASTER_PLAN.md §16 — Physical Stock Counts
 * Per V2_DATABASE.md §8.8 — stock_counts collection
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/stock-counts                       — List (paginated, filterable)
 *   - GET    /api/stock-counts/:id                   — Get detail
 *   - POST   /api/stock-counts                       — Create new count session
 *   - PUT    /api/stock-counts/:id/items             — Update counted items
 *   - PATCH  /api/stock-counts/:id/complete          — Mark count as complete + webhook
 *   - PATCH  /api/stock-counts/:id/approve           — Approve & apply adjustments + webhook
 *   - PATCH  /api/stock-counts/:id/cancel            — Cancel count session
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createStockCountSchema,
  updateStockCountSchema,
  applyStockCountSchema,
  stockCountQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { StockCountService } from '../../services/stock-count.service.js';
import { dispatchWebhook } from '../../services/webhook-dispatcher.js';
import { logger } from '../../../utils/logger.js';

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

function getTenantSlug(tenantDb: Connection): string {
  return tenantDb.name?.replace('tenant_', '') || '';
}

// ── Route Registration ──────────────────────────────────────

export async function stockCountRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /stock-counts — List stock counts (paginated)
  fastify.get(
    '/',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const query = stockCountQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const service = new StockCountService(tenantDb);
        const result = await service.list(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list stock counts');
      }
    },
  );

  // GET /stock-counts/:id — Get stock count by ID
  fastify.get(
    '/:id',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new StockCountService(tenantDb);
        const stockCount = await service.getById(id);
        return apiResponse(reply, 200, { stockCount });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch stock count');
      }
    },
  );

  // POST /stock-counts — Create new count session
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('inventory', 'create')] },
    async (request, reply) => {
      try {
        const data = createStockCountSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new StockCountService(tenantDb);
        const stockCount = await service.create(data, userId);
        return apiResponse(reply, 201, { stockCount }, 'Stock count created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create stock count');
      }
    },
  );

  // PUT /stock-counts/:id/items — Update counted items
  fastify.put(
    '/:id/items',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateStockCountSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new StockCountService(tenantDb);
        const stockCount = await service.updateItems(id, data, userId);
        return apiResponse(reply, 200, { stockCount }, 'Stock count items updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update stock count items');
      }
    },
  );

  // PATCH /stock-counts/:id/complete — Mark count as complete + webhook
  fastify.patch(
    '/:id/complete',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new StockCountService(tenantDb);
        const stockCount = await service.complete(id, userId);

        // Fire-and-forget webhook
        const slug = getTenantSlug(tenantDb);
        dispatchWebhook(tenantDb, {
          tenantId: slug,
          tenantSlug: slug,
          event: 'inventory.stock_count.completed',
          data: {
            stockCountId: id,
            countNumber: stockCount.countNumber,
          },
        }).catch((err) => logger.warn({ err }, 'Webhook failed: inventory.stock_count.completed'));

        return apiResponse(reply, 200, { stockCount }, 'Stock count completed');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to complete stock count');
      }
    },
  );

  // PATCH /stock-counts/:id/approve — Approve & apply stock adjustments + webhook
  fastify.patch(
    '/:id/approve',
    { preHandler: [...preHandler, roleGuard('inventory', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = applyStockCountSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new StockCountService(tenantDb);
        const stockCount = await service.approve(id, data, userId);

        // Fire-and-forget webhook for discrepancy reporting
        const slug = getTenantSlug(tenantDb);
        dispatchWebhook(tenantDb, {
          tenantId: slug,
          tenantSlug: slug,
          event: 'inventory.stock_count.discrepancy',
          data: {
            stockCountId: id,
            countNumber: stockCount.countNumber,
          },
        }).catch((err) =>
          logger.warn({ err }, 'Webhook failed: inventory.stock_count.discrepancy'),
        );

        return apiResponse(
          reply,
          200,
          { stockCount },
          'Stock count approved and adjustments applied',
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to approve stock count');
      }
    },
  );

  // PATCH /stock-counts/:id/cancel — Cancel count session
  fastify.patch(
    '/:id/cancel',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new StockCountService(tenantDb);
        const stockCount = await service.cancel(id, userId);
        return apiResponse(reply, 200, { stockCount }, 'Stock count cancelled');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to cancel stock count');
      }
    },
  );
}
