/**
 * Treatment Plan Routes — CRUD + items + status flow
 *
 * Per V2_DATABASE.md §5.4 — treatment_plans collection
 * Per DENTO_V2_MASTER_PLAN.md §10, §17 — Treatment Plans + Cross-Linking
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/treatment-plans                     — List (paginated, filterable)
 *   - GET    /api/treatment-plans/:id                 — Get detail
 *   - POST   /api/treatment-plans                     — Create
 *   - PUT    /api/treatment-plans/:id                 — Update
 *   - DELETE /api/treatment-plans/:id                 — Delete (draft only)
 *   - PATCH  /api/treatment-plans/:id/status          — Update status (with transition validation)
 *   - POST   /api/treatment-plans/:id/items           — Add item
 *   - PUT    /api/treatment-plans/:id/items/:itemId   — Update item
 *   - DELETE /api/treatment-plans/:id/items/:itemId   — Remove item
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createTreatmentPlanSchema,
  updateTreatmentPlanSchema,
  treatmentPlanQuerySchema,
  treatmentPlanStatusUpdateSchema,
  treatmentPlanItemSchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { TreatmentPlanService } from '../../services/treatment-plan.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function treatmentPlanRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readPreHandler = [...preHandler, roleGuard('treatment-plans', 'read')];

  // GET /treatment-plans — List
  fastify.get('/', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const query = treatmentPlanQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new TreatmentPlanService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list treatment plans');
    }
  });

  // GET /treatment-plans/:id — Get detail
  fastify.get('/:id', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new TreatmentPlanService(tenantDb);
      const plan = await service.getById(id);
      return apiResponse(reply, 200, { plan });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch treatment plan');
    }
  });

  // POST /treatment-plans — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('treatment-plans', 'create')] },
    async (request, reply) => {
      try {
        const data = createTreatmentPlanSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new TreatmentPlanService(tenantDb);
        const plan = await service.create(data);
        return apiResponse(reply, 201, { plan }, 'Treatment plan created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create treatment plan');
      }
    },
  );

  // PUT /treatment-plans/:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('treatment-plans', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateTreatmentPlanSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new TreatmentPlanService(tenantDb);
        const plan = await service.update(id, data);
        return apiResponse(reply, 200, { plan }, 'Treatment plan updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update treatment plan');
      }
    },
  );

  // DELETE /treatment-plans/:id — Delete (draft only)
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('treatment-plans', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new TreatmentPlanService(tenantDb);
        const result = await service.delete(id);
        return apiResponse(reply, 200, result, 'Treatment plan deleted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete treatment plan');
      }
    },
  );

  // PATCH /treatment-plans/:id/status — Update status
  fastify.patch(
    '/:id/status',
    { preHandler: [...preHandler, roleGuard('treatment-plans', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = treatmentPlanStatusUpdateSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new TreatmentPlanService(tenantDb);
        const plan = await service.updateStatus(id, data);
        return apiResponse(reply, 200, { plan }, 'Status updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update treatment plan status');
      }
    },
  );

  // POST /treatment-plans/:id/items — Add item
  fastify.post(
    '/:id/items',
    { preHandler: [...preHandler, roleGuard('treatment-plans', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const item = treatmentPlanItemSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new TreatmentPlanService(tenantDb);
        const plan = await service.addItem(id, item);
        return apiResponse(reply, 201, { plan }, 'Item added');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to add treatment plan item');
      }
    },
  );

  // PUT /treatment-plans/:id/items/:itemId — Update item
  fastify.put(
    '/:id/items/:itemId',
    { preHandler: [...preHandler, roleGuard('treatment-plans', 'update')] },
    async (request, reply) => {
      try {
        const { id, itemId } = request.params as { id: string; itemId: string };
        const item = treatmentPlanItemSchema.partial().parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new TreatmentPlanService(tenantDb);
        const plan = await service.updateItem(id, itemId, item);
        return apiResponse(reply, 200, { plan }, 'Item updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update treatment plan item');
      }
    },
  );

  // DELETE /treatment-plans/:id/items/:itemId — Remove item
  fastify.delete(
    '/:id/items/:itemId',
    { preHandler: [...preHandler, roleGuard('treatment-plans', 'update')] },
    async (request, reply) => {
      try {
        const { id, itemId } = request.params as { id: string; itemId: string };
        const tenantDb = getTenantDb(request);
        const service = new TreatmentPlanService(tenantDb);
        const plan = await service.removeItem(id, itemId);
        return apiResponse(reply, 200, { plan }, 'Item removed');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to remove treatment plan item');
      }
    },
  );
}
