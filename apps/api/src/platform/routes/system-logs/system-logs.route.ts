import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { querySystemLogs, getSystemLogStats } from '../../services/system-log.service.js';

/**
 * Platform System Log Routes — Phase 6 (Gap A3)
 *
 * Per MASTER_PLAN §7 — Observability
 * RBAC Module: platform_settings
 *
 * Server log viewer — queries the error_logs collection
 * with level/service/date focus (system perspective).
 *
 *   - GET /api/platform/system-logs       — List with filters
 *   - GET /api/platform/system-logs/stats — Volume stats per level
 */

// ── Schemas ─────────────────────────────────────────────────

const statsQuerySchema = z
  .object({
    hours: z.coerce.number().int().positive().max(720).default(24),
  })
  .strict();

const systemLogQuerySchema = z
  .object({
    level: z.enum(['error', 'fatal', 'warn']).optional(),
    source: z.enum(['api', 'admin', 'developer', 'mobile', 'worker']).optional(),
    tenantSlug: z.string().optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

// ── Route Registration ──────────────────────────────────────

export async function systemLogRoutes(fastify: FastifyInstance) {
  // ── GET /api/platform/system-logs ─────────────────────────
  fastify.get(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const filter = systemLogQuerySchema.parse(request.query);

        const result = await querySystemLogs({
          level: filter.level,
          source: filter.source,
          tenantSlug: filter.tenantSlug,
          search: filter.search,
          startDate: filter.startDate ? new Date(filter.startDate) : undefined,
          endDate: filter.endDate ? new Date(filter.endDate) : undefined,
          page: filter.page,
          limit: filter.limit,
        });

        return apiResponse(reply, 200, result.data, undefined, result.meta);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to query system logs');
      }
    },
  );

  // ── GET /api/platform/system-logs/stats ───────────────────
  fastify.get(
    '/stats',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { hours } = statsQuerySchema.parse(request.query);
        const stats = await getSystemLogStats(hours);
        return apiResponse(reply, 200, stats);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to fetch system log stats');
      }
    },
  );
}
