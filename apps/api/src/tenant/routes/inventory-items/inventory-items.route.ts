/**
 * Inventory Item Routes — Full CRUD + stock + barcode + movements
 *
 * Per DENTO_V2_MASTER_PLAN.md §16 — Inventory Items
 * Per V2_DATABASE.md §8.1 — inventory_items collection
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/inventory-items                    — List (paginated, searchable, filterable)
 *   - GET    /api/inventory-items/low-stock          — Low-stock items (aggregation)
 *   - GET    /api/inventory-items/:id                — Get detail
 *   - POST   /api/inventory-items                    — Create + webhook
 *   - PUT    /api/inventory-items/:id                — Update + webhook
 *   - DELETE /api/inventory-items/:id                — Soft delete
 *   - PATCH  /api/inventory-items/:id/restore        — Restore soft-deleted
 *   - GET    /api/inventory-items/:id/stock           — Get stock levels per branch
 *   - POST   /api/inventory-items/:id/stock/adjust    — Adjust stock (FIFO) + webhooks
 *   - POST   /api/inventory-items/barcode/search      — Find item by barcode
 *   - GET    /api/inventory-items/:id/movements       — Movement history
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  inventoryItemQuerySchema,
  stockAdjustmentSchema,
  barcodeSearchSchema,
  inventoryMovementQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { InventoryItemService } from '../../services/inventory-item.service.js';
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

export async function inventoryItemRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /inventory-items — List items (paginated)
  fastify.get(
    '/',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const query = inventoryItemQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const service = new InventoryItemService(tenantDb);
        const result = await service.list(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list inventory items');
      }
    },
  );

  // GET /inventory-items/low-stock — Low-stock items (must be before /:id)
  fastify.get(
    '/low-stock',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const query = inventoryItemQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const service = new InventoryItemService(tenantDb);
        const result = await service.getLowStockItems(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to fetch low-stock items');
      }
    },
  );

  // GET /inventory-items/:id — Get item by ID
  fastify.get(
    '/:id',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new InventoryItemService(tenantDb);
        const item = await service.getById(id);
        return apiResponse(reply, 200, { item });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch inventory item');
      }
    },
  );

  // POST /inventory-items — Create new item + webhook
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('inventory', 'create')] },
    async (request, reply) => {
      try {
        const data = createInventoryItemSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryItemService(tenantDb);
        const item = await service.create(data, userId);

        // Fire-and-forget webhook
        const slug = getTenantSlug(tenantDb);
        dispatchWebhook(tenantDb, {
          tenantId: slug,
          tenantSlug: slug,
          event: 'inventory.item.created',
          data: { itemId: item._id?.toString(), sku: item.sku, nameEn: item.nameEn },
        }).catch((err) => logger.warn({ err }, 'Webhook dispatch failed: inventory.item.created'));

        return apiResponse(reply, 201, { item }, 'Inventory item created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create inventory item');
      }
    },
  );

  // PUT /inventory-items/:id — Update item + webhook
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateInventoryItemSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryItemService(tenantDb);
        const item = await service.update(id, data, userId);

        // Fire-and-forget webhook
        const slug = getTenantSlug(tenantDb);
        dispatchWebhook(tenantDb, {
          tenantId: slug,
          tenantSlug: slug,
          event: 'inventory.item.updated',
          data: { itemId: id, sku: item.sku, nameEn: item.nameEn },
        }).catch((err) => logger.warn({ err }, 'Webhook dispatch failed: inventory.item.updated'));

        return apiResponse(reply, 200, { item }, 'Inventory item updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update inventory item');
      }
    },
  );

  // DELETE /inventory-items/:id — Soft delete
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('inventory', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryItemService(tenantDb);
        const result = await service.softDelete(id, userId);
        return apiResponse(reply, 200, result, 'Inventory item deactivated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete inventory item');
      }
    },
  );

  // PATCH /inventory-items/:id/restore — Restore soft-deleted
  fastify.patch(
    '/:id/restore',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryItemService(tenantDb);
        const item = await service.restore(id, userId);
        return apiResponse(reply, 200, { item }, 'Inventory item restored');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to restore inventory item');
      }
    },
  );

  // GET /inventory-items/:id/stock — Get stock levels per branch
  fastify.get(
    '/:id/stock',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new InventoryItemService(tenantDb);
        const stock = await service.getStockLevels(id);
        return apiResponse(reply, 200, { stock });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch stock levels');
      }
    },
  );

  // POST /inventory-items/:id/stock/adjust — Adjust stock (FIFO batch consumption) + webhooks
  fastify.post(
    '/:id/stock/adjust',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = stockAdjustmentSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryItemService(tenantDb);
        const result = await service.adjustStock(id, data, userId);

        // Fire-and-forget webhook for stock changes
        const slug = getTenantSlug(tenantDb);
        const webhookData = { itemId: id, adjustment: data };

        // Check stock levels after adjustment for low/out-of-stock webhooks
        try {
          const stockLevels = await service.getStockLevels(id);
          const totalAvailable = Array.isArray(stockLevels)
            ? (stockLevels as unknown as Array<Record<string, number>>).reduce(
                (sum: number, s) => sum + (s.availableQuantity || 0),
                0,
              )
            : 0;
          const item = await service.getById(id);
          const reorderLevel = (item as Record<string, number>).reorderLevel || 0;
          const minStockLevel = (item as Record<string, number>).minStockLevel || 0;

          if (totalAvailable === 0) {
            dispatchWebhook(tenantDb, {
              tenantId: slug,
              tenantSlug: slug,
              event: 'inventory.out_of_stock',
              data: { ...webhookData, totalAvailable: 0 },
            }).catch((err) => logger.warn({ err }, 'Webhook failed: inventory.out_of_stock'));
          } else if (totalAvailable <= minStockLevel) {
            dispatchWebhook(tenantDb, {
              tenantId: slug,
              tenantSlug: slug,
              event: 'inventory.critical_stock',
              data: { ...webhookData, totalAvailable, minStockLevel },
            }).catch((err) => logger.warn({ err }, 'Webhook failed: inventory.critical_stock'));
          } else if (totalAvailable <= reorderLevel) {
            dispatchWebhook(tenantDb, {
              tenantId: slug,
              tenantSlug: slug,
              event: 'inventory.low_stock',
              data: { ...webhookData, totalAvailable, reorderLevel },
            }).catch((err) => logger.warn({ err }, 'Webhook failed: inventory.low_stock'));
          }
        } catch {
          // Stock-level check failure should not block the response
        }

        return apiResponse(reply, 200, result, 'Stock adjusted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to adjust stock');
      }
    },
  );

  // POST /inventory-items/barcode/search — Find item by barcode
  fastify.post(
    '/barcode/search',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const data = barcodeSearchSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new InventoryItemService(tenantDb);
        const item = await service.findByBarcode(data);
        return apiResponse(reply, 200, { item });
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to search by barcode');
      }
    },
  );

  // GET /inventory-items/:id/movements — Movement history
  fastify.get(
    '/:id/movements',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const query = inventoryMovementQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const service = new InventoryItemService(tenantDb);
        const result = await service.getMovementHistory(id, query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to fetch movement history');
      }
    },
  );
}
