/**
 * Audit Log Routes — Query Interface
 *
 * Per V2_DATABASE.md §4.10 — audit_logs
 * Per SECURITY_AND_ENCRYPTION.md §10.1 — Audit Logging
 * Per BUILD_RULES §15.4 — Every data mutation MUST be logged
 *
 * Read-only endpoints. Audit entries are created by audit-logger middleware.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Connection } from 'mongoose';
import { auditLogQuerySchema } from '@dento/shared';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, requireAdmin } from '../../middleware/index.js';
import { AuditLogService } from '../../services/audit-log.service.js';

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getTenantSlug(request: unknown): string {
  return (request as unknown as Record<string, unknown>).tenantSlug as string;
}

// ── Route Registration ──────────────────────────────────────

export async function auditLogRoutes(fastify: FastifyInstance) {
  // Only admins can view audit logs
  const preHandler = [authGuard, tenantDbMiddleware, requireAdmin];

  // ─── GET / — List audit logs (paginated, filterable) ──────
  fastify.get('/', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = auditLogQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const tenantSlug = getTenantSlug(request);
      const service = new AuditLogService(tenantDb);

      const result = await service.query(query, tenantSlug);
      return apiResponse(reply, 200, result.data, undefined, {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.pages,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return apiError(reply, 500, 'Failed to fetch audit logs');
    }
  });

  // ─── GET /stats — Audit log statistics ────────────────────
  fastify.get('/stats', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantDb = getTenantDb(request);
      const tenantSlug = getTenantSlug(request);
      const service = new AuditLogService(tenantDb);

      const stats = await service.getStats(tenantSlug);
      return apiResponse(reply, 200, { stats });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return apiError(reply, 500, 'Failed to fetch audit stats');
    }
  });

  // ─── GET /:id — Single audit log entry ────────────────────
  fastify.get('/:id', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new AuditLogService(tenantDb);

      const entry = await service.getById(id);
      if (!entry) return apiError(reply, 404, 'Audit log entry not found');

      return apiResponse(reply, 200, { auditLog: entry });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return apiError(reply, 500, 'Failed to fetch audit log entry');
    }
  });
}
