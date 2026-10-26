/**
 * Platform Documentation Routes — Dev Portal CRUD
 *
 * Endpoints:
 *   - GET    /api/platform/docs           — List all docs (platform admins)
 *   - GET    /api/platform/docs/:id       — Get single doc
 *   - POST   /api/platform/docs           — Create doc
 *   - PATCH  /api/platform/docs/:id       — Update doc
 *   - DELETE /api/platform/docs/:id       — Delete doc
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { PlatformDoc } from '../../models/platform-doc.model.js';
import { logger } from '../../../utils/logger.js';

// ── Validation Schemas ──────────────────────────────────────

const createDocSchema = z
  .object({
    title: z.string().min(1).max(500),
    slug: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
    content: z.string().min(1),
    category: z.string().min(1).max(100),
    order: z.number().int().min(0).default(0),
    isPublished: z.boolean().default(false),
  })
  .strict();

const updateDocSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    slug: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
      .optional(),
    content: z.string().min(1).optional(),
    category: z.string().min(1).max(100).optional(),
    order: z.number().int().min(0).optional(),
    isPublished: z.boolean().optional(),
  })
  .strict();

const listQuerySchema = z.object({
  category: z.string().optional(),
  isPublished: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ── Helpers ─────────────────────────────────────────────────

function getUser(request: unknown): Record<string, string> {
  return ((request as unknown as Record<string, unknown>).user ?? {}) as Record<string, string>;
}

// ── Route Plugin ────────────────────────────────────────────

export async function platformDocRoutes(fastify: FastifyInstance) {
  // ── LIST ──────────────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request, reply) => {
      try {
        const query = listQuerySchema.parse(request.query);
        const filter: Record<string, unknown> = {};
        if (query.category) filter.category = query.category;
        if (query.isPublished !== undefined) filter.isPublished = query.isPublished;

        const [docs, total] = await Promise.all([
          PlatformDoc.find(filter)
            .sort({ category: 1, order: 1, createdAt: -1 })
            .skip((query.page - 1) * query.limit)
            .limit(query.limit)
            .lean(),
          PlatformDoc.countDocuments(filter),
        ]);

        return apiResponse(reply, 200, docs, undefined, {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        });
      } catch (err) {
        logger.error(err, 'Failed to list platform docs');
        return apiError(reply, 500, 'Failed to list docs');
      }
    },
  );

  // ── GET ONE ───────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request, reply) => {
      try {
        const doc = await PlatformDoc.findById(request.params.id).lean();
        if (!doc) return apiError(reply, 404, 'Document not found');
        return apiResponse(reply, 200, doc);
      } catch (err) {
        logger.error(err, 'Failed to get platform doc');
        return apiError(reply, 500, 'Failed to get doc');
      }
    },
  );

  // ── CREATE ────────────────────────────────────────────
  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'create')] },
    async (request, reply) => {
      try {
        const body = createDocSchema.parse(request.body);
        const user = getUser(request);

        const existing = await PlatformDoc.findOne({ slug: body.slug });
        if (existing) return apiError(reply, 409, 'A doc with this slug already exists');

        const doc = await PlatformDoc.create({ ...body, createdBy: user.userId });
        return apiResponse(reply, 201, doc);
      } catch (err) {
        logger.error(err, 'Failed to create platform doc');
        return apiError(reply, 500, 'Failed to create doc');
      }
    },
  );

  // ── UPDATE ────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request, reply) => {
      try {
        const body = updateDocSchema.parse(request.body);
        const user = getUser(request);

        if (body.slug) {
          const existing = await PlatformDoc.findOne({
            slug: body.slug,
            _id: { $ne: request.params.id },
          });
          if (existing) return apiError(reply, 409, 'A doc with this slug already exists');
        }

        const doc = await PlatformDoc.findByIdAndUpdate(
          request.params.id,
          { ...body, updatedBy: user.userId },
          { new: true },
        ).lean();

        if (!doc) return apiError(reply, 404, 'Document not found');
        return apiResponse(reply, 200, doc);
      } catch (err) {
        logger.error(err, 'Failed to update platform doc');
        return apiError(reply, 500, 'Failed to update doc');
      }
    },
  );

  // ── DELETE ────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_settings', 'delete')] },
    async (request, reply) => {
      try {
        const doc = await PlatformDoc.findByIdAndDelete(request.params.id);
        if (!doc) return apiError(reply, 404, 'Document not found');
        return apiResponse(reply, 200, { message: 'Document deleted' });
      } catch (err) {
        logger.error(err, 'Failed to delete platform doc');
        return apiError(reply, 500, 'Failed to delete doc');
      }
    },
  );
}
