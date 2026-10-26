/**
 * Stock Transfer Routes — CRUD + status transitions
 *
 * Per DENTO_V2_MASTER_PLAN.md §16 — Inter-Branch Stock Transfers
 * Per V2_DATABASE.md §8.7 — stock_transfers collection
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/stock-transfers                     — List (paginated, filterable)
 *   - GET    /api/stock-transfers/:id                 — Get detail
 *   - POST   /api/stock-transfers                     — Create + webhook
 *   - PATCH  /api/stock-transfers/:id/status          — Update status (approve/receive/cancel) + webhook
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createStockTransferSchema,
  updateTransferStatusSchema,
  stockTransferQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { StockTransferService } from '../../services/stock-transfer.service.js';
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

export async function stockTransferRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /stock-transfers — List transfers (paginated)
  fastify.get(
    '/',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const query = stockTransferQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const service = new StockTransferService(tenantDb);
        const result = await service.list(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list stock transfers');
      }
    },
  );

  // GET /stock-transfers/:id — Get transfer by ID
  fastify.get(
    '/:id',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new StockTransferService(tenantDb);
        const transfer = await service.getById(id);
        return apiResponse(reply, 200, { transfer });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch stock transfer');
      }
    },
  );

  // POST /stock-transfers — Create new transfer + webhook
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('inventory', 'create')] },
    async (request, reply) => {
      try {
        const data = createStockTransferSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new StockTransferService(tenantDb);
        const transfer = await service.create(data, userId);

        // Fire-and-forget webhook
        const slug = getTenantSlug(tenantDb);
        dispatchWebhook(tenantDb, {
          tenantId: slug,
          tenantSlug: slug,
          event: 'inventory.transfer.requested',
          data: {
            transferId: transfer._id?.toString(),
            transferNumber: transfer.transferNumber,
          },
        }).catch((err) => logger.warn({ err }, 'Webhook failed: inventory.transfer.requested'));

        return apiResponse(reply, 201, { transfer }, 'Stock transfer created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create stock transfer');
      }
    },
  );

  // PATCH /stock-transfers/:id/status — Update transfer status (approve/receive/cancel) + webhook
  fastify.patch(
    '/:id/status',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateTransferStatusSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new StockTransferService(tenantDb);
        const transfer = await service.updateStatus(id, data, userId);

        // Fire-and-forget webhook for completed transfers
        if (data.action === 'receive') {
          const slug = getTenantSlug(tenantDb);
          dispatchWebhook(tenantDb, {
            tenantId: slug,
            tenantSlug: slug,
            event: 'inventory.transfer.completed',
            data: {
              transferId: id,
              transferNumber: transfer.transferNumber,
            },
          }).catch((err) => logger.warn({ err }, 'Webhook failed: inventory.transfer.completed'));
        }

        return apiResponse(reply, 200, { transfer }, 'Stock transfer status updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update stock transfer status');
      }
    },
  );
}
