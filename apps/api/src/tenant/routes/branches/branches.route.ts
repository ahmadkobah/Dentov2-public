/**
 * Branch Routes — CRUD + chairs + working hours + toggles
 *
 * Per DENTO_V2_MASTER_PLAN §13, §22 — Multi-Branch Support
 * Per V2_DATABASE §11.4 — branches collection
 *
 * Endpoints:
 *   - GET    /api/branches              — List (paginated, filterable)
 *   - GET    /api/branches/active       — All active branches (for dropdowns)
 *   - GET    /api/branches/:id          — Get by ID
 *   - POST   /api/branches              — Create branch
 *   - PUT    /api/branches/:id          — Update branch
 *   - PATCH  /api/branches/:id/toggle   — Toggle active status
 *   - PATCH  /api/branches/:id/ramadan  — Toggle Ramadan mode
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { createBranchSchema, updateBranchSchema, branchListQuerySchema } from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { BranchService } from '../../services/branch.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as { id: string }).id;
}

export async function branchRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET / — List branches
  fastify.get(
    '/',
    { preHandler: [...preHandler, roleGuard('branches', 'read')] },
    async (request, reply) => {
      try {
        const query = branchListQuerySchema.parse(request.query);
        const service = new BranchService(getTenantDb(request));
        const result = await service.list(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list branches');
      }
    },
  );

  // GET /active — All active branches (for dropdowns)
  fastify.get('/active', { preHandler }, async (request, reply) => {
    try {
      const service = new BranchService(getTenantDb(request));
      const branches = await service.listActive();
      return apiResponse(reply, 200, { branches });
    } catch {
      return apiError(reply, 500, 'Failed to list active branches');
    }
  });

  // GET /:id — Get by ID
  fastify.get(
    '/:id',
    { preHandler: [...preHandler, roleGuard('branches', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new BranchService(getTenantDb(request));
        const branch = await service.getById(id);
        return apiResponse(reply, 200, { branch });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to get branch');
      }
    },
  );

  // POST / — Create branch
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('branches', 'create')] },
    async (request, reply) => {
      try {
        const data = createBranchSchema.parse(request.body);
        const service = new BranchService(getTenantDb(request));
        const branch = await service.create(data, getUserId(request));
        return apiResponse(reply, 201, { branch });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to create branch');
      }
    },
  );

  // PUT /:id — Update branch
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('branches', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateBranchSchema.parse(request.body);
        const service = new BranchService(getTenantDb(request));
        const { branch, warnings } = await service.update(id, data, getUserId(request));
        return apiResponse(reply, 200, { branch, warnings });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to update branch');
      }
    },
  );

  // PATCH /:id/toggle — Toggle active status
  fastify.patch(
    '/:id/toggle',
    { preHandler: [...preHandler, roleGuard('branches', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new BranchService(getTenantDb(request));
        const branch = await service.toggleActive(id);
        return apiResponse(reply, 200, { branch });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to toggle branch status');
      }
    },
  );

  // PATCH /:id/ramadan — Toggle Ramadan mode
  fastify.patch(
    '/:id/ramadan',
    { preHandler: [...preHandler, roleGuard('branches', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new BranchService(getTenantDb(request));
        const branch = await service.toggleRamadanMode(id);
        return apiResponse(reply, 200, { branch });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to toggle Ramadan mode');
      }
    },
  );
}
