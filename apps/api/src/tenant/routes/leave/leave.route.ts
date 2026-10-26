/**
 * Leave Routes — Leave Types, Leave Requests, Leave Balances
 *
 * Per IMPLEMENTATION_ROADMAP.md — Week 9 (Leave Requests Part 1)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   Leave Types:
 *   - GET    /api/leave/types                — List leave types
 *   - POST   /api/leave/types                — Create leave type
 *   - PUT    /api/leave/types/:id            — Update leave type
 *   - DELETE /api/leave/types/:id            — Soft delete leave type
 *
 *   Leave Requests:
 *   - GET    /api/leave/requests             — List leave requests
 *   - GET    /api/leave/requests/:id         — Get leave request detail
 *   - POST   /api/leave/requests             — Create leave request
 *   - PUT    /api/leave/requests/:id         — Update pending request
 *   - PATCH  /api/leave/requests/:id/status  — Approve/reject/cancel
 *
 *   Leave Balances:
 *   - GET    /api/leave/balances             — List balances
 *   - PUT    /api/leave/balances/:id         — Update balance (admin adjust)
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  leaveTypeQuerySchema,
  createLeaveRequestSchema,
  updateLeaveRequestSchema,
  reviewLeaveRequestSchema,
  leaveRequestQuerySchema,
  leaveBalanceQuerySchema,
  updateLeaveBalanceSchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { LeaveService } from '../../services/leave.service.js';

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function leaveRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // ═══════════════════════════════════════════════════════════
  // LEAVE TYPES
  // ═══════════════════════════════════════════════════════════

  // GET /leave/types
  fastify.get(
    '/types',
    { preHandler: [...preHandler, roleGuard('leave', 'read')] },
    async (request, reply) => {
      try {
        const query = leaveTypeQuerySchema.parse(request.query);
        const service = new LeaveService(getTenantDb(request));
        const result = await service.listTypes(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list leave types');
      }
    },
  );

  // POST /leave/types
  fastify.post(
    '/types',
    { preHandler: [...preHandler, roleGuard('leave', 'create')] },
    async (request, reply) => {
      try {
        const data = createLeaveTypeSchema.parse(request.body);
        const service = new LeaveService(getTenantDb(request));
        const type = await service.createType(data, getUserId(request));
        return apiResponse(reply, 201, { type }, 'Leave type created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create leave type');
      }
    },
  );

  // PUT /leave/types/:id
  fastify.put(
    '/types/:id',
    { preHandler: [...preHandler, roleGuard('leave', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateLeaveTypeSchema.parse(request.body);
        const service = new LeaveService(getTenantDb(request));
        const type = await service.updateType(id, data, getUserId(request));
        return apiResponse(reply, 200, { type }, 'Leave type updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update leave type');
      }
    },
  );

  // DELETE /leave/types/:id
  fastify.delete(
    '/types/:id',
    { preHandler: [...preHandler, roleGuard('leave', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new LeaveService(getTenantDb(request));
        const type = await service.deleteType(id, getUserId(request));
        return apiResponse(reply, 200, { type }, 'Leave type deactivated');
      } catch (err) {
        return apiError(reply, 500, 'Failed to delete leave type');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // LEAVE REQUESTS
  // ═══════════════════════════════════════════════════════════

  // GET /leave/requests
  fastify.get(
    '/requests',
    { preHandler: [...preHandler, roleGuard('leave', 'read')] },
    async (request, reply) => {
      try {
        const query = leaveRequestQuerySchema.parse(request.query);
        const service = new LeaveService(getTenantDb(request));
        const result = await service.listRequests(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list leave requests');
      }
    },
  );

  // GET /leave/requests/:id
  fastify.get(
    '/requests/:id',
    { preHandler: [...preHandler, roleGuard('leave', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new LeaveService(getTenantDb(request));
        const request_ = await service.getRequestById(id);
        return apiResponse(reply, 200, { request: request_ });
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to fetch leave request');
      }
    },
  );

  // POST /leave/requests
  fastify.post(
    '/requests',
    { preHandler: [...preHandler, roleGuard('leave', 'create')] },
    async (request, reply) => {
      try {
        const data = createLeaveRequestSchema.parse(request.body);
        const service = new LeaveService(getTenantDb(request));
        const result = await service.createRequest(data, getUserId(request));
        return apiResponse(reply, 201, { request: result }, 'Leave request created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create leave request');
      }
    },
  );

  // PUT /leave/requests/:id
  fastify.put(
    '/requests/:id',
    { preHandler: [...preHandler, roleGuard('leave', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateLeaveRequestSchema.parse(request.body);
        const service = new LeaveService(getTenantDb(request));
        const result = await service.updateRequest(id, data, getUserId(request));
        return apiResponse(reply, 200, { request: result }, 'Leave request updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update leave request');
      }
    },
  );

  // PATCH /leave/requests/:id/status — Approve/reject/cancel (per BUILD_RULES §3.2 — noun URL)
  fastify.patch(
    '/requests/:id/status',
    { preHandler: [...preHandler, roleGuard('leave', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = reviewLeaveRequestSchema.parse(request.body);
        const service = new LeaveService(getTenantDb(request));

        let result;
        if (data.status === 'cancelled') {
          result = await service.cancelRequest(id, getUserId(request));
        } else {
          result = await service.reviewRequest(id, data, getUserId(request));
        }

        return apiResponse(reply, 200, { request: result }, `Leave request ${data.status}`);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update leave request status');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // LEAVE BALANCES
  // ═══════════════════════════════════════════════════════════

  // GET /leave/balances
  fastify.get(
    '/balances',
    { preHandler: [...preHandler, roleGuard('leave', 'read')] },
    async (request, reply) => {
      try {
        const query = leaveBalanceQuerySchema.parse(request.query);
        const service = new LeaveService(getTenantDb(request));
        const balances = await service.listBalances(query);
        return apiResponse(reply, 200, { balances });
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list leave balances');
      }
    },
  );

  // PUT /leave/balances/:id
  fastify.put(
    '/balances/:id',
    { preHandler: [...preHandler, roleGuard('leave', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateLeaveBalanceSchema.parse(request.body);
        const service = new LeaveService(getTenantDb(request));
        const balance = await service.updateBalance(id, data, getUserId(request));
        return apiResponse(reply, 200, { balance }, 'Leave balance updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update leave balance');
      }
    },
  );
}
