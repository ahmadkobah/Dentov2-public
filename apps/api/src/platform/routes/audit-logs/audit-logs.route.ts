import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import type { AuditAction, AuditSensitivity } from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { AuditLogService } from '../../../tenant/services/audit-log.service.js';

/**
 * Platform Audit Log Routes — Phase 6 (Gap A2)
 *
 * Per V2_DATABASE §4.10, SECURITY §10.1
 * RBAC Module: platform_audit
 *
 * Platform-wide read-only audit log query (cross-tenant).
 * Uses the existing AuditLogService with the platform DB connection.
 *
 *   - GET /api/platform/audit-logs          — List with filters
 *   - GET /api/platform/audit-logs/stats    — Aggregated stats
 *   - GET /api/platform/audit-logs/:id      — Single entry detail
 *   - GET /api/platform/audit-logs/export   — CSV/JSON export
 */

// ── Schemas ─────────────────────────────────────────────────

const objectIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId'),
});

const auditLogQuerySchema = z
  .object({
    tenantSlug: z.string().optional(),
    actorId: z.string().optional(),
    actorEmail: z.string().optional(),
    action: z.string().optional(),
    resourceType: z.string().optional(),
    sensitivityLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['success', 'failure']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

// ── Route Registration ──────────────────────────────────────

export async function platformAuditLogRoutes(fastify: FastifyInstance) {
  // Platform DB connection — audit_logs are in the platform database
  const platformDb = mongoose.connection;
  const auditService = new AuditLogService(platformDb);

  // ── GET /api/platform/audit-logs ──────────────────────────
  fastify.get(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_audit', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const filter = auditLogQuerySchema.parse(request.query);

      const result = await auditService.query(
        {
          page: filter.page,
          limit: filter.limit,
          actorId: filter.actorId,
          resourceType: filter.resourceType,
          action: filter.action as AuditAction | undefined,
          sensitivityLevel: filter.sensitivityLevel as AuditSensitivity | undefined,
          status: filter.status,
          startDate: filter.startDate,
          endDate: filter.endDate,
          search: filter.search,
        },
        filter.tenantSlug, // Optional — cross-tenant when omitted
      );

      return apiResponse(reply, 200, result.data, undefined, {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.pages,
      });
    },
  );

  // ── GET /api/platform/audit-logs/stats ────────────────────
  fastify.get(
    '/stats',
    {
      preHandler: [authGuard, platformGuard('platform_audit', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Cross-tenant stats (no tenantSlug filter)
      const tenantSlug = (request.query as { tenantSlug?: string }).tenantSlug;
      const stats = await auditService.getStats(tenantSlug ?? '');

      return apiResponse(reply, 200, stats);
    },
  );

  // ── GET /api/platform/audit-logs/export ───────────────────
  fastify.get(
    '/export',
    {
      preHandler: [authGuard, platformGuard('platform_audit', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const filter = auditLogQuerySchema.parse(request.query);
      const format = (request.query as { format?: string }).format ?? 'json';

      // Fetch all records (up to 10,000 for export)
      const result = await auditService.query(
        {
          page: 1,
          limit: 10000,
          actorId: filter.actorId,
          resourceType: filter.resourceType,
          action: filter.action as AuditAction | undefined,
          sensitivityLevel: filter.sensitivityLevel as AuditSensitivity | undefined,
          status: filter.status,
          startDate: filter.startDate,
          endDate: filter.endDate,
          search: filter.search,
        },
        filter.tenantSlug,
      );

      if (format === 'csv') {
        const headers = [
          'id',
          'timestamp',
          'actor_email',
          'actor_role',
          'action',
          'resource_type',
          'resource_id',
          'description',
          'sensitivity',
          'status',
          'tenant',
          'ip_address',
        ];

        const rows = result.data.map((entry) =>
          [
            entry._id,
            entry.createdAt,
            entry.actorEmail,
            entry.actorRole,
            entry.action,
            entry.resourceType,
            entry.resourceId,
            `"${String(entry.description ?? '').replace(/"/g, '""')}"`,
            entry.sensitivityLevel,
            entry.status,
            entry.tenantSlug,
            entry.ipAddress,
          ].join(','),
        );

        const csv = [headers.join(','), ...rows].join('\n');

        reply.header('Content-Type', 'text/csv');
        reply.header(
          'Content-Disposition',
          `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        );
        return reply.send(csv);
      }

      // Default: JSON
      return apiResponse(reply, 200, {
        data: result.data,
        total: result.pagination.total,
        exported: result.data.length,
      });
    },
  );

  // ── GET /api/platform/audit-logs/:id ──────────────────────
  fastify.get(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_audit', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = objectIdParamSchema.parse(request.params);
      const entry = await auditService.getById(id);
      if (!entry) return apiError(reply, 404, 'Audit log entry not found');
      return apiResponse(reply, 200, entry);
    },
  );
}
