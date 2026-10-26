/**
 * Patient Routes — Full CRUD + medical history + allergies
 *
 * Per DENTO_V2_MASTER_PLAN.md — Patient Management
 * Per V2_DATABASE.md §5 — Patient Records
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 * Per BUILD_RULES §3.5 — Relative paths, prefix set in server.ts
 *
 * Endpoints:
 *   - GET    /api/patients                            — List (paginated, searchable, filterable)
 *   - GET    /api/patients/:id                        — Get detail (with decrypted PII)
 *   - POST   /api/patients                            — Create (with PII encryption)
 *   - PUT    /api/patients/:id                        — Update (with PII encryption)
 *   - DELETE /api/patients/:id                        — Soft delete
 *   - PATCH  /api/patients/:id/activation             — Restore soft-deleted (isActive toggle)
 *   - PATCH  /api/patients/:id/medical-history        — Update medical history
 *   - POST   /api/patients/:id/allergies              — Add allergy
 *   - DELETE /api/patients/:id/allergies/:allergyId   — Remove allergy
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createPatientSchema,
  updatePatientSchema,
  patientQuerySchema,
  medicalHistorySchema,
  allergySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard, withAudit } from '../../middleware/index.js';
import { PatientService } from '../../services/patient.service.js';
import { PatientMergeService } from '../../services/patient-merge.service.js';

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function patientRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /patients — List patients (paginated, searchable)
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = patientQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new PatientService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list patients');
    }
  });

  // GET /patients/:id — Get patient by ID (decrypted PII) [Phase 8.1 — PHI read audit]
  fastify.get(
    '/:id',
    {
      preHandler: [...preHandler, withAudit({ resourceType: 'patient', sensitivityLevel: 'high' })],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new PatientService(tenantDb);
        const patient = await service.getById(id);
        return apiResponse(reply, 200, { patient });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch patient');
      }
    },
  );

  // POST /patients — Create new patient
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('patients', 'create')] },
    async (request, reply) => {
      try {
        const data = createPatientSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PatientService(tenantDb);
        const patient = await service.create(data, userId);
        return apiResponse(reply, 201, { patient }, 'Patient created');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to create patient');
      }
    },
  );

  // PUT /patients/:id — Update patient
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('patients', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updatePatientSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PatientService(tenantDb);
        const patient = await service.update(id, data, userId);
        return apiResponse(reply, 200, { patient }, 'Patient updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update patient');
      }
    },
  );

  // DELETE /patients/:id — Soft delete patient
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('patients', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PatientService(tenantDb);
        const result = await service.softDelete(id, userId);
        return apiResponse(reply, 200, result, 'Patient deactivated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete patient');
      }
    },
  );

  // POST /patients/:keepId/merge/:duplicateId — Phase 4.3
  // Re-points all owned records from the duplicate onto the keep record then
  // soft-deletes the duplicate. Permanent and audited as `critical`.
  fastify.post(
    '/:keepId/merge/:duplicateId',
    { preHandler: [...preHandler, roleGuard('patients', 'delete')] },
    async (request, reply) => {
      try {
        const { keepId, duplicateId } = request.params as {
          keepId: string;
          duplicateId: string;
        };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PatientMergeService(tenantDb);
        const result = await service.merge(keepId, duplicateId, userId);
        return apiResponse(reply, 200, result, 'Patients merged');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to merge patients');
      }
    },
  );

  // PATCH /patients/:id/activation — Restore soft-deleted patient (§3.2 noun URL)
  fastify.patch(
    '/:id/activation',
    { preHandler: [...preHandler, roleGuard('patients', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PatientService(tenantDb);
        const patient = await service.restore(id, userId);
        return apiResponse(reply, 200, { patient }, 'Patient restored');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to restore patient');
      }
    },
  );

  // POST /patients/:id/branch-transfers — Transfer to another branch (Phase 9.1)
  fastify.post(
    '/:id/branch-transfers',
    { preHandler: [...preHandler, roleGuard('patients', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = (request.body ?? {}) as { newBranchId?: string; reason?: string };
        if (!body.newBranchId) {
          return apiError(reply, 400, 'newBranchId is required');
        }
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PatientService(tenantDb);
        const patient = await service.transferBranch(id, body.newBranchId, body.reason, userId);
        return apiResponse(reply, 200, { patient }, 'Patient transferred');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to transfer patient');
      }
    },
  );

  // PATCH /patients/:id/medical-history — Update medical history
  fastify.patch(
    '/:id/medical-history',
    { preHandler: [...preHandler, roleGuard('patients', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = medicalHistorySchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PatientService(tenantDb);
        const patient = await service.updateMedicalHistory(id, data, userId);
        return apiResponse(reply, 200, { patient }, 'Medical history updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update medical history');
      }
    },
  );

  // POST /patients/:id/allergies — Add allergy
  fastify.post(
    '/:id/allergies',
    { preHandler: [...preHandler, roleGuard('patients', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = allergySchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PatientService(tenantDb);
        const patient = await service.addAllergy(id, data, userId);
        return apiResponse(reply, 201, { patient }, 'Allergy added');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to add allergy');
      }
    },
  );

  // DELETE /patients/:id/allergies/:allergyId — Remove allergy
  fastify.delete(
    '/:id/allergies/:allergyId',
    { preHandler: [...preHandler, roleGuard('patients', 'update')] },
    async (request, reply) => {
      try {
        const { id, allergyId } = request.params as { id: string; allergyId: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PatientService(tenantDb);
        const patient = await service.removeAllergy(id, allergyId, userId);
        return apiResponse(reply, 200, { patient }, 'Allergy removed');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to remove allergy');
      }
    },
  );
}
