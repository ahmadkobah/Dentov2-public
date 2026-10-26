/**
 * Service Routes — CRUD
 *
 * Per V2_DATABASE.md §11.2 — services
 * Per DENTO_V2_MASTER_PLAN.md §10 (#16) — Dental Services
 *
 * Endpoints:
 *     - GET    /api/services       — List (paginated, filterable)
 *     - GET    /api/services/:id   — Get by ID
 *     - POST   /api/services       — Create
 *     - PUT    /api/services/:id   — Update
 *     - DELETE /api/services/:id   — Soft-delete
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { createServiceSchema, updateServiceSchema, serviceQuerySchema } from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { ServiceService } from '../../services/service.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

// ── Service Routes ──────────────────────────────────────────

export async function serviceRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = serviceQuerySchema.parse(request.query);
      const service = new ServiceService(getTenantDb(request));
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list services');
    }
  });

  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const service = new ServiceService(getTenantDb(request));
      const svc = await service.getById(id);
      return apiResponse(reply, 200, { service: svc });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to get service');
    }
  });

  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('settings', 'manage')] },
    async (request, reply) => {
      try {
        const data = createServiceSchema.parse(request.body);
        const service = new ServiceService(getTenantDb(request));
        const svc = await service.create(data);
        return apiResponse(reply, 201, { service: svc });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to create service');
      }
    },
  );

  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('settings', 'manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateServiceSchema.parse(request.body);
        const service = new ServiceService(getTenantDb(request));
        const svc = await service.update(id, data);
        return apiResponse(reply, 200, { service: svc });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to update service');
      }
    },
  );

  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('settings', 'manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new ServiceService(getTenantDb(request));
        await service.delete(id);
        return apiResponse(reply, 200, { message: 'Service deactivated' });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to delete service');
      }
    },
  );
}
