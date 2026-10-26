/**
 * Dental Chart Routes — Full chart CRUD + history snapshots
 *
 * Per V2_DATABASE.md §5.2, §5.3 — dental_charts + dental_chart_history
 * Per DENTO_V2_MASTER_PLAN.md §10 — Dental Chart Module
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/dental-charts                    — Get full chart for patient (query: patientId)
 *   - GET    /api/dental-charts/:id                — Get single tooth entry
 *   - POST   /api/dental-charts                    — Create/upsert tooth entry
 *   - POST   /api/dental-charts/bulk               — Bulk upsert multiple teeth
 *   - PUT    /api/dental-charts/:id                — Update tooth entry
 *   - DELETE /api/dental-charts/:id                — Delete tooth entry
 *   - POST   /api/dental-charts/history             — Create snapshot
 *   - GET    /api/dental-charts/history             — List snapshots (query: patientId)
 *   - GET    /api/dental-charts/history/:id         — Get single snapshot
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createDentalChartSchema,
  updateDentalChartSchema,
  dentalChartQuerySchema,
  createDentalChartHistorySchema,
  dentalChartHistoryQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { DentalChartService } from '../../services/dental-chart.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

export async function dentalChartRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readPreHandler = [...preHandler, roleGuard('dental-charts', 'read')];

  // ── History routes (registered BEFORE /:id to avoid conflict) ──

  // POST /dental-charts/history — Create snapshot
  fastify.post(
    '/history',
    { preHandler: [...preHandler, roleGuard('dental-charts', 'create')] },
    async (request, reply) => {
      try {
        const data = createDentalChartHistorySchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new DentalChartService(tenantDb);
        const snapshot = await service.createSnapshot(
          data.patientId,
          userId,
          data.notes,
          undefined,
          data.trigger,
        );
        return apiResponse(reply, 201, { snapshot }, 'Snapshot created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create snapshot');
      }
    },
  );

  // GET /dental-charts/history — List snapshots
  fastify.get('/history', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const query = dentalChartHistoryQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new DentalChartService(tenantDb);
      const result = await service.listHistory(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list chart history');
    }
  });

  // GET /dental-charts/history/:id — Get single snapshot
  fastify.get('/history/:id', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new DentalChartService(tenantDb);
      const snapshot = await service.getSnapshot(id);
      return apiResponse(reply, 200, { snapshot });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch snapshot');
    }
  });

  // ── Bulk upsert (before /:id) ─────────────────────────────

  // POST /dental-charts/bulk — Bulk upsert
  fastify.post(
    '/bulk',
    { preHandler: [...preHandler, roleGuard('dental-charts', 'create')] },
    async (request, reply) => {
      try {
        const body = request.body as { patientId: string; entries: Record<string, unknown>[] };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new DentalChartService(tenantDb);
        const result = await service.bulkUpsert(
          body.patientId,
          body.entries as Parameters<DentalChartService['bulkUpsert']>[1],
          userId,
        );
        return apiResponse(reply, 200, result, 'Bulk update complete');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to bulk upsert dental chart');
      }
    },
  );

  // ── Standard CRUD ─────────────────────────────────────────

  // GET /dental-charts — Get full chart for patient
  fastify.get('/', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const query = dentalChartQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new DentalChartService(tenantDb);
      const result = await service.getChart(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to fetch dental chart');
    }
  });

  // GET /dental-charts/:id — Get single entry
  fastify.get('/:id', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new DentalChartService(tenantDb);
      const entry = await service.getById(id);
      return apiResponse(reply, 200, { entry });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch dental chart entry');
    }
  });

  // POST /dental-charts — Create/upsert tooth entry
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('dental-charts', 'create')] },
    async (request, reply) => {
      try {
        const data = createDentalChartSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new DentalChartService(tenantDb);
        const entry = await service.upsert(data, userId);
        return apiResponse(reply, 201, { entry }, 'Dental chart entry saved');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to save dental chart entry');
      }
    },
  );

  // PUT /dental-charts/:id — Update tooth entry
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('dental-charts', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateDentalChartSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new DentalChartService(tenantDb);
        const entry = await service.update(id, data, userId);
        return apiResponse(reply, 200, { entry }, 'Dental chart entry updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update dental chart entry');
      }
    },
  );

  // DELETE /dental-charts/:id — Delete tooth entry
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('dental-charts', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new DentalChartService(tenantDb);
        const result = await service.delete(id);
        return apiResponse(reply, 200, result, 'Dental chart entry deleted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete dental chart entry');
      }
    },
  );
}
