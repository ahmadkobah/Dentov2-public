/**
 * Chair Routes — Real-time chair availability for Daily Operations Hub
 *
 * Per DENTO_V2_MASTER_PLAN.md §18 — Chair Dashboard & Daily Ops
 * Per V2_DATABASE.md §6.4 — chairs collection
 *
 * Endpoints:
 *   - GET /api/chairs/availability   — List chairs with real-time status by branch
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { chairAvailabilityQuerySchema } from '@dento/shared';
import { getChairModel } from '../../models/chair.model.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware } from '../../middleware/index.js';

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

// ── Route Registration ──────────────────────────────────────

export async function chairRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // ── GET /chairs/availability ──────────────────────────────
  // Returns all active chairs for a branch, optionally filtered by status.
  // Used by the Daily Ops Hub chair grid and queue board.
  fastify.get('/availability', { preHandler }, async (request, reply) => {
    try {
      const tenantDb = getTenantDb(request);
      const { branchId, status } = chairAvailabilityQuerySchema.parse(request.query);

      const Chair = getChairModel(tenantDb);

      const filter: Record<string, unknown> = { branchId, isActive: true };
      if (status) filter.status = status;

      const chairs = await Chair.find(filter)
        .populate('currentPatientId', 'firstName lastName patientCode')
        .populate('currentDoctorId', 'firstName lastName specialization')
        .populate('currentAppointmentId', 'startTime endTime type status')
        .sort({ number: 1 })
        .lean();

      return apiResponse(reply, 200, chairs);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to fetch chair availability');
    }
  });
}
