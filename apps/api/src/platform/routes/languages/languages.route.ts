/**
 * Language Routes â€” Platform Language Registry
 *
 * CRUD for the platform-level language registry.
 * Used by the developer portal to manage available languages.
 *
 * GET    /                â€” List all languages
 * POST   /                â€” Create a new language
 * PATCH  /:id             â€” Update a language
 * DELETE /:id             â€” Deactivate a language
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Language } from '../../models/index.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';

// â”€â”€ Validation Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createLanguageSchema = z
  .object({
    code: z
      .string()
      .min(2)
      .max(5)
      .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Must be a valid language code (e.g. en, ar, fr)'),
    name: z.object({
      en: z.string().min(1).max(100),
      ar: z.string().max(100).optional(),
    }),
    direction: z.enum(['ltr', 'rtl']).default('ltr'),
    isActive: z.boolean().default(true),
    isDefault: z.boolean().default(false),
  })
  .strict();

const updateLanguageSchema = z
  .object({
    name: z
      .object({
        en: z.string().min(1).max(100),
        ar: z.string().max(100).optional(),
      })
      .optional(),
    direction: z.enum(['ltr', 'rtl']).optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

// â”€â”€ Route Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function languageRoutes(fastify: FastifyInstance) {
  /**
   * GET / â€” List all languages
   */
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const languages = await Language.find().sort({ isDefault: -1, code: 1 }).lean();
      return apiResponse(reply, 200, languages);
    },
  );

  /**
   * POST / â€” Create a new language
   */
  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = createLanguageSchema.parse(request.body);

      // Check duplicate code
      const existing = await Language.findOne({ code: data.code });
      if (existing) {
        return apiError(reply, 409, `Language with code "${data.code}" already exists`);
      }

      // If setting as default, unset any existing default
      if (data.isDefault) {
        await Language.updateMany({ isDefault: true }, { $set: { isDefault: false } });
      }

      const language = await Language.create(data);
      return apiResponse(reply, 201, language, 'Language created');
    },
  );

  /**
   * PATCH /:id â€” Update a language
   */
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request, reply) => {
      const { id } = request.params;
      const data = updateLanguageSchema.parse(request.body);

      const language = await Language.findById(id);
      if (!language) {
        return apiError(reply, 404, 'Language not found');
      }

      // If setting as default, unset any existing default
      if (data.isDefault) {
        await Language.updateMany(
          { _id: { $ne: id }, isDefault: true },
          { $set: { isDefault: false } },
        );
      }

      // Prevent deactivating the default language
      if (data.isActive === false && language.isDefault) {
        return apiError(reply, 400, 'Cannot deactivate the default language');
      }

      Object.assign(language, data);
      await language.save();

      return apiResponse(reply, 200, language, 'Language updated');
    },
  );

  /**
   * DELETE /:id â€” Deactivate a language (soft delete)
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request, reply) => {
      const { id } = request.params;

      const language = await Language.findById(id);
      if (!language) {
        return apiError(reply, 404, 'Language not found');
      }

      if (language.isDefault) {
        return apiError(reply, 400, 'Cannot delete the default language');
      }

      language.isActive = false;
      await language.save();

      return apiResponse(reply, 200, language, 'Language deactivated');
    },
  );
}
