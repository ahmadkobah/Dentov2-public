import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { uploadToS3, getPresignedDownloadUrl } from '../../../config/s3.js';
import { env } from '../../../config/env.js';
import {
  updateSystemSettingsSchema,
  updateBrandingSchema,
  updateCurrenciesSchema,
} from '@dento/shared';
import {
  fetchSystemSettings,
  patchSystemSettings,
  fetchBranding,
  patchBranding,
  fetchCurrencies,
  patchCurrencies,
  fetchPlatformChannels,
  patchPlatformChannel,
} from '../../services/settings.service.js';
import {
  refreshExchangeRates,
  fetchAllAvailableRates,
} from '../../services/exchange-rate.service.js';

/**
 * Platform Settings Routes — Phase 7
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.5
 * Per V2_DATABASE §4.17 — system_settings, branding, currencies
 *
 * RBAC Module: platform_settings
 *   - platform_owner: Full CRUD (*)
 *   - platform_admin: Read only
 *   - platform_viewer: No access
 *
 * Endpoints:
 *   GET   /api/platform/settings/system     — Get system settings
 *   PATCH /api/platform/settings/system     — Update system settings
 *   GET   /api/platform/settings/branding   — Get branding
 *   PATCH /api/platform/settings/branding   — Update branding
 *   GET   /api/platform/settings/currencies — Get currencies
 *   PATCH /api/platform/settings/currencies — Update currencies
 *   GET   /api/platform/settings/all        — Get all three singletons
 */

// ── Route Registration ──────────────────────────────────────

