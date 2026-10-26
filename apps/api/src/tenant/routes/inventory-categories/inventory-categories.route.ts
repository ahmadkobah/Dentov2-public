/**
 * Inventory Category Routes — Full CRUD + restore
 *
 * Per DENTO_V2_MASTER_PLAN.md §16 — Inventory Categories
 * Per V2_DATABASE.md §8.4 — inventory_categories collection
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/inventory-categories           — List (paginated, searchable)
 *   - GET    /api/inventory-categories/:id        — Get detail
 *   - POST   /api/inventory-categories            — Create
 *   - PUT    /api/inventory-categories/:id         — Update
 *   - DELETE /api/inventory-categories/:id         — Soft delete
 *   - PATCH  /api/inventory-categories/:id/restore — Restore
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createInventoryCategorySchema,
  updateInventoryCategorySchema,
  inventoryCategoryQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { InventoryCategoryService } from '../../services/inventory-category.service.js';

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function inventoryCategoryRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /inventory-categories — List categories (paginated)
  fastify.get(
    '/',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const query = inventoryCategoryQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const service = new InventoryCategoryService(tenantDb);
        const result = await service.list(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list inventory categories');
      }
    },
  );

  // GET /inventory-categories/:id — Get category by ID
  fastify.get(
    '/:id',
    { preHandler: [...preHandler, roleGuard('inventory', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new InventoryCategoryService(tenantDb);
        const category = await service.getById(id);
        return apiResponse(reply, 200, { category });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch inventory category');
      }
    },
  );

  // POST /inventory-categories — Create new category
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('inventory', 'create')] },
    async (request, reply) => {
      try {
        const data = createInventoryCategorySchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryCategoryService(tenantDb);
        const category = await service.create(data, userId);
        return apiResponse(reply, 201, { category }, 'Inventory category created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create inventory category');
      }
    },
  );

  // PUT /inventory-categories/:id — Update category
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateInventoryCategorySchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryCategoryService(tenantDb);
        const category = await service.update(id, data, userId);
        return apiResponse(reply, 200, { category }, 'Inventory category updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update inventory category');
      }
    },
  );

  // DELETE /inventory-categories/:id — Soft delete category
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('inventory', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryCategoryService(tenantDb);
        const result = await service.softDelete(id, userId);
        return apiResponse(reply, 200, result, 'Inventory category deactivated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete inventory category');
      }
    },
  );

  // PATCH /inventory-categories/:id/restore — Restore soft-deleted category
  fastify.patch(
    '/:id/restore',
    { preHandler: [...preHandler, roleGuard('inventory', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InventoryCategoryService(tenantDb);
        const category = await service.restore(id, userId);
        return apiResponse(reply, 200, { category }, 'Inventory category restored');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to restore inventory category');
      }
    },
  );
}
