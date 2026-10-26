/**
 * CBCT Scan Region Routes — Lookup/seed collection CRUD
 *
 * Per V2_DATABASE.md — cbct_scan_regions collection
 *
 * Endpoints:
 *   - GET    /api/cbct-scan-regions       — List (paginated)
 *   - GET    /api/cbct-scan-regions/:id   — Get by ID
 *   - POST   /api/cbct-scan-regions       — Create
 *   - PUT    /api/cbct-scan-regions/:id   — Update
 *   - DELETE /api/cbct-scan-regions/:id   — Delete
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createCbctScanRegionSchema,
  updateCbctScanRegionSchema,
  cbctScanRegionQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { CbctScanRegionService } from '../../services/cbct-scan-region.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function cbctScanRegionRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /cbct-scan-regions — List
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = cbctScanRegionQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new CbctScanRegionService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list CBCT scan regions');
    }
  });

  // GET /cbct-scan-regions/:id — Get by ID
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new CbctScanRegionService(tenantDb);
      const region = await service.getById(id);
      return apiResponse(reply, 200, { region });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch CBCT scan region');
    }
  });

  // POST /cbct-scan-regions — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('xrays', 'create')] },
    async (request, reply) => {
      try {
        const data = createCbctScanRegionSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new CbctScanRegionService(tenantDb);
        const region = await service.create(data);
        return apiResponse(reply, 201, { region }, 'CBCT scan region created');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
        return apiError(reply, 500, 'Failed to create CBCT scan region');
      }
    },
  );

  // PUT /cbct-scan-regions/:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateCbctScanRegionSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new CbctScanRegionService(tenantDb);
        const region = await service.update(id, data);
        return apiResponse(reply, 200, { region }, 'CBCT scan region updated');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
        return apiError(reply, 500, 'Failed to update CBCT scan region');
      }
    },
  );

  // DELETE /cbct-scan-regions/:id — Delete
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('xrays', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new CbctScanRegionService(tenantDb);
        const result = await service.delete(id);
        return apiResponse(reply, 200, result, 'CBCT scan region deleted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete CBCT scan region');
      }
    },
  );
}
