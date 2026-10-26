/**
 * Dental Lab Routes — CRUD
 *
 * Per V2_DATABASE.md §5.13 — dental_labs collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Dental Labs
 *
 * Endpoints:
 *   - GET    /api/dental-labs       — List (paginated)
 *   - GET    /api/dental-labs/:id   — Get by ID
 *   - POST   /api/dental-labs       — Create
 *   - PUT    /api/dental-labs/:id   — Update
 *   - DELETE /api/dental-labs/:id   — Soft-delete
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { createDentalLabSchema, updateDentalLabSchema, dentalLabQuerySchema } from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { DentalLabService } from '../../services/dental-lab.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function dentalLabRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET / — List
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = dentalLabQuerySchema.parse(request.query);
      const service = new DentalLabService(getTenantDb(request));
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list dental labs');
    }
  });

  // GET /:id — Get by ID
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const service = new DentalLabService(getTenantDb(request));
      const dentalLab = await service.getById(id);
      return apiResponse(reply, 200, { dentalLab });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to get dental lab');
    }
  });

  // POST / — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('settings', 'manage')] },
    async (request, reply) => {
      try {
        const data = createDentalLabSchema.parse(request.body);
        const service = new DentalLabService(getTenantDb(request));
        const dentalLab = await service.create(data);
        return apiResponse(reply, 201, { dentalLab });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to create dental lab');
      }
    },
  );

  // PUT /:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('settings', 'manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateDentalLabSchema.parse(request.body);
        const service = new DentalLabService(getTenantDb(request));
        const dentalLab = await service.update(id, data);
        return apiResponse(reply, 200, { dentalLab });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to update dental lab');
      }
    },
  );

  // DELETE /:id — Soft-delete
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('settings', 'manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new DentalLabService(getTenantDb(request));
        await service.delete(id);
        return apiResponse(reply, 200, { message: 'Dental lab deactivated' });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to delete dental lab');
      }
    },
  );
}
