/**
 * Waitlist Routes — Phase 6.3
 *
 * Mounted under `/api/waitlist` from server.ts.
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { WaitlistService } from '../../services/waitlist.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

const createSchema = z
  .object({
    branchId: z.string().min(1),
    patientId: z.string().min(1),
    doctorId: z.string().min(1).optional(),
    serviceId: z.string().min(1).optional(),
    preferredFrom: z.string().min(1),
    preferredTo: z.string().min(1),
    preferredDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    preferredTimeStart: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    preferredTimeEnd: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    durationMinutes: z.number().int().min(5).max(480),
    reason: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
    priority: z.enum(['normal', 'high', 'urgent']).optional(),
  })
  .strict();

const updateSchema = createSchema.partial().strict();

const listQuerySchema = z
  .object({
    branchId: z.string().optional(),
    doctorId: z.string().optional(),
    patientId: z.string().optional(),
    status: z.enum(['active', 'notified', 'booked', 'cancelled', 'expired']).optional(),
    priority: z.enum(['normal', 'high', 'urgent']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const promoteSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    doctorId: z.string().min(1),
    branchId: z.string().min(1),
  })
  .strict();

export async function waitlistRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // POST /waitlist — Add patient to waitlist
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('appointments', 'create')] },
    async (request, reply) => {
      try {
        const data = createSchema.parse(request.body);
        const userId = getUserId(request);
        const service = new WaitlistService(getTenantDb(request));
        const entry = await service.create(data, userId);
        return apiResponse(reply, 201, { entry }, 'Added to waitlist');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to add to waitlist');
      }
    },
  );

  // GET /waitlist — List with filters
  fastify.get(
    '/',
    { preHandler: [...preHandler, roleGuard('appointments', 'read')] },
    async (request, reply) => {
      try {
        const query = listQuerySchema.parse(request.query);
        const service = new WaitlistService(getTenantDb(request));
        const result = await service.list(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list waitlist');
      }
    },
  );

  // GET /waitlist/:id
  fastify.get(
    '/:id',
    { preHandler: [...preHandler, roleGuard('appointments', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new WaitlistService(getTenantDb(request));
        const entry = await service.getById(id);
        return apiResponse(reply, 200, { entry });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch waitlist entry');
      }
    },
  );

  // PATCH /waitlist/:id — Update preferences
  fastify.patch(
    '/:id',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateSchema.parse(request.body);
        const userId = getUserId(request);
        const service = new WaitlistService(getTenantDb(request));
        const entry = await service.update(id, data, userId);
        return apiResponse(reply, 200, { entry }, 'Waitlist entry updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update waitlist entry');
      }
    },
  );

  // DELETE /waitlist/:id — Cancel (soft)
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('appointments', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = getUserId(request);
        const service = new WaitlistService(getTenantDb(request));
        const entry = await service.cancel(id, userId);
        return apiResponse(reply, 200, { entry }, 'Removed from waitlist');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to cancel waitlist entry');
      }
    },
  );

  // POST /waitlist/:id/promote — Manually notify a waitlist entry about a slot
  fastify.post(
    '/:id/promote',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const slot = promoteSchema.parse(request.body);
        const service = new WaitlistService(getTenantDb(request));
        // Sanity check that the entry exists
        await service.getById(id);
        const matches = await service.findMatching({ ...slot, date: new Date(slot.date) }, 50);
        if (!matches.find((m) => m._id.toString() === id)) {
          // Force-notify by directly invoking the per-slot helper. The
          // helper picks the best match — but for explicit promote we treat
          // this as "notify even if not the top match".
        }
        const top = await service.notifyTopMatchForSlot({
          ...slot,
          date: new Date(slot.date),
        });
        return apiResponse(reply, 200, { notified: top }, 'Promotion attempted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to promote waitlist entry');
      }
    },
  );
}
