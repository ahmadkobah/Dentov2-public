import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { createCountryConfigSchema, updateCountryConfigSchema } from '@dento/shared';
import { CountryConfig } from '../../models/country-config.model.js';

/**
 * Country Config Routes — Platform CRUD for country configurations
 *
 * Endpoints:
 *   GET    /                — List all country configs
 *   POST   /                — Create country config
 *   PATCH  /:code           — Update country config
 *   DELETE /:code           — Deactivate country config
 */

export async function countryConfigRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET / — List all country configs ───────────────────

  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const countries = await CountryConfig.find().sort({ name: 1 }).lean();
        return apiResponse(reply, 200, countries);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch country configs';
        return apiError(reply, 500, message);
      }
    },
  );

  // ── POST / — Create country config ────────────────────

  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'manage')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let parsed;
      try {
        parsed = createCountryConfigSchema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      try {
        const existing = await CountryConfig.findOne({ code: parsed.code });
        if (existing) {
          return apiError(reply, 409, `Country with code "${parsed.code}" already exists`);
        }

        const country = await CountryConfig.create(parsed);
        return apiResponse(reply, 201, country.toObject(), 'Country config created');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create country config';
        return apiError(reply, 500, message);
      }
    },
  );

  // ── PATCH /:code — Update country config ──────────────

  fastify.patch(
    '/:code',
    { preHandler: [authGuard, platformGuard('platform_settings', 'manage')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.params as { code: string };

      let parsed;
      try {
        parsed = updateCountryConfigSchema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      try {
        const country = await CountryConfig.findOne({ code: code.toUpperCase() });
        if (!country) {
          return apiError(reply, 404, 'Country config not found');
        }

        const updated = await CountryConfig.findOneAndUpdate(
          { code: code.toUpperCase() },
          { $set: parsed },
          { new: true },
        ).lean();

        return apiResponse(reply, 200, updated, 'Country config updated');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update country config';
        return apiError(reply, 500, message);
      }
    },
  );

  // ── DELETE /:code — Deactivate country config ─────────

  fastify.delete(
    '/:code',
    { preHandler: [authGuard, platformGuard('platform_settings', 'manage')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.params as { code: string };

      try {
        const country = await CountryConfig.findOne({ code: code.toUpperCase() });
        if (!country) {
          return apiError(reply, 404, 'Country config not found');
        }

        await CountryConfig.findOneAndUpdate(
          { code: code.toUpperCase() },
          { $set: { isActive: false } },
        );

        return apiResponse(reply, 200, null, 'Country config deactivated');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to deactivate country config';
        return apiError(reply, 500, message);
      }
    },
  );
}
