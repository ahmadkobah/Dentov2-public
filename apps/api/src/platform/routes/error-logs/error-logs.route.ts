import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import {
  logError,
  queryErrorLogs,
  getErrorById,
  getErrorByFingerprint,
  resolveError,
  unresolveError,
  getErrorStats,
} from '../../services/error-log.service.js';

/**
 * Error Log Routes â€” Phase 6 (Task 1.7 â€” Gap G1)
 *
 * Per V2_DATABASE Â§4.11, MASTER_PLAN Â§7
 * RBAC Module: platform_settings (per Phase 6 Â§5.7)
 *
 * Endpoints:
 *   - GET    /api/platform/error-logs          â€” List error logs (paginated + filtered)
 *   - GET    /api/platform/error-logs/stats     â€” Error aggregation stats
 *   - GET    /api/platform/error-logs/:id       â€” Get single error log
 *   - PATCH  /api/platform/error-logs/:id/resolve   â€” Resolve error
 *   - PATCH  /api/platform/error-logs/:id/unresolve â€” Unresolve error
 *   - POST   /api/platform/error-logs           â€” Ingest an error log (from frontend SDKs)
 */

// â”€â”€ Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const querySchema = z
  .object({
    source: z.enum(['api', 'admin', 'developer', 'mobile', 'worker']).optional(),
    level: z.enum(['error', 'fatal', 'warn']).optional(),
    tenantSlug: z.string().optional(),
    resolved: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    search: z.string().max(200).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

const statsQuerySchema = z
  .object({
    hours: z.coerce.number().int().positive().max(720).default(24),
  })
  .strict();

const ingestSchema = z
  .object({
    level: z.enum(['error', 'fatal', 'warn']),
    message: z.string().min(1).max(5000),
    stack: z.string().max(20000).nullable().optional(),
    source: z.enum(['api', 'admin', 'developer', 'mobile', 'worker']),
    endpoint: z.string().max(500).nullable().optional(),
    method: z.string().max(10).nullable().optional(),
    statusCode: z.number().int().nullable().optional(),
    tenantSlug: z.string().nullable().optional(),
    requestId: z.string().nullable().optional(),
    userAgent: z.string().max(500).nullable().optional(),
    ip: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict();

// â”€â”€ Route Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function errorLogRoutes(fastify: FastifyInstance) {
  // â”€â”€ GET /api/platform/error-logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const filter = querySchema.parse(request.query);
      const result = await queryErrorLogs(filter);
      return apiResponse(reply, 200, result.data, undefined, result.meta);
    },
  );

  // â”€â”€ GET /api/platform/error-logs/stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get(
    '/stats',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { hours } = statsQuerySchema.parse(request.query);
      const stats = await getErrorStats(hours);
      return apiResponse(reply, 200, stats);
    },
  );

  // â”€â”€ GET /api/platform/error-logs/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params;
      const errorLog = await getErrorById(id);
      if (!errorLog) return apiError(reply, 404, 'Error log not found');
      return apiResponse(reply, 200, errorLog);
    },
  );

  // â”€â”€ GET /api/platform/error-logs/fingerprint/:fingerprint â”€
  fastify.get<{ Params: { fingerprint: string } }>(
    '/fingerprint/:fingerprint',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request, reply) => {
      const errorLog = await getErrorByFingerprint(request.params.fingerprint);
      if (!errorLog) return apiError(reply, 404, 'Error log not found');
      return apiResponse(reply, 200, errorLog);
    },
  );

  // â”€â”€ PATCH /api/platform/error-logs/:id/resolve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: { id: string } }>(
    '/:id/resolve',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'update')],
    },
    async (request, reply) => {
      const errorLog = await resolveError(request.params.id, request.user!.userId);
      if (!errorLog) return apiError(reply, 404, 'Error log not found');
      return apiResponse(reply, 200, errorLog, 'Error resolved');
    },
  );

  // â”€â”€ PATCH /api/platform/error-logs/:id/unresolve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: { id: string } }>(
    '/:id/unresolve',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'update')],
    },
    async (request, reply) => {
      const errorLog = await unresolveError(request.params.id);
      if (!errorLog) return apiError(reply, 404, 'Error log not found');
      return apiResponse(reply, 200, errorLog, 'Error unresolved');
    },
  );

  // â”€â”€ POST /api/platform/error-logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Ingest endpoint (from frontend error SDKs or API error handler)
  fastify.post(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'create')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = ingestSchema.parse(request.body);
      const errorLog = await logError(data);
      return apiResponse(reply, 201, errorLog, 'Error logged');
    },
  );
}
