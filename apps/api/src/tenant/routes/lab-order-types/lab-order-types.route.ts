/**
 * Lab Order Type Routes — Settings CRUD
 *
 * Per V2_DATABASE.md §5.14 — lab_order_types collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Seed 14 Types + Custom CRUD
 *
 * Endpoints:
 *   - GET    /api/lab-order-types       — List (paginated)
 *   - GET    /api/lab-order-types/:id   — Get by ID
 *   - POST   /api/lab-order-types       — Create (custom)
 *   - PUT    /api/lab-order-types/:id   — Update
 *   - DELETE /api/lab-order-types/:id   — Soft-delete
 *   - POST   /api/lab-order-types/seed  — Seed defaults (admin)
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createLabOrderTypeSchema,
  updateLabOrderTypeSchema,
  labOrderTypeQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { LabOrderTypeService } from '../../services/lab-order-type.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function labOrderTypeRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET / — List
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = labOrderTypeQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new LabOrderTypeService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list lab order types');
    }
  });

  // GET /:id — Get by ID
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new LabOrderTypeService(tenantDb);
      const labOrderType = await service.getById(id);
      return apiResponse(reply, 200, { labOrderType });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch lab order type');
    }
  });

  // POST / — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('settings', 'create')] },
    async (request, reply) => {
      try {
        const data = createLabOrderTypeSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new LabOrderTypeService(tenantDb);
        const labOrderType = await service.create(data);
        return apiResponse(reply, 201, { labOrderType }, 'Lab order type created');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
        return apiError(reply, 500, 'Failed to create lab order type');
      }
    },
  );

  // PUT /:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('settings', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateLabOrderTypeSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new LabOrderTypeService(tenantDb);
        const labOrderType = await service.update(id, data);
        return apiResponse(reply, 200, { labOrderType }, 'Lab order type updated');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
        return apiError(reply, 500, 'Failed to update lab order type');
      }
    },
  );

  // DELETE /:id — Soft-delete
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('settings', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new LabOrderTypeService(tenantDb);
        const result = await service.delete(id);
        return apiResponse(reply, 200, result, 'Lab order type deactivated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete lab order type');
      }
    },
  );

  // POST /seed — Seed defaults (admin)
  fastify.post(
    '/seed',
    { preHandler: [...preHandler, roleGuard('settings', 'create')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const service = new LabOrderTypeService(tenantDb);
        const seeded = await service.seedDefaults();
        return apiResponse(
          reply,
          201,
          { seeded },
          seeded > 0 ? `Seeded ${seeded} lab order types` : 'Already seeded',
        );
      } catch (err) {
        return apiError(reply, 500, 'Failed to seed lab order types');
      }
    },
  );
}
