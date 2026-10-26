/**
 * Doctor Routes — List + Get + Update + Toggle Active
 *
 * Per DENTO_V2_MASTER_PLAN.md §13 — Doctor Management
 *
 * Design Decision (P2 #17): No POST /doctors endpoint.
 * Doctors are created via POST /users/invite with role: 'doctor'.
 * The DoctorSyncService.createDoctorFromUser() handles Doctor profile creation.
 *
 * Endpoints:
 *   - GET    /api/doctors                  — List (paginated, filterable)
 *   - GET    /api/doctors/specializations  — Distinct specializations
 *   - GET    /api/doctors/:id              — Get by ID
 *   - PUT    /api/doctors/:id              — Update doctor-specific fields
 *   - PATCH  /api/doctors/:id/toggle       — Toggle active status
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { updateDoctorSchema, doctorQuerySchema } from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard, requireAdmin } from '../../middleware/index.js';
import { DoctorService } from '../../services/doctor.service.js';
import { DoctorSyncService } from '../../services/doctor-sync.service.js';
import { User } from '../../../platform/models/index.js';
import { logger } from '../../../utils/logger.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUser(request: unknown): { id: string; tenantSlug: string } {
  return (request as unknown as Record<string, unknown>).user as { id: string; tenantSlug: string };
}

export async function doctorRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET / — List
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = doctorQuerySchema.parse(request.query);
      const service = new DoctorService(getTenantDb(request));
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list doctors');
    }
  });

  // GET /specializations — Distinct specializations for filters
  fastify.get('/specializations', { preHandler }, async (request, reply) => {
    try {
      const service = new DoctorService(getTenantDb(request));
      const specializations = await service.getSpecializations();
      return apiResponse(reply, 200, { specializations });
    } catch {
      return apiError(reply, 500, 'Failed to get specializations');
    }
  });

  // GET /:id — Get by ID
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const service = new DoctorService(getTenantDb(request));
      const doctor = await service.getById(id);
      return apiResponse(reply, 200, { doctor });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to get doctor');
    }
  });

  // PUT /:id — Update doctor-specific fields
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('doctors', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateDoctorSchema.parse(request.body);
        const service = new DoctorService(getTenantDb(request));
        const doctor = await service.update(id, data);
        return apiResponse(reply, 200, { doctor });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to update doctor');
      }
    },
  );

  // PATCH /:id/toggle — Toggle active status
  fastify.patch(
    '/:id/toggle',
    { preHandler: [...preHandler, roleGuard('doctors', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new DoctorService(getTenantDb(request));
        const doctor = await service.toggleActive(id);
        return apiResponse(reply, 200, { doctor });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to toggle doctor status');
      }
    },
  );

  // DELETE /:id — Hard delete doctor
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('doctors', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new DoctorService(getTenantDb(request));
        await service.delete(id);
        return apiResponse(reply, 200, { deleted: true });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to delete doctor');
      }
    },
  );

  // POST /sync — Backfill Doctor records for dentist-role users missing one
  fastify.post('/sync', { preHandler: [...preHandler, requireAdmin] }, async (request, reply) => {
    try {
      const tenantDb = getTenantDb(request);
      const user = getUser(request);
      const syncService = new DoctorSyncService(tenantDb);
      const doctorService = new DoctorService(tenantDb);

      // Find all dentist-role users for this tenant
      const dentistUsers = await User.find({
        tenantSlug: user.tenantSlug,
        role: 'dentist',
      }).lean();

      // Get existing doctor userId set
      const allDoctors = await doctorService.listAll();
      const existingUserIds = new Set(allDoctors.map((d: { userId?: string }) => d.userId));

      let created = 0;
      for (const dentist of dentistUsers) {
        if (!existingUserIds.has(dentist._id.toString())) {
          try {
            await syncService.createDoctorFromUser(dentist as any, user.id);
            created++;
          } catch (err) {
            logger.error({ err, userId: dentist._id }, 'Failed to sync doctor record');
          }
        }
      }

      return apiResponse(reply, 200, { synced: created, total: dentistUsers.length });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to sync doctors');
    }
  });
}
