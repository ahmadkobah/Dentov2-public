/**
 * Tenant Settings Routes — Full CRUD
 *
 * Per V2_DATABASE.md §11.1 — Tenant-Konfiguration
 * Per DENTO_V2_MASTER_PLAN.md §10 #28 — Settings Page
 *
 * Replaces the mock settingsRoutes in branding.route.ts
 * 6 setting keys: clinic, appointment, billing, notifications, security, inventory
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Connection } from 'mongoose';
import { settingsKeyEnum, securitySettingsSchema } from '@dento/shared';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, requireAdmin } from '../../middleware/index.js';
import { SettingsService } from '../../services/settings.service.js';
import { socketEmitter } from '../../../plugins/socket.plugin.js';
import { getPlatformChannels } from '../../../platform/models/platform-channels.model.js';
import { User, Tenant } from '../../../platform/models/index.js';
import { getBranchModel } from '../../models/branch.model.js';

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function tenantSettingsRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const adminOnly = [authGuard, tenantDbMiddleware, requireAdmin];

  // ─── GET / — Get all settings (merged with defaults) ─────
  fastify.get('/', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantDb = getTenantDb(request);
      const service = new SettingsService(tenantDb);
      const settings = await service.getAll();
      return apiResponse(reply, 200, { settings });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return apiError(reply, 500, 'Failed to fetch settings');
    }
  });

  // ─── GET /:key — Get a single settings category ──────────
  fastify.get('/:key', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { key } = request.params as { key: string };

      // Validate key
      const parsed = settingsKeyEnum.safeParse(key);
      if (!parsed.success) {
        return apiError(
          reply,
          400,
          `Invalid settings key. Valid keys: ${settingsKeyEnum.options.join(', ')}`,
        );
      }

      const tenantDb = getTenantDb(request);
      const service = new SettingsService(tenantDb);
      const settings = await service.getByKey(parsed.data);

      // For clinic key, inject supportedLanguages from platform Tenant record
      if (parsed.data === 'clinic') {
        const tenant = (request as unknown as Record<string, unknown>).tenant as
          | { slug?: string }
          | undefined;
        if (tenant?.slug) {
          const tenantRecord = await Tenant.findOne({ slug: tenant.slug })
            .select('settings.supportedLanguages settings.defaultLanguage')
            .lean();
          if (tenantRecord) {
            const ts = (tenantRecord as Record<string, any>).settings;
            (settings as Record<string, unknown>).supportedLanguages = ts?.supportedLanguages ?? [
              'en',
            ];
          }
        }
      }

      // For billing key, inject platform-level subscription data from tenant record
      if (parsed.data === 'billing') {
        const tenant = (request as unknown as Record<string, unknown>).tenant as
          | { enabledModules?: string[]; id?: string; slug?: string }
          | undefined;
        if (tenant) {
          (settings as Record<string, unknown>).enabledModules = tenant.enabledModules ?? [];

          // Compute live usage stats
          const tenantRecord = await Tenant.findById(tenant.id)
            .select('maxUsers maxBranches storageUsedMB storageLimitMB storageTierId')
            .lean();

          // Resolve storage tier name
          let storageTierName: string | undefined;
          if (tenantRecord?.storageTierId) {
            const { StorageTier } = await import('../../../platform/models/storage-tier.model.js');
            const tier = await StorageTier.findById(tenantRecord.storageTierId)
              .select('name')
              .lean();
            storageTierName = tier?.name;
          }

          const [userCount, branchCount] = await Promise.all([
            User.countDocuments({ tenantSlug: tenant.slug, isActive: true }),
            getBranchModel(tenantDb).countDocuments({ isActive: true }),
          ]);

          (settings as Record<string, unknown>).maxUsers = tenantRecord?.maxUsers ?? 10;
          (settings as Record<string, unknown>).maxBranches = tenantRecord?.maxBranches ?? 1;
          (settings as Record<string, unknown>).maxStorageGB = Math.round(
            (tenantRecord?.storageLimitMB ?? 102400) / 1024,
          );
          (settings as Record<string, unknown>).usage = {
            users: { current: userCount, max: tenantRecord?.maxUsers ?? 10 },
            branches: { current: branchCount, max: tenantRecord?.maxBranches ?? 1 },
            storage: {
              currentMB: tenantRecord?.storageUsedMB ?? 0,
              maxMB: tenantRecord?.storageLimitMB ?? 102400,
              tierName: storageTierName,
            },
          };
        }
      }

      return apiResponse(reply, 200, { key: parsed.data, settings });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return apiError(reply, 500, 'Failed to fetch settings');
    }
  });

  // ─── PATCH /:key — Update a settings category (admin only)
  fastify.patch(
    '/:key',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { key } = request.params as { key: string };

        const parsed = settingsKeyEnum.safeParse(key);
        if (!parsed.success) {
          return apiError(
            reply,
            400,
            `Invalid settings key. Valid keys: ${settingsKeyEnum.options.join(', ')}`,
          );
        }

        const userId = getUserId(request);
        const body = request.body as Record<string, unknown>;

        // Validate security settings body against schema
        if (parsed.data === 'security') {
          const result = securitySettingsSchema.partial().safeParse(body);
          if (!result.success) {
            return apiError(
              reply,
              400,
              `Invalid security settings: ${result.error.issues.map((i) => i.message).join(', ')}`,
            );
          }
        }

        const tenantDb = getTenantDb(request);
        const service = new SettingsService(tenantDb);
        const updated = await service.update(parsed.data, body, userId);

        // Emit locale:changed when clinic locale is updated
        if (parsed.data === 'clinic' && body.locale && typeof body.locale === 'string') {
          const tenantSlug = (request as unknown as Record<string, unknown>).tenantSlug as
            | string
            | undefined;
          if (tenantSlug) {
            try {
              socketEmitter.toRoom(`tenant:${tenantSlug}:chairs`, 'locale:changed', {
                locale: body.locale,
                tenantId: tenantSlug,
              });
            } catch {
              /* socket not initialized — non-fatal */
            }
          }
        }

        return apiResponse(reply, 200, { key: parsed.data, settings: updated }, 'Settings updated');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to update settings');
      }
    },
  );

  // ─── POST /:key/reset — Reset to defaults (admin only) ───
  fastify.post(
    '/:key/reset',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { key } = request.params as { key: string };

        const parsed = settingsKeyEnum.safeParse(key);
        if (!parsed.success) {
          return apiError(
            reply,
            400,
            `Invalid settings key. Valid keys: ${settingsKeyEnum.options.join(', ')}`,
          );
        }

        const userId = getUserId(request);
        const tenantDb = getTenantDb(request);
        const service = new SettingsService(tenantDb);
        const defaults = await service.reset(parsed.data, userId);

        return apiResponse(
          reply,
          200,
          { key: parsed.data, settings: defaults },
          'Settings reset to defaults',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to reset settings');
      }
    },
  );

  // ─── POST /seed — Seed all defaults (admin only, for new tenants)
  fastify.post(
    '/seed',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantDb = getTenantDb(request);
        const service = new SettingsService(tenantDb);
        await service.seedDefaults();
        return apiResponse(reply, 200, null, 'Settings seeded with defaults');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to seed settings');
      }
    },
  );

  // ─── GET /channels — Read-only platform channel status ────
  // Returns enabled/provider info for email, sms, whatsapp, push
  // from the platform DB so admin can see channel status.
  fastify.get(
    '/channels',
    { preHandler },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const doc = await getPlatformChannels();
        const channels = {
          email: { enabled: doc.email?.enabled ?? false, provider: doc.email?.provider ?? null },
          sms: { enabled: doc.sms?.enabled ?? false, provider: doc.sms?.provider ?? null },
          whatsapp: {
            enabled: doc.whatsapp?.enabled ?? false,
            provider: doc.whatsapp?.provider ?? null,
          },
          push: { enabled: doc.push?.enabled ?? false, provider: doc.push?.provider ?? null },
        };
        return apiResponse(reply, 200, { channels });
      } catch {
        return apiError(reply, 500, 'Failed to fetch channel status');
      }
    },
  );
}
