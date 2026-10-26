/**
 * Prescription Routes — CRUD + status + items
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (Module #10 Prescriptions)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/prescriptions             — List (paginated, filterable)
 *   - GET    /api/prescriptions/:id         — Get detail
 *   - POST   /api/prescriptions             — Create
 *   - PUT    /api/prescriptions/:id         — Update
 *   - DELETE /api/prescriptions/:id         — Delete (draft only)
 *   - PATCH  /api/prescriptions/:id/status  — Update status (transition validation)
 */

import type { FastifyInstance } from 'fastify';
import { Types, type Connection } from 'mongoose';
import {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  prescriptionQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard, withAudit } from '../../middleware/index.js';
import { PrescriptionService } from '../../services/prescription.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function prescriptionRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readPreHandler = [...preHandler, roleGuard('prescriptions', 'read')];

  // GET /prescriptions — List
  fastify.get('/', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const query = prescriptionQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new PrescriptionService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      fastify.log.error(err, 'Failed to list prescriptions');
      return apiError(reply, 500, 'Failed to list prescriptions');
    }
  });

  // GET /prescriptions/:id — Get detail [Phase 8.4 — controlled-substance traceability]
  fastify.get(
    '/:id',
    {
      preHandler: [
        ...readPreHandler,
        withAudit({
          resourceType: 'prescription',
          sensitivityLevel: 'high',
          action: 'export',
        }),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new PrescriptionService(tenantDb);
        const prescription = await service.getById(id);
        return apiResponse(reply, 200, { prescription });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch prescription');
      }
    },
  );

  // POST /prescriptions — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('prescriptions', 'create')] },
    async (request, reply) => {
      try {
        const data = createPrescriptionSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new PrescriptionService(tenantDb);
        const prescription = await service.create(data, {
          userId: request.user?.userId ?? '',
          ipAddress: request.ip,
        });
        return apiResponse(reply, 201, { prescription }, 'Prescription created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        // Re-throw ApiError so global error handler renders details (e.g. warnings)
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to create prescription');
      }
    },
  );

  // POST /prescriptions/safety-check — Pre-flight clinical safety check
  fastify.post(
    '/safety-check',
    { preHandler: [...preHandler, roleGuard('prescriptions', 'create')] },
    async (request, reply) => {
      try {
        const data = createPrescriptionSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new PrescriptionService(tenantDb);
        const warnings = await service.runSafetyChecks(data);
        return apiResponse(reply, 200, { warnings });
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to run safety check');
      }
    },
  );

  // PUT /prescriptions/:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('prescriptions', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updatePrescriptionSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new PrescriptionService(tenantDb);
        const prescription = await service.update(id, data);
        return apiResponse(reply, 200, { prescription }, 'Prescription updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update prescription');
      }
    },
  );

  // DELETE /prescriptions/:id — Delete (draft only)
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('prescriptions', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new PrescriptionService(tenantDb);
        const result = await service.delete(id);
        return apiResponse(reply, 200, result, 'Prescription deleted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete prescription');
      }
    },
  );

  // PATCH /prescriptions/:id/status — Update status
  fastify.patch(
    '/:id/status',
    { preHandler: [...preHandler, roleGuard('prescriptions', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { status } = request.body as { status: string };
        const tenantDb = getTenantDb(request);
        const service = new PrescriptionService(tenantDb);
        const prescription = await service.updateStatus(id, status);
        return apiResponse(reply, 200, { prescription }, 'Status updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update status');
      }
    },
  );

  // POST /prescriptions/:id/print-events — Record explicit print/PDF download (Phase 8.4)
  fastify.post('/:id/print-events', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { medium?: string; reason?: string };
      const medium = body.medium ?? 'pdf';
      const tenantDb = getTenantDb(request);
      const { getAuditLogModel } = await import('../../models/audit-log.model.js');
      const AuditLog = getAuditLogModel(tenantDb);
      const actor = request.user;
      if (!actor) {
        return apiError(reply, 401, 'Authentication required');
      }
      await AuditLog.create({
        actorId: new Types.ObjectId(actor.userId),
        actorEmail: actor.email,
        actorRole: actor.role,
        tenantSlug: (request as { tenantSlug?: string }).tenantSlug ?? null,
        resourceType: 'prescription',
        resourceId: id,
        action: 'export',
        description: `PRINT prescription:${id} via ${medium}${body.reason ? ` — ${body.reason}` : ''}`,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
        requestId: request.id,
        sensitivityLevel: 'high',
        status: 'success',
      });
      return apiResponse(reply, 201, { ok: true }, 'Print event recorded');
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to record print event');
    }
  });
}
