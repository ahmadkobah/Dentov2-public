/**
 * CBCT Routes — Orders CRUD + status + scan/report embeds
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#12), §17 (Clinical Cross-Linking)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/cbct                          — List orders (paginated, filterable)
 *   - GET    /api/cbct/:id                      — Get order detail
 *   - POST   /api/cbct                          — Create order
 *   - PUT    /api/cbct/:id                      — Update order
 *   - DELETE /api/cbct/:id                      — Delete (requested only)
 *   - PATCH  /api/cbct/:id/status               — Update status
 *   - PUT    /api/cbct/:id/scan                 — Add/update scan data
 *   - PUT    /api/cbct/:id/report               — Add/update report
 *   - GET    /api/cbct/patient/:patientId/timeline — Patient CBCT timeline
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createCbctOrderSchema,
  updateCbctOrderSchema,
  cbctOrderQuerySchema,
  cbctScanSchema,
  cbctReportSchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { CbctService } from '../../services/cbct.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function cbctRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readPreHandler = [...preHandler, roleGuard('xrays', 'read')];

  // GET /cbct — List
  fastify.get('/', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const query = cbctOrderQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new CbctService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      fastify.log.error(err, 'CBCT list error');
      return apiError(reply, 500, 'Failed to list CBCT orders');
    }
  });

  // GET /cbct/patient/:patientId/timeline — Patient CBCT timeline
  fastify.get(
    '/patient/:patientId/timeline',
    { preHandler: readPreHandler },
    async (request, reply) => {
      try {
        const { patientId } = request.params as { patientId: string };
        const tenantDb = getTenantDb(request);
        const service = new CbctService(tenantDb);
        const orders = await service.getPatientTimeline(patientId);
        return apiResponse(reply, 200, { orders });
      } catch {
        return apiError(reply, 500, 'Failed to fetch CBCT timeline');
      }
    },
  );

  // GET /cbct/:id — Get detail
  fastify.get('/:id', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new CbctService(tenantDb);
      const order = await service.getById(id);
      return apiResponse(reply, 200, { order });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch CBCT order');
    }
  });

  // POST /cbct — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('xrays', 'create')] },
    async (request, reply) => {
      try {
        const data = createCbctOrderSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new CbctService(tenantDb);
        const order = await service.create(data);
        return apiResponse(reply, 201, { order }, 'CBCT order created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create CBCT order');
      }
    },
  );

  // PUT /cbct/:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateCbctOrderSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new CbctService(tenantDb);
        const order = await service.update(id, data);
        return apiResponse(reply, 200, { order }, 'CBCT order updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update CBCT order');
      }
    },
  );

  // DELETE /cbct/:id — Delete (requested only)
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('xrays', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new CbctService(tenantDb);
        const result = await service.delete(id);
        return apiResponse(reply, 200, result, 'CBCT order deleted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete CBCT order');
      }
    },
  );

  // PATCH /cbct/:id/status — Update status
  fastify.patch(
    '/:id/status',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { status } = request.body as { status: string };
        const tenantDb = getTenantDb(request);
        const service = new CbctService(tenantDb);
        const order = await service.updateStatus(id, status);
        return apiResponse(reply, 200, { order }, 'Status updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update CBCT status');
      }
    },
  );

  // PUT /cbct/:id/scan — Add/update scan data
  fastify.put(
    '/:id/scan',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const scanData = cbctScanSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new CbctService(tenantDb);
        const order = await service.updateScan(id, scanData);
        return apiResponse(reply, 200, { order }, 'Scan data updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update scan data');
      }
    },
  );

  // PUT /cbct/:id/report — Add/update report
  fastify.put(
    '/:id/report',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const reportData = cbctReportSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new CbctService(tenantDb);
        const order = await service.updateReport(id, reportData);
        return apiResponse(reply, 200, { order }, 'Report updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update report');
      }
    },
  );

  // ── Cross-Linking Endpoints (§17) ──────────────────────

  // GET /cbct/patient/:patientId/unlinked — Unlinked CBCT orders (for ImagingLinker)
  fastify.get(
    '/patient/:patientId/unlinked',
    { preHandler: readPreHandler },
    async (request, reply) => {
      try {
        const { patientId } = request.params as { patientId: string };
        const tenantDb = getTenantDb(request);
        const service = new CbctService(tenantDb);
        const orders = await service.getUnlinked(patientId);
        return apiResponse(reply, 200, { orders });
      } catch {
        return apiError(reply, 500, 'Failed to fetch unlinked CBCT orders');
      }
    },
  );

  // POST /cbct/:id/link — Link CBCT order to treatment plan or procedure note
  fastify.post(
    '/:id/link',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { targetType, targetId, treatmentPlanItemId } = request.body as {
          targetType: 'treatmentPlan' | 'procedureNote';
          targetId: string;
          treatmentPlanItemId?: string;
        };

        if (!targetType || !targetId) {
          return apiError(reply, 400, 'targetType and targetId are required');
        }

        const tenantDb = getTenantDb(request);
        const service = new CbctService(tenantDb);
        const order = await service.linkToTarget(id, targetType, targetId, {
          treatmentPlanItemId,
        });
        return apiResponse(reply, 200, { order }, 'CBCT order linked');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to link CBCT order');
      }
    },
  );

  // POST /cbct/:id/unlink — Unlink CBCT order from treatment plan or procedure note
  fastify.post(
    '/:id/unlink',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { targetType, targetId } = request.body as {
          targetType: 'treatmentPlan' | 'procedureNote';
          targetId: string;
        };

        if (!targetType || !targetId) {
          return apiError(reply, 400, 'targetType and targetId are required');
        }

        const tenantDb = getTenantDb(request);
        const service = new CbctService(tenantDb);
        const order = await service.unlinkFromTarget(id, targetType, targetId);
        return apiResponse(reply, 200, { order }, 'CBCT order unlinked');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to unlink CBCT order');
      }
    },
  );
}
