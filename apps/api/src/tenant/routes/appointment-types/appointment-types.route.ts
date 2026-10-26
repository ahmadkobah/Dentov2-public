/**
 * Appointment Type Routes — CRUD for appointment type configuration
 *
 * Per V2_DATABASE.md §6.6 — appointment_types collection
 * Per BUILD_RULES §3.2 — kebab-case top-level resource
 *
 * Endpoints:
 *   - GET    /api/appointment-types         — List types
 *   - GET    /api/appointment-types/:id     — Get type detail
 *   - POST   /api/appointment-types         — Create type
 *   - PUT    /api/appointment-types/:id     — Update type
 *   - DELETE /api/appointment-types/:id     — Deactivate type
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { createAppointmentTypeSchema, updateAppointmentTypeSchema } from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { AppointmentService } from '../../services/appointment.service.js';

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function appointmentTypeRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // ── GET /appointment-types ────────────────────────────────
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const tenantDb = getTenantDb(request);
      const activeOnly = (request.query as Record<string, string>).activeOnly !== 'false';
      const service = new AppointmentService(tenantDb);
      const types = await service.listAppointmentTypes(activeOnly);

      return apiResponse(reply, 200, { types });
    } catch (_err) {
      return apiError(reply, 500, 'Failed to list appointment types');
    }
  });

  // ── GET /appointment-types/:id ────────────────────────────
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const tenantDb = getTenantDb(request);
      const { id } = request.params as { id: string };
      const service = new AppointmentService(tenantDb);
      const type = await service.getAppointmentTypeById(id);

      return apiResponse(reply, 200, { type });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to fetch appointment type');
    }
  });

  // ── POST /appointment-types ───────────────────────────────
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('appointments', 'create')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const body = createAppointmentTypeSchema.parse(request.body);
        const service = new AppointmentService(tenantDb);
        const type = await service.createAppointmentType(body, userId);

        return apiResponse(reply, 201, { type });
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to create appointment type');
      }
    },
  );

  // ── PUT /appointment-types/:id ────────────────────────────
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const { id } = request.params as { id: string };
        const body = updateAppointmentTypeSchema.parse(request.body);
        const service = new AppointmentService(tenantDb);
        const type = await service.updateAppointmentType(id, body, userId);

        return apiResponse(reply, 200, { type });
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to update appointment type');
      }
    },
  );

  // ── DELETE /appointment-types/:id ─────────────────────────
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('appointments', 'delete')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const { id } = request.params as { id: string };
        const service = new AppointmentService(tenantDb);
        const result = await service.deleteAppointmentType(id, userId);

        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to delete appointment type');
      }
    },
  );
}
