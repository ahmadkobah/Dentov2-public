/**
 * Workflow Routes — CRUD + Execution History
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 — Workflow Rules
 * Event-driven automation engine.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowQuerySchema,
  workflowExecutionQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, requireAdmin } from '../../middleware/index.js';
import { WorkflowService } from '../../services/workflow.service.js';

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function workflowRoutes(fastify: FastifyInstance) {
  const adminOnly = [authGuard, tenantDbMiddleware, requireAdmin];

  // ─── GET / — List workflow rules ──────────────────────────
  fastify.get(
    '/',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = workflowQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const service = new WorkflowService(tenantDb);
        const result = await service.list(query);
        return apiResponse(reply, 200, result);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch workflows');
      }
    },
  );

  // ─── GET /:id — Get a single workflow rule ────────────────
  fastify.get(
    '/:id',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new WorkflowService(tenantDb);
        const workflow = await service.getById(id);
        return apiResponse(reply, 200, { workflow });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch workflow');
      }
    },
  );

  // ─── POST / — Create a workflow rule ──────────────────────
  fastify.post(
    '/',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createWorkflowSchema.parse(request.body);
        const userId = getUserId(request);
        const tenantDb = getTenantDb(request);
        const service = new WorkflowService(tenantDb);
        const workflow = await service.create(body as any, userId);
        return apiResponse(reply, 201, { workflow }, 'Workflow rule created');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to create workflow');
      }
    },
  );

  // ─── PATCH /:id — Update a workflow rule ──────────────────
  fastify.patch(
    '/:id',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateWorkflowSchema.parse(request.body);
        const userId = getUserId(request);
        const tenantDb = getTenantDb(request);
        const service = new WorkflowService(tenantDb);
        const workflow = await service.update(id, body as any, userId);
        return apiResponse(reply, 200, { workflow }, 'Workflow rule updated');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to update workflow');
      }
    },
  );

  // ─── PATCH /:id/toggle — Toggle active status ────────────
  fastify.patch(
    '/:id/toggle',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { isActive } = request.body as { isActive: boolean };
        const userId = getUserId(request);
        const tenantDb = getTenantDb(request);
        const service = new WorkflowService(tenantDb);
        const workflow = await service.toggleActive(id, isActive, userId);
        return apiResponse(
          reply,
          200,
          { workflow },
          `Workflow ${isActive ? 'activated' : 'deactivated'}`,
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to toggle workflow');
      }
    },
  );

  // ─── DELETE /:id — Delete a workflow rule ─────────────────
  fastify.delete(
    '/:id',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new WorkflowService(tenantDb);
        await service.delete(id);
        return apiResponse(reply, 200, null, 'Workflow rule deleted');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to delete workflow');
      }
    },
  );

  // ─── GET /executions — Execution history ──────────────────
  fastify.get(
    '/executions',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = workflowExecutionQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const service = new WorkflowService(tenantDb);
        const result = await service.getExecutionHistory(query);
        return apiResponse(reply, 200, result);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch execution history');
      }
    },
  );

  // ─── GET /:id/executions — Execution history for a specific workflow
  fastify.get(
    '/:id/executions',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const query = workflowExecutionQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const service = new WorkflowService(tenantDb);
        const result = await service.getExecutionHistory({ ...query, workflowId: id });
        return apiResponse(reply, 200, result);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch execution history');
      }
    },
  );
}
