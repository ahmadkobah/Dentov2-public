import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { storageTenantsQuerySchema } from '@dento/shared';
import { getStorageStats, getTenantStorageList } from '../../services/storage.service.js';

/**
 * Platform Storage Routes — Phase 7, Feature 4
 *
 * Read-only dashboard — no create/update/delete endpoints.
 * Data sources: tenants.storageUsedMB / storageLimitMB + S3 bucket checks.
 *
 * RBAC: platformGuard('platform_settings', 'read')
 *
 * Endpoints:
 *   GET /api/platform/storage/stats   — Platform-wide storage overview + S3 status
 *   GET /api/platform/storage/tenants — Per-tenant storage breakdown (paginated)
 */

// ── Route Registration ──────────────────────────────────────

export async function storageRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /stats — Storage overview ─────────────────────────

  fastify.get(
    '/stats',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await getStorageStats();
        return apiResponse(reply, 200, stats);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch storage stats';
        return apiError(reply, 500, message);
      }
    },
  );

  // ── GET /tenants — Per-tenant storage breakdown ───────────

  fastify.get(
    '/tenants',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = storageTenantsQuerySchema.parse(request.query);
        const result = await getTenantStorageList(query);
        return apiResponse(reply, 200, result.tenants, undefined, result.meta);
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          return apiError(reply, 400, 'Invalid query parameters');
        }
        const message =
          error instanceof Error ? error.message : 'Failed to fetch tenant storage list';
        return apiError(reply, 500, message);
      }
    },
  );
}
