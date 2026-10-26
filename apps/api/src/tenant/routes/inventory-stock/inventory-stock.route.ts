/**
 * Inventory Stock Routes — Branch stock, expiry, dispose, reserve, reports
 *
 * Per DENTO_V2_MASTER_PLAN.md §16 — Stock Management
 * Per V2_DATABASE.md §8.3 — inventory_stocks collection
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/inventory-stock/branch/:branchId                 — Stock by branch (paginated)
 *   - GET    /api/inventory-stock/item/:itemId                     — Stock for a specific item
 *   - GET    /api/inventory-stock/branch/:branchId/summary         — Branch KPI summary
 *   - GET    /api/inventory-stock/branch/:branchId/expiry-dashboard — Expiry dashboard
 *   - GET    /api/inventory-stock/expiring                         — Expiring batches (query)
 *   - POST   /api/inventory-stock/:stockId/dispose/:batchNumber    — Dispose single batch + webhook
 *   - POST   /api/inventory-stock/bulk-dispose                     — Bulk dispose batches
 *   - POST   /api/inventory-stock/reserve                          — Reserve stock
 *   - POST   /api/inventory-stock/unreserve                        — Unreserve stock
 *   - POST   /api/inventory-stock/:stockId/recalculate             — Recalculate stock value
 *   - GET    /api/inventory-stock/branch/:branchId/report          — Stock report (date range)
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { expiryQuerySchema, bulkDisposeSchema } from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { InventoryStockService } from '../../services/inventory-stock.service.js';
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

export async function inventoryStockRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /inventory-stock/branch/:branchId — Stock by branch (paginated)
  fastify.get(
    '/branch/:branchId',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { branchId } = request.params as { branchId: string };
        const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
        const tenantDb = getTenantDb(request);
        const service = new InventoryStockService(tenantDb);
        const result = await service.getStockByBranch(branchId, {
          page: Number(page),
          limit: Number(limit),
        });
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch branch stock');
      }
    },
  );

  // GET /inventory-stock/item/:itemId — Stock for specific item across branches
  fastify.get(
    '/item/:itemId',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { itemId } = request.params as { itemId: string };
        const tenantDb = getTenantDb(request);
        const service = new InventoryStockService(tenantDb);
        const stock = await service.getStockForItem(itemId);
        return apiResponse(reply, 200, { stock });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch item stock');
      }
    },
  );

  // GET /inventory-stock/branch/:branchId/summary — Branch KPI summary
  fastify.get(
    '/branch/:branchId/summary',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { branchId } = request.params as { branchId: string };
        const tenantDb = getTenantDb(request);
        const service = new InventoryStockService(tenantDb);
        const summary = await service.getStockSummary(branchId);
        return apiResponse(reply, 200, { summary });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch stock summary');
      }
    },
  );

  // GET /inventory-stock/branch/:branchId/expiry-dashboard — Expiry dashboard
  fastify.get(
    '/branch/:branchId/expiry-dashboard',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { branchId } = request.params as { branchId: string };
        const tenantDb = getTenantDb(request);
        const service = new InventoryStockService(tenantDb);
        const dashboard = await service.getExpiryDashboard(branchId);
        return apiResponse(reply, 200, { dashboard });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch expiry dashboard');
      }
    },
  );

  // GET /inventory-stock/expiring — Expiring batches
  fastify.get(
    '/expiring',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const query = expiryQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const service = new InventoryStockService(tenantDb);
        const result = await service.getExpiringBatches(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to fetch expiring batches');
      }
    },
  );

  // POST /inventory-stock/:stockId/dispose/:batchNumber — Dispose single batch + webhook
  fastify.post(
    '/:stockId/dispose/:batchNumber',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { stockId, batchNumber } = request.params as { stockId: string; batchNumber: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryStockService(tenantDb);
        const result = await service.disposeBatch(stockId, batchNumber, userId);

        // Fire-and-forget webhook
        const slug = getTenantSlug(tenantDb);
        dispatchWebhook(tenantDb, {
          tenantId: slug,
          tenantSlug: slug,
          event: 'inventory.expired',
          data: { stockId, batchNumber, action: 'disposed' },
        }).catch((err) => logger.warn({ err }, 'Webhook failed: inventory.expired'));

        return apiResponse(reply, 200, result, 'Batch disposed');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to dispose batch');
      }
    },
  );

  // POST /inventory-stock/bulk-dispose — Bulk dispose batches
  fastify.post(
    '/bulk-dispose',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const data = bulkDisposeSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryStockService(tenantDb);
        const result = await service.bulkDispose(data, userId);
        return apiResponse(reply, 200, result, 'Batches disposed');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to bulk dispose batches');
      }
    },
  );

  // POST /inventory-stock/reserve — Reserve stock for treatment/appointment
  fastify.post(
    '/reserve',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { itemId, branchId, quantity } = request.body as {
          itemId: string;
          branchId: string;
          quantity: number;
        };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryStockService(tenantDb);
        const result = await service.reserveStock(itemId, branchId, quantity, userId);
        return apiResponse(reply, 200, result, 'Stock reserved');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to reserve stock');
      }
    },
  );

  // POST /inventory-stock/unreserve — Release reserved stock
  fastify.post(
    '/unreserve',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { itemId, branchId, quantity } = request.body as {
          itemId: string;
          branchId: string;
          quantity: number;
        };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryStockService(tenantDb);
        const result = await service.unreserveStock(itemId, branchId, quantity, userId);
        return apiResponse(reply, 200, result, 'Stock unreserved');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to unreserve stock');
      }
    },
  );

  // POST /inventory-stock/adjust — Manual stock adjustment
  fastify.post(
    '/adjust',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { itemId, branchId, quantity, reason } = request.body as {
          itemId: string;
          branchId: string;
          quantity: number;
          reason?: string;
        };

        if (!itemId || !branchId || quantity == null || quantity < 0) {
          return apiError(reply, 400, 'itemId, branchId, and quantity (>= 0) are required');
        }

        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryStockService(tenantDb);
        const result = await service.adjustStock(itemId, branchId, quantity, reason || '', userId);
        return apiResponse(reply, 200, result, 'Stock adjusted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to adjust stock');
      }
    },
  );

  // POST /inventory-stock/:stockId/recalculate — Recalculate stock value
  fastify.post(
    '/:stockId/recalculate',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { stockId } = request.params as { stockId: string };
        const tenantDb = getTenantDb(request);
        const service = new InventoryStockService(tenantDb);
        const result = await service.recalculateStockValue(stockId);
        return apiResponse(reply, 200, result, 'Stock value recalculated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to recalculate stock value');
      }
    },
  );

  // GET /inventory-stock/branch/:branchId/report — Stock report (date range)
  fastify.get(
    '/branch/:branchId/report',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { branchId } = request.params as { branchId: string };
        const { from, to } = request.query as { from: string; to: string };
        const tenantDb = getTenantDb(request);
        const service = new InventoryStockService(tenantDb);
        const report = await service.getStockReport(branchId, { from, to });
        return apiResponse(reply, 200, { report });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to generate stock report');
      }
    },
  );
}
