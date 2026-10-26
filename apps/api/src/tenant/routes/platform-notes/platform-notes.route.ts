/**
 * Tenant-side Platform Notes Route
 *
 * Allows tenants to see notes from the platform admin and
 * post notes back. Scoped to the authenticated tenant.
 *
 *   GET  /api/platform-notes  — List notes for the current tenant
 *   POST /api/platform-notes  — Create a note from the tenant side
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../middleware/index.js';
import { TenantNote, Tenant } from '../../../platform/models/index.js';

// ── Schemas ─────────────────────────────────────────────────

const noteQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const createNoteSchema = z.object({
  content: z.string().min(1).max(2000),
});

// ── Route Registration ──────────────────────────────────────

export async function tenantPlatformNoteRoutes(fastify: FastifyInstance) {
  // ── GET / — List notes for this tenant ─────────────────────
  fastify.get(
    '/',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantSlug = request.tenantSlug!;
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

  // ── POST / — Create a tenant-side note ─────────────────────
  fastify.post(
    '/',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantSlug = request.tenantSlug!;
      const { content } = createNoteSchema.parse(request.body);
      const user = request.user!;

      // Look up tenant ObjectId from slug
      const tenant = await Tenant.findOne({ slug: tenantSlug }).select('_id').lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      const note = await TenantNote.create({
        tenantId: tenant._id,
        tenantSlug,
        authorId: user.userId,
        authorName: user.email ?? 'Tenant User',
        source: 'tenant',
        content,
      });

      return apiResponse(reply, 201, note.toObject());
    },
  );
}
