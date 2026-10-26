/**
 * X-Ray Type Routes — Lookup collection CRUD
 *
 * Per V2_DATABASE.md — xray_types collection
 *
 * Endpoints:
 *   - GET    /api/xray-types       — List (paginated)
 *   - GET    /api/xray-types/:id   — Get by ID
 *   - POST   /api/xray-types       — Create
 *   - PUT    /api/xray-types/:id   — Update
 *   - DELETE /api/xray-types/:id   — Delete
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { createXrayTypeSchema, updateXrayTypeSchema, xrayTypeQuerySchema } from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { XrayTypeService } from '../../services/xray-type.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function xrayTypeRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /xray-types — List
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = xrayTypeQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new XrayTypeService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list x-ray types');
    }
  });

  // GET /xray-types/:id — Get by ID
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new XrayTypeService(tenantDb);
      const xrayType = await service.getById(id);
      return apiResponse(reply, 200, { xrayType });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch x-ray type');
    }
  });

  // POST /xray-types — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('xrays', 'create')] },
    async (request, reply) => {
      try {
        const data = createXrayTypeSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new XrayTypeService(tenantDb);
        const xrayType = await service.create(data);
        return apiResponse(reply, 201, { xrayType }, 'X-Ray type created');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
        return apiError(reply, 500, 'Failed to create x-ray type');
      }
    },
  );

  // PUT /xray-types/:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateXrayTypeSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new XrayTypeService(tenantDb);
        const xrayType = await service.update(id, data);
        return apiResponse(reply, 200, { xrayType }, 'X-Ray type updated');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
        return apiError(reply, 500, 'Failed to update x-ray type');
      }
    },
  );

  // DELETE /xray-types/:id — Delete
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('xrays', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new XrayTypeService(tenantDb);
        const result = await service.delete(id);
        return apiResponse(reply, 200, result, 'X-Ray type deleted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete x-ray type');
      }
    },
  );
}
