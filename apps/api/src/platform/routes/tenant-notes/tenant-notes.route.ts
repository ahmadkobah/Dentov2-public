/**
 * Platform Tenant Notes Routes — Developer Portal
 *
 * Bi-directional activity notes between platform admins and tenants.
 * Platform admins can post notes visible to the tenant, and see
 * notes posted by the tenant back.
 *
 *   GET  /api/platform/tenant-notes/:tenantSlug  — List notes for a tenant
 *   POST /api/platform/tenant-notes/:tenantSlug  — Create a platform note
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { TenantNote, Tenant } from '../../models/index.js';

// ── Schemas ─────────────────────────────────────────────────

const noteQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const createNoteSchema = z.object({
  content: z.string().min(1).max(2000),
});

// ── Route Registration ──────────────────────────────────────

export async function platformTenantNoteRoutes(fastify: FastifyInstance) {
  // ── GET /:tenantSlug — List notes ─────────────────────────
  fastify.get(
    '/:tenantSlug',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };
      const { page, limit } = noteQuerySchema.parse(request.query);
      const skip = (page - 1) * limit;

      const [notes, total] = await Promise.all([
        TenantNote.find({ tenantSlug }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        TenantNote.countDocuments({ tenantSlug }),
      ]);

      return apiResponse(reply, 200, notes, undefined, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    },
  );

  // ── POST /:tenantSlug — Create a platform note ────────────
  fastify.post(
    '/:tenantSlug',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };

      // Verify tenant exists
      const tenant = await Tenant.findOne({ slug: tenantSlug }).select('_id').lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      const { content } = createNoteSchema.parse(request.body);
      const user = request.user!;

      const note = await TenantNote.create({
        tenantId: tenant._id,
        tenantSlug,
        authorId: user.userId,
        authorName: user.email ?? 'Platform Admin',
        source: 'platform',
        content,
      });

      return apiResponse(reply, 201, note.toObject());
    },
  );
}
