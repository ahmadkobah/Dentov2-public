/**
 * Translation Management Routes — Platform
 *
 * CRUD for translation packs (platform-level).
 * Used by the developer portal to manage UI strings.
 *
 * GET    /                         — List all packs (optionally filter by locale/namespace)
 * GET    /:id                      — Get a single pack
 * POST   /                         — Create a new pack
 * PATCH  /:id                      — Update translations in a pack (merge)
 * PUT    /:id                      — Replace all translations in a pack
 * DELETE /:id                      — Delete a pack
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { TranslationPack } from '../../models/index.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';

// ── Validation Schemas ──────────────────────────────────────

const createPackSchema = z
  .object({
    locale: z.enum(['en', 'ar']),
    namespace: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z][a-z0-9_]*$/, 'Lowercase alphanumeric with underscores'),
    translations: z.record(z.string(), z.string()),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .strict();

const updatePackSchema = z
  .object({
    translations: z.record(z.string(), z.string()).optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

// ── Route Registration ──────────────────────────────────────

export async function translationManagementRoutes(fastify: FastifyInstance) {
  // ── LIST ────────────────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { locale, namespace } = request.query as { locale?: string; namespace?: string };

      const filter: Record<string, unknown> = {};
      if (locale) filter.locale = locale;
      if (namespace) filter.namespace = namespace;

      const packs = await TranslationPack.find(filter).sort({ locale: 1, namespace: 1 }).lean();

      return apiResponse(reply, 200, packs);
    },
  );

  // ── GET ONE ─────────────────────────────────────────────
  fastify.get(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const pack = await TranslationPack.findById(id).lean();
      if (!pack) return apiError(reply, 404, 'Translation pack not found');
      return apiResponse(reply, 200, pack);
    },
  );

  // ── CREATE ──────────────────────────────────────────────
  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createPackSchema.safeParse(request.body);
      if (!parsed.success) {
        return apiError(reply, 400, 'Validation error', parsed.error.flatten().fieldErrors);
      }

      const existing = await TranslationPack.findOne({
        locale: parsed.data.locale,
        namespace: parsed.data.namespace,
      });
      if (existing) {
        return apiError(
          reply,
          409,
          `Pack "${parsed.data.namespace}" for locale "${parsed.data.locale}" already exists`,
        );
      }

      const userId = (request as any).userId ?? null;
      const pack = await TranslationPack.create({
        ...parsed.data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
      });

      return apiResponse(reply, 201, pack.toObject());
    },
  );

  // ── PATCH (merge translations) ──────────────────────────
  fastify.patch(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const parsed = updatePackSchema.safeParse(request.body);
      if (!parsed.success) {
        return apiError(reply, 400, 'Validation error', parsed.error.flatten().fieldErrors);
      }

      const pack = await TranslationPack.findById(id);
      if (!pack) return apiError(reply, 404, 'Translation pack not found');

      const userId = (request as any).userId ?? null;

      if (parsed.data.translations) {
        // Merge new translations with existing
        pack.translations = { ...pack.translations, ...parsed.data.translations };
        pack.markModified('translations');
      }
      if (parsed.data.isActive !== undefined) pack.isActive = parsed.data.isActive;
      if (parsed.data.isDefault !== undefined) pack.isDefault = parsed.data.isDefault;

      pack.version += 1;
      pack.updatedBy = userId;
      await pack.save();

      return apiResponse(reply, 200, pack.toObject());
    },
  );

  // ── PUT (replace all translations) ──────────────────────
  fastify.put(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const parsed = updatePackSchema.safeParse(request.body);
      if (!parsed.success) {
        return apiError(reply, 400, 'Validation error', parsed.error.flatten().fieldErrors);
      }

      const pack = await TranslationPack.findById(id);
      if (!pack) return apiError(reply, 404, 'Translation pack not found');

      const userId = (request as any).userId ?? null;

      if (parsed.data.translations) {
        pack.translations = parsed.data.translations;
        pack.markModified('translations');
      }
      if (parsed.data.isActive !== undefined) pack.isActive = parsed.data.isActive;
      if (parsed.data.isDefault !== undefined) pack.isDefault = parsed.data.isDefault;

      pack.version += 1;
      pack.updatedBy = userId;
      await pack.save();

      return apiResponse(reply, 200, pack.toObject());
    },
  );

  // ── DELETE ──────────────────────────────────────────────
  fastify.delete(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const pack = await TranslationPack.findById(id);
      if (!pack) return apiError(reply, 404, 'Translation pack not found');

      if (pack.isDefault) {
        return apiError(reply, 400, 'Cannot delete a default translation pack');
      }

      await pack.deleteOne();
      return apiResponse(reply, 200, { deleted: true });
    },
  );
}
