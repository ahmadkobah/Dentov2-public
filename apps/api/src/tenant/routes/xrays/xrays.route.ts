/**
 * X-Ray Routes — CRUD + patient timeline + tooth lookup
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11), §17 (Clinical Cross-Linking)
 * Per SECURITY_AND_ENCRYPTION.md §8 (File Upload Security)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/xrays                         — List (paginated, filterable)
 *   - GET    /api/xrays/:id                     — Get detail
 *   - POST   /api/xrays                         — Create (metadata — file upload separate)
 *   - PUT    /api/xrays/:id                     — Update metadata + cross-links
 *   - DELETE /api/xrays/:id                     — Delete
 *   - GET    /api/xrays/patient/:patientId/timeline — Patient imaging timeline
 *   - GET    /api/xrays/patient/:patientId/tooth/:toothNumber — By tooth number
 *   - GET    /api/xrays/patient/:patientId/unlinked — Unlinked X-Rays (for ImagingLinker)
 *   - POST   /api/xrays/:id/link                   — Link to treatment plan / procedure note
 *   - POST   /api/xrays/:id/unlink                 — Unlink from treatment plan / procedure note
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { createXraySchema, updateXraySchema, xrayQuerySchema } from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { XrayService } from '../../services/xray.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function xrayRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readPreHandler = [...preHandler, roleGuard('xrays', 'read')];

  // GET /xrays — List
  fastify.get('/', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const query = xrayQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new XrayService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list x-rays');
    }
  });

  // GET /xrays/patient/:patientId/timeline — Patient imaging timeline
  fastify.get(
    '/patient/:patientId/timeline',
    { preHandler: readPreHandler },
    async (request, reply) => {
      try {
        const { patientId } = request.params as { patientId: string };
        const tenantDb = getTenantDb(request);
        const service = new XrayService(tenantDb);
        const xrays = await service.getPatientTimeline(patientId);
        return apiResponse(reply, 200, { xrays });
      } catch {
        return apiError(reply, 500, 'Failed to fetch patient x-ray timeline');
      }
    },
  );

  // GET /xrays/patient/:patientId/tooth/:toothNumber — By tooth
  fastify.get(
    '/patient/:patientId/tooth/:toothNumber',
    { preHandler: readPreHandler },
    async (request, reply) => {
      try {
        const { patientId, toothNumber } = request.params as {
          patientId: string;
          toothNumber: string;
        };
        const tenantDb = getTenantDb(request);
        const service = new XrayService(tenantDb);
        const xrays = await service.getByToothNumber(patientId, toothNumber);
        return apiResponse(reply, 200, { xrays });
      } catch {
        return apiError(reply, 500, 'Failed to fetch x-rays for tooth');
      }
    },
  );

  // GET /xrays/patient/:patientId/unlinked — Unlinked (for ImagingLinker)
  fastify.get(
    '/patient/:patientId/unlinked',
    { preHandler: readPreHandler },
    async (request, reply) => {
      try {
        const { patientId } = request.params as { patientId: string };
        const tenantDb = getTenantDb(request);
        const service = new XrayService(tenantDb);
        const xrays = await service.getUnlinked(patientId);
        return apiResponse(reply, 200, { xrays });
      } catch {
        return apiError(reply, 500, 'Failed to fetch unlinked x-rays');
      }
    },
  );

  // GET /xrays/:id — Get detail
  fastify.get('/:id', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new XrayService(tenantDb);
      const xray = await service.getById(id);
      return apiResponse(reply, 200, { xray });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch x-ray');
    }
  });

  // POST /xrays — Create (metadata record — file upload handled separately)
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('xrays', 'create')] },
    async (request, reply) => {
      try {
        const data = createXraySchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new XrayService(tenantDb);
        const xray = await service.create(
          {
            ...data,
            imageUrl: data.imageUrl || '',
          },
          { userId: request.user?.userId ?? '', ipAddress: request.ip },
        );
        return apiResponse(reply, 201, { xray }, 'X-Ray created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to create x-ray');
      }
    },
  );

  // POST /xrays/safety-check — Pre-flight pregnancy / contraindication check
  fastify.post(
    '/safety-check',
    { preHandler: [...preHandler, roleGuard('xrays', 'create')] },
    async (request, reply) => {
      try {
        const { patientId } = (request.body ?? {}) as { patientId?: string };
        if (!patientId) return apiError(reply, 400, 'patientId is required');
        const tenantDb = getTenantDb(request);
        const service = new XrayService(tenantDb);
        const warnings = await service.runSafetyChecks({ patientId });
        return apiResponse(reply, 200, { warnings });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to run safety check');
      }
    },
  );

  // PUT /xrays/:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateXraySchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new XrayService(tenantDb);
        const xray = await service.update(id, data);
        return apiResponse(reply, 200, { xray }, 'X-Ray updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update x-ray');
      }
    },
  );

  // DELETE /xrays/:id — Delete
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('xrays', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new XrayService(tenantDb);
        const result = await service.delete(id);
        return apiResponse(reply, 200, result, 'X-Ray deleted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete x-ray');
      }
    },
  );

  // ── Cross-Linking Endpoints (§17) ──────────────────────

  // POST /xrays/:id/link — Link X-Ray to treatment plan or procedure note
  fastify.post(
    '/:id/link',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { targetType, targetId, treatmentPlanItemId, purpose } = request.body as {
          targetType: 'treatmentPlan' | 'procedureNote';
          targetId: string;
          treatmentPlanItemId?: string;
          purpose?: 'preOp' | 'postOp' | 'linked';
        };

        if (!targetType || !targetId) {
          return apiError(reply, 400, 'targetType and targetId are required');
        }

        const tenantDb = getTenantDb(request);
        const service = new XrayService(tenantDb);
        const xray = await service.linkToTarget(id, targetType, targetId, {
          treatmentPlanItemId,
          purpose,
        });
        return apiResponse(reply, 200, { xray }, 'X-Ray linked');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to link x-ray');
      }
    },
  );

  // POST /xrays/:id/unlink — Unlink X-Ray from treatment plan or procedure note
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
        const service = new XrayService(tenantDb);
        const xray = await service.unlinkFromTarget(id, targetType, targetId);
        return apiResponse(reply, 200, { xray }, 'X-Ray unlinked');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to unlink x-ray');
      }
    },
  );
}
