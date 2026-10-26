/**
 * Walk-in Queue Routes — Daily Operations
 *
 * Per DENTO_V2_MASTER_PLAN.md §18 — Walk-in Queue & Daily Ops
 * Per V2_DATABASE.md §6.4 — walk_in_queue collection
 *
 * Endpoints:
 *   - POST   /api/walk-in-queue              — Register walk-in
 *   - GET    /api/walk-in-queue              — List (today, by branch)
 *   - GET    /api/walk-in-queue/stats        — Queue stats
 *   - GET    /api/walk-in-queue/:id          — Get by ID
 *   - PATCH  /api/walk-in-queue/:id/call     — Call patient
 *   - PATCH  /api/walk-in-queue/:id/start    — Start treatment
 *   - PATCH  /api/walk-in-queue/:id/complete — Complete treatment
 *   - PATCH  /api/walk-in-queue/:id/no-show  — Mark no-show
 *   - PATCH  /api/walk-in-queue/:id/cancel   — Cancel
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware } from '../../middleware/index.js';
import { WalkInQueueService } from '../../services/walk-in-queue.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Validation Schemas ──────────────────────────────────────

const registerSchema = z
  .object({
    branchId: z.string().min(1),
    patientId: z.string().optional(),
    patientName: z.string().min(1).max(200),
    phone: z.string().max(20).optional(),
    reason: z.string().max(500).optional(),
    priority: z.enum(['normal', 'urgent', 'emergency']).optional(),
  })
  .strict();

const listQuerySchema = z
  .object({
    branchId: z.string().min(1),
    status: z
      .enum(['waiting', 'called', 'in_progress', 'completed', 'no_show', 'cancelled'])
      .optional(),
    date: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

const callSchema = z
  .object({
    doctorId: z.string().min(1),
  })
  .strict();

export async function walkInQueueRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // POST / — Register walk-in
  fastify.post('/', { preHandler }, async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const service = new WalkInQueueService(tenantDb);
      const entry = await service.register(data, userId);
      return apiResponse(reply, 201, { entry }, 'Walk-in registered');
    } catch (err) {
      if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
      return apiError(reply, 500, 'Failed to register walk-in');
    }
  });

  // GET / — List queue
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = listQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new WalkInQueueService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list queue');
    }
  });

  // GET /stats — Queue stats
  fastify.get('/stats', { preHandler }, async (request, reply) => {
    try {
      const { branchId } = z.object({ branchId: z.string().min(1) }).parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new WalkInQueueService(tenantDb);
      const stats = await service.getStats(branchId);
      return apiResponse(reply, 200, { stats });
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to get queue stats');
    }
  });

  // GET /:id — Get by ID
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new WalkInQueueService(tenantDb);
      const entry = await service.getById(id);
      return apiResponse(reply, 200, { entry });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch queue entry');
    }
  });

  // PATCH /:id/call — Call patient
  fastify.patch('/:id/call', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { doctorId } = callSchema.parse(request.body);
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const service = new WalkInQueueService(tenantDb);
      const entry = await service.callPatient(id, doctorId, userId);
      return apiResponse(reply, 200, { entry }, 'Patient called');
    } catch (err) {
      if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
      return apiError(reply, 500, 'Failed to call patient');
    }
  });

  // PATCH /:id/start — Start treatment (optionally assign chair)
  fastify.patch('/:id/start', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = z
        .object({ chairId: z.string().optional(), doctorId: z.string().optional() })
        .parse(request.body ?? {});
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const service = new WalkInQueueService(tenantDb);
      const entry = await service.startTreatment(id, userId, body.chairId, body.doctorId);
      return apiResponse(reply, 200, { entry }, 'Treatment started');
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to start treatment');
    }
  });

  // PATCH /:id/complete — Complete treatment
  fastify.patch('/:id/complete', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const service = new WalkInQueueService(tenantDb);
      const entry = await service.completeTreatment(id, userId);
      return apiResponse(reply, 200, { entry }, 'Treatment completed');
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to complete treatment');
    }
  });

  // PATCH /:id/no-show — Mark no-show
  fastify.patch('/:id/no-show', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const service = new WalkInQueueService(tenantDb);
      const entry = await service.markNoShow(id, userId);
      return apiResponse(reply, 200, { entry }, 'Marked as no-show');
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to mark no-show');
    }
  });

  // PATCH /:id/cancel — Cancel
  fastify.patch('/:id/cancel', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const service = new WalkInQueueService(tenantDb);
      const entry = await service.cancel(id, userId);
      return apiResponse(reply, 200, { entry }, 'Queue entry cancelled');
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to cancel queue entry');
    }
  });

  // PATCH /:id/skip — Phase 5.6 — Move waiting entry to back of queue
  fastify.patch('/:id/skip', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const service = new WalkInQueueService(tenantDb);
      const entry = await service.skip(id, userId);
      return apiResponse(reply, 200, { entry }, 'Skipped to back of queue');
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to skip entry');
    }
  });

  // PATCH /:id/reorder — Phase 5.6 — Swap to a target queueNumber
  fastify.patch('/:id/reorder', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { targetQueueNumber } = z
        .object({ targetQueueNumber: z.number().int().min(1) })
        .parse(request.body);
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const service = new WalkInQueueService(tenantDb);
      const entry = await service.reorder(id, targetQueueNumber, userId);
      return apiResponse(reply, 200, { entry }, 'Queue reordered');
    } catch (err) {
      if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
      return apiError(reply, 500, 'Failed to reorder queue');
    }
  });

  // POST /:id/convert — Phase 5.7 — Convert walk-in to scheduled appointment
  fastify.post('/:id/convert', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const slot = z
        .object({
          doctorId: z.string().min(1),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
          appointmentTypeId: z.string().optional(),
        })
        .strict()
        .parse(request.body);
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const service = new WalkInQueueService(tenantDb);
      const result = await service.convertToAppointment(id, slot, userId);
      return apiResponse(reply, 201, result, 'Walk-in converted to appointment');
    } catch (err) {
      if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
      return apiError(reply, 500, 'Failed to convert walk-in');
    }
  });
}
