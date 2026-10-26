/**
 * Feature Flags Routes â€” Phase 7
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 3.5
 * Per V2_DATABASE Â§4.8, V2_DECISION_LOG Â§16.3
 *
 * RBAC Module: platform_settings
 *   - platform_owner: Full CRUD (*)
 *   - platform_admin: Read only
 *   - platform_viewer: No access
 *
 * Endpoints:
 *   GET    /api/platform/feature-flags          â€” List (paginated, filtered)
 *   GET    /api/platform/feature-flags/:id      â€” Get by ID
 *   POST   /api/platform/feature-flags          â€” Create
 *   PATCH  /api/platform/feature-flags/:id      â€” Update
 *   PATCH  /api/platform/feature-flags/:id/toggle â€” Toggle enabled
 *   DELETE /api/platform/feature-flags/:id      â€” Delete
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import {
  createFeatureFlagSchema,
  updateFeatureFlagSchema,
  toggleFeatureFlagSchema,
  featureFlagQuerySchema,
} from '@dento/shared';
import {
  listFeatureFlags,
  getFeatureFlagById,
  createFeatureFlag,
  updateFeatureFlag,
  toggleFeatureFlag,
  deleteFeatureFlag,
} from '../../services/feature-flags.service.js';

// â”€â”€ Route Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function featureFlagRoutes(fastify: FastifyInstance) {
  // â”€â”€ GET / â€” List feature flags (paginated) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = featureFlagQuerySchema.parse(request.query);
        const result = await listFeatureFlags(query);
        return apiResponse(reply, 200, result.items, undefined, result.meta);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list feature flags');
      }
    },
  );

  // â”€â”€ GET /:id â€” Get single flag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request, reply) => {
      try {
        const flag = await getFeatureFlagById(request.params.id);
        if (!flag) {
          return apiError(reply, 404, 'Feature flag not found');
        }
        return apiResponse(reply, 200, flag);
      } catch {
        return apiError(reply, 500, 'Failed to fetch feature flag');
      }
    },
  );

  // â”€â”€ POST / â€” Create feature flag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'create')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createFeatureFlagSchema.parse(request.body);
        const flag = await createFeatureFlag(body);
        return apiResponse(reply, 201, flag, 'Feature flag created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        // Duplicate key
        if (
          err instanceof Error &&
          'code' in err &&
          (err as Record<string, unknown>).code === 11000
        ) {
          return apiError(
            reply,
            409,
            'Feature flag with this key already exists for the given scope',
          );
        }
        return apiError(reply, 500, 'Failed to create feature flag');
      }
    },
  );

  // â”€â”€ PATCH /:id â€” Update feature flag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'update')],
    },
    async (request, reply) => {
      try {
        const body = updateFeatureFlagSchema.parse(request.body);
        if (Object.keys(body).length === 0) {
          return apiError(reply, 400, 'No fields to update');
        }
        const flag = await updateFeatureFlag(request.params.id, body);
        if (!flag) {
          return apiError(reply, 404, 'Feature flag not found');
        }
        return apiResponse(reply, 200, flag, 'Feature flag updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update feature flag');
      }
    },
  );

  // â”€â”€ PATCH /:id/toggle â€” Toggle enabled â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: { id: string } }>(
    '/:id/toggle',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'update')],
    },
    async (request, reply) => {
      try {
        const body = toggleFeatureFlagSchema.parse(request.body);
        const flag = await toggleFeatureFlag(request.params.id, body.enabled);
        if (!flag) {
          return apiError(reply, 404, 'Feature flag not found');
        }
        return apiResponse(reply, 200, flag, 'Feature flag toggled');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to toggle feature flag');
      }
    },
  );

  // â”€â”€ DELETE /:id â€” Delete feature flag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'delete')],
    },
    async (request, reply) => {
      try {
        const flag = await deleteFeatureFlag(request.params.id);
        if (!flag) {
          return apiError(reply, 404, 'Feature flag not found');
        }
        return apiResponse(reply, 200, flag, 'Feature flag deleted');
      } catch {
        return apiError(reply, 500, 'Failed to delete feature flag');
      }
    },
  );
}
