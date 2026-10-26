import type { FastifyInstance } from 'fastify';
import { TranslationPack, CountryConfig } from '../../../platform/models/index.js';
import { apiResponse, ApiError } from '../../../utils/api-response.js';

/**
 * Translation Routes — Platform-level i18n
 *
 * Per MASTER_PLAN §26 - i18n System
 * Provides translations and country configs for frontend.
 */

export async function translationRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/translations/:locale
   *
   * Get all translation packs for a specific locale.
   */
  fastify.get(
    '/translations/:locale',
    {
      schema: {
        tags: ['i18n'],
        summary: 'Get translations for a locale',
        params: {
          type: 'object',
          required: ['locale'],
          properties: {
            locale: { type: 'string', enum: ['en', 'ar'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { locale } = request.params as { locale: 'en' | 'ar' };

      const packs = await TranslationPack.find({ locale }).lean();

      return apiResponse(reply, 200, {
        locale,
        packs: packs.map((p) => ({
          namespace: p.namespace,
          translations: p.translations,
          version: p.version,
        })),
      });
    },
  );

  /**
   * GET /api/translations/:locale/:namespace
   *
   * Get a specific translation pack.
   */
  fastify.get(
    '/translations/:locale/:namespace',
    {
      schema: {
        tags: ['i18n'],
        summary: 'Get translations for a specific namespace',
        params: {
          type: 'object',
          required: ['locale', 'namespace'],
          properties: {
            locale: { type: 'string', enum: ['en', 'ar'] },
            namespace: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { locale, namespace } = request.params as { locale: 'en' | 'ar'; namespace: string };

      const pack = await TranslationPack.findOne({ locale, namespace }).lean();

      if (!pack) {
        throw new ApiError(
          404,
          'TRANSLATION_NOT_FOUND',
          `Translation pack not found: ${locale}/${namespace}`,
        );
      }

      return apiResponse(reply, 200, {
        locale,
        namespace,
        translations: pack.translations,
        version: pack.version,
      });
    },
  );

  /**
   * GET /api/countries
   *
   * Get all active country configurations.
   */
  fastify.get(
    '/countries',
    {
      schema: {
        tags: ['i18n'],
        summary: 'Get all active countries',
      },
    },
    async (_request, reply) => {
      const countries = await CountryConfig.find({ isActive: true })
        .select('-createdAt -updatedAt -__v')
        .sort('name')
        .lean();

      return apiResponse(reply, 200, { countries });
    },
  );

  /**
   * GET /api/countries/:code
   *
   * Get a specific country configuration.
   */
  fastify.get(
    '/countries/:code',
    {
      schema: {
        tags: ['i18n'],
        summary: 'Get country configuration by code',
        params: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 2, maxLength: 2 },
          },
        },
      },
    },
    async (request, reply) => {
      const { code } = request.params as { code: string };

      const country = await CountryConfig.findOne({
        code: code.toUpperCase(),
        isActive: true,
      }).lean();

      if (!country) {
        throw new ApiError(404, 'COUNTRY_NOT_FOUND', `Country not found: ${code}`);
      }

      return apiResponse(reply, 200, { country });
    },
  );
}