export async function platformSettingsRoutes(fastify: FastifyInstance) {
  // ── GET /system — System settings ───────────────────────
  fastify.get(
    '/system',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const settings = await fetchSystemSettings();
        return apiResponse(reply, 200, settings);
      } catch {
        return apiError(reply, 500, 'Failed to fetch system settings');
      }
    },
  );

  // ── PATCH /system — Update system settings ────────────
  fastify.patch(
    '/system',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'update')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = updateSystemSettingsSchema.parse(request.body);
        if (Object.keys(body).length === 0) {
          return apiError(reply, 400, 'No fields to update');
        }
        const userId = request.user?.userId ?? 'unknown';
        const settings = await patchSystemSettings(body, userId);
        return apiResponse(reply, 200, settings, 'System settings updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update system settings');
      }
    },
  );

  // ── GET /branding — Branding ────────────────────────────
  fastify.get(
    '/branding',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const branding = await fetchBranding();
        return apiResponse(reply, 200, branding);
      } catch {
        return apiError(reply, 500, 'Failed to fetch branding');
      }
    },
  );

  // ── PATCH /branding — Update branding ──────────────────
  fastify.patch(
    '/branding',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'update')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = updateBrandingSchema.parse(request.body);
        if (Object.keys(body).length === 0) {
          return apiError(reply, 400, 'No fields to update');
        }
        const userId = request.user?.userId ?? 'unknown';
        const branding = await patchBranding(body, userId);
        return apiResponse(reply, 200, branding, 'Branding updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update branding');
      }
    },
  );

  // ── POST /branding/upload — Upload logo or favicon ─────
  fastify.post(
    '/branding/upload',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'update')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Early check: S3 must be configured
        if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY || !env.S3_BUCKET) {
          return apiError(
            reply,
            503,
            'File storage (S3/R2) is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, and S3_BUCKET environment variables.',
          );
        }

        const data = await request.file();
        if (!data) {
          return apiError(reply, 400, 'No file provided. Use multipart/form-data.');
        }

        const buffer = await data.toBuffer();
        const ALLOWED_MIMES = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/svg+xml',
          'image/x-icon',
          'image/vnd.microsoft.icon',
        ];
        const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

        if (!ALLOWED_MIMES.includes(data.mimetype)) {
          return apiError(
            reply,
            400,
            `Invalid file type: ${data.mimetype}. Allowed: JPEG, PNG, WebP, SVG, ICO`,
          );
        }
        if (buffer.length > MAX_SIZE) {
          return apiError(reply, 400, 'File too large. Max 5 MB.');
        }

        const ext = data.filename.includes('.')
          ? data.filename.slice(data.filename.lastIndexOf('.'))
          : '.png';
        const key = `platform/branding/${randomUUID()}${ext}`;

        await uploadToS3(key, buffer, data.mimetype);
        const url = await getPresignedDownloadUrl(key, 86400); // 24h URL

        return apiResponse(
          reply,
          201,
          { key, url, fileName: data.filename, mimeType: data.mimetype, fileSize: buffer.length },
          'Branding asset uploaded',
        );
      } catch (err) {
        request.log.error(err, 'Branding upload failed');
        const message = err instanceof Error ? err.message : 'Upload failed';
        return apiError(reply, 500, message);
      }
    },
  );

  // ── GET /currencies — Currencies ────────────────────────
  fastify.get(
    '/currencies',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currencies = await fetchCurrencies();
        return apiResponse(reply, 200, currencies);
      } catch {
        return apiError(reply, 500, 'Failed to fetch currencies');
      }
    },
  );

  // ── PATCH /currencies — Update currencies ──────────────
  fastify.patch(
    '/currencies',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'update')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = updateCurrenciesSchema.parse(request.body);
        if (Object.keys(body).length === 0) {
          return apiError(reply, 400, 'No fields to update');
        }
        const userId = request.user?.userId ?? 'unknown';
        const currencies = await patchCurrencies(body, userId);
        return apiResponse(reply, 200, currencies, 'Currencies updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update currencies');
      }
    },
  );

  // ── POST /currencies/refresh — Fetch live rates from API ─
  fastify.post(
    '/currencies/refresh',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'update')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await refreshExchangeRates();
        return apiResponse(reply, 200, result, 'Exchange rates refreshed');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to refresh exchange rates';
        return apiError(reply, 502, message);
      }
    },
  );

  // ── GET /currencies/available — All rates for a base currency ─
  fastify.get(
    '/currencies/available',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const querySchema = z.object({
          base: z.string().min(3).max(3).default('SAR'),
        });
        const { base } = querySchema.parse(request.query);
        const rates = await fetchAllAvailableRates(base);
        return apiResponse(reply, 200, { base, rates });
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        const message = err instanceof Error ? err.message : 'Failed to fetch available rates';
        return apiError(reply, 502, message);
      }
    },
  );

  // ── GET /channels — Platform channel configs (masked) ──
  fastify.get(
    '/channels',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const channels = await fetchPlatformChannels();
        return apiResponse(reply, 200, channels);
      } catch {
        return apiError(reply, 500, 'Failed to fetch platform channels');
      }
    },
  );

  // ── PATCH /channels/:channel — Update a platform channel ─
  fastify.patch(
    '/channels/:channel',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'update')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const paramSchema = z.object({
          channel: z.enum(['email', 'sms', 'whatsapp', 'push']),
        });
        const params = paramSchema.safeParse(request.params);
        if (!params.success) {
          return apiError(reply, 400, 'Invalid channel. Valid: email, sms, whatsapp, push');
        }

        const bodySchema = z
          .object({
            enabled: z.boolean(),
            provider: z.string().max(50).optional(),
          })
          .passthrough();

        const body = bodySchema.safeParse(request.body);
        if (!body.success) {
          return apiError(reply, 400, 'Validation failed', body.error.issues);
        }

        const userId = request.user?.userId ?? 'unknown';
        const channels = await patchPlatformChannel(params.data.channel, body.data, userId);
        return apiResponse(reply, 200, channels, 'Platform channel updated');
      } catch {
        return apiError(reply, 500, 'Failed to update platform channel');
      }
    },
  );

  // ── GET /all — All platform settings combined ──────────
  fastify.get(
    '/all',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const [systemSettings, branding, currencies] = await Promise.all([
          fetchSystemSettings(),
          fetchBranding(),
          fetchCurrencies(),
        ]);
        return apiResponse(reply, 200, { systemSettings, branding, currencies });
      } catch {
        return apiError(reply, 500, 'Failed to fetch platform settings');
      }
    },
  );
}
