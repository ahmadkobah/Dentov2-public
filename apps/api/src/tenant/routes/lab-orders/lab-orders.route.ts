/**
 * Lab Order Routes — CRUD + Status Flow
 *
 * Per V2_DATABASE.md §5.12 — lab_orders collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Lab Orders
 *
 * Endpoints:
 *   - GET    /api/lab-orders           — List (paginated, filterable)
 *   - GET    /api/lab-orders/stats     — Stats (status breakdown, overdue)
 *   - GET    /api/lab-orders/:id       — Get by ID
 *   - POST   /api/lab-orders           — Create
 *   - PUT    /api/lab-orders/:id       — Update
 *   - PATCH  /api/lab-orders/:id/status — Status transition
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createLabOrderSchema,
  updateLabOrderSchema,
  labOrderStatusUpdateSchema,
  labOrderQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { LabOrderService } from '../../services/lab-order.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

export async function labOrderRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET / — List
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = labOrderQuerySchema.parse(request.query);
      const service = new LabOrderService(getTenantDb(request));
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list lab orders');
    }
  });

  // GET /stats — Stats
  fastify.get('/stats', { preHandler }, async (request, reply) => {
    try {
      const { branchId } = request.query as { branchId?: string };
      const service = new LabOrderService(getTenantDb(request));
      const stats = await service.getStats(branchId);
      return apiResponse(reply, 200, stats);
    } catch (err) {
      return apiError(reply, 500, 'Failed to get lab order stats');
    }
  });

  // GET /:id — Get by ID
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const service = new LabOrderService(getTenantDb(request));
      const labOrder = await service.getById(id);
      return apiResponse(reply, 200, { labOrder });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to get lab order');
    }
  });

  // POST / — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('lab-orders', 'create')] },
    async (request, reply) => {
      try {
        const data = createLabOrderSchema.parse(request.body);
        const service = new LabOrderService(getTenantDb(request));
        const labOrder = await service.create(data, getUserId(request));
        return apiResponse(reply, 201, { labOrder });
      } catch (err) {
        request.log.error(err, 'Lab order create failed');
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to create lab order');
      }
    },
  );

  // PUT /:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('lab-orders', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateLabOrderSchema.parse(request.body);
        const service = new LabOrderService(getTenantDb(request));
        const labOrder = await service.update(id, data);
        return apiResponse(reply, 200, { labOrder });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to update lab order');
      }
    },
  );

  // PATCH /:id/status — Status transition
  fastify.patch(
    '/:id/status',
    { preHandler: [...preHandler, roleGuard('lab-orders', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const update = labOrderStatusUpdateSchema.parse(request.body);
        const service = new LabOrderService(getTenantDb(request));
        const labOrder = await service.updateStatus(id, update);
        return apiResponse(reply, 200, { labOrder });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to update lab order status');
      }
    },
  );
}
