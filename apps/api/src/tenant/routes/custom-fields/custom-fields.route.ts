/**
 * Custom Field Routes — CRUD
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 — Custom Fields
 * Dynamic user-defined fields per entity type.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createCustomFieldSchema,
  updateCustomFieldSchema,
  customFieldQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, requireAdmin } from '../../middleware/index.js';
import { CustomFieldService } from '../../services/custom-field.service.js';

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function customFieldRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const adminOnly = [authGuard, tenantDbMiddleware, requireAdmin];

  // ─── GET / — List custom fields ──────────────────────────
  fastify.get('/', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = customFieldQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new CustomFieldService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result.data, undefined, result.pagination);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return apiError(reply, 500, 'Failed to fetch custom fields');
    }
  });

  // ─── GET /entity/:entity — Get fields for a specific entity
  fastify.get(
    '/entity/:entity',
    { preHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { entity } = request.params as { entity: string };
        const tenantDb = getTenantDb(request);
        const service = new CustomFieldService(tenantDb);
        const fields = await service.getFieldsForEntity(entity);
        return apiResponse(reply, 200, { fields });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch custom fields for entity');
      }
    },
  );

  // ─── GET /:id — Get a single custom field ────────────────
  fastify.get('/:id', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new CustomFieldService(tenantDb);
      const field = await service.getById(id);
      return apiResponse(reply, 200, { customField: field });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return apiError(reply, 500, 'Failed to fetch custom field');
    }
  });

  // ─── POST / — Create a custom field (admin only) ─────────
  fastify.post(
    '/',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createCustomFieldSchema.parse(request.body);
        const userId = getUserId(request);
        const tenantDb = getTenantDb(request);
        const service = new CustomFieldService(tenantDb);
        const field = await service.create(body as any, userId);
        return apiResponse(reply, 201, { customField: field }, 'Custom field created');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to create custom field');
      }
    },
  );

  // ─── PATCH /:id — Update a custom field (admin only) ─────
  fastify.patch(
    '/:id',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateCustomFieldSchema.parse(request.body);
        const userId = getUserId(request);
        const tenantDb = getTenantDb(request);
        const service = new CustomFieldService(tenantDb);
        const field = await service.update(id, body as any, userId);
        return apiResponse(reply, 200, { customField: field }, 'Custom field updated');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to update custom field');
      }
    },
  );

  // ─── PATCH /:id/toggle — Toggle active status (admin only)
  fastify.patch(
    '/:id/toggle',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { isActive } = request.body as { isActive: boolean };
        const userId = getUserId(request);
        const tenantDb = getTenantDb(request);
        const service = new CustomFieldService(tenantDb);
        const field = await service.toggleActive(id, isActive, userId);
        return apiResponse(
          reply,
          200,
          { customField: field },
          `Custom field ${isActive ? 'activated' : 'deactivated'}`,
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to toggle custom field');
      }
    },
  );

  // ─── DELETE /:id — Delete a custom field (admin only) ─────
  fastify.delete(
    '/:id',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new CustomFieldService(tenantDb);
        await service.delete(id);
        return apiResponse(reply, 200, null, 'Custom field deleted');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to delete custom field');
      }
    },
  );
}
