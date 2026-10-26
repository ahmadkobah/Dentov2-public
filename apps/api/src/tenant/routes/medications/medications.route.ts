/**
 * Medication Routes — CRUD + autocomplete
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (Module #10 Prescriptions — medications catalog)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/medications              — List (paginated, filterable)
 *   - GET    /api/medications/autocomplete — Search for prescription form
 *   - GET    /api/medications/:id          — Get detail
 *   - POST   /api/medications              — Create custom medication
 *   - PUT    /api/medications/:id          — Update
 *   - DELETE /api/medications/:id          — Soft delete / deactivate
 *   - PATCH  /api/medications/:id/activation — Restore
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createMedicationSchema,
  updateMedicationSchema,
  medicationQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { MedicationService } from '../../services/medication.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function medicationRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /medications — List
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = medicationQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new MedicationService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list medications');
    }
  });

  // GET /medications/autocomplete — Lightweight search for prescription forms
  fastify.get('/autocomplete', { preHandler }, async (request, reply) => {
    try {
      const { q, limit } = request.query as { q?: string; limit?: string };
      if (!q || q.length < 1) {
        return apiResponse(reply, 200, []);
      }
      const tenantDb = getTenantDb(request);
      const service = new MedicationService(tenantDb);
      const results = await service.autocomplete(q, limit ? parseInt(limit, 10) : 10);
      return apiResponse(reply, 200, results);
    } catch {
      return apiError(reply, 500, 'Failed to search medications');
    }
  });

  // GET /medications/:id — Get detail
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new MedicationService(tenantDb);
      const medication = await service.getById(id);
      return apiResponse(reply, 200, { medication });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch medication');
    }
  });

  // POST /medications — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('prescriptions', 'create')] },
    async (request, reply) => {
      try {
        const data = createMedicationSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new MedicationService(tenantDb);
        const medication = await service.create(data);
        return apiResponse(reply, 201, { medication }, 'Medication created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create medication');
      }
    },
  );

  // PUT /medications/:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('prescriptions', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateMedicationSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new MedicationService(tenantDb);
        const medication = await service.update(id, data);
        return apiResponse(reply, 200, { medication }, 'Medication updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update medication');
      }
    },
  );

  // DELETE /medications/:id — Soft delete
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('prescriptions', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new MedicationService(tenantDb);
        const result = await service.softDelete(id);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete medication');
      }
    },
  );

  // PATCH /medications/:id/activation — Restore
  fastify.patch(
    '/:id/activation',
    { preHandler: [...preHandler, roleGuard('prescriptions', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new MedicationService(tenantDb);
        const medication = await service.restore(id);
        return apiResponse(reply, 200, { medication }, 'Medication restored');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to restore medication');
      }
    },
  );
}
