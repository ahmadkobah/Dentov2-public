/**
 * Module Management Routes — Platform API (Dev Portal)
 * Based on DENTO_V2_MASTER_PLAN.md §7 + DEV_PORTAL_SCREENS §5
 *
 * Provides aggregated module management views for the Dev Portal.
 * Raw CRUD is handled by versioning.route.ts at /api/modules.
 *
 * Endpoints:
 *   - GET  /api/platform/modules              — Aggregated module list (with tenant counts + pricing)
 *   - GET  /api/platform/modules/stats        — Summary stats (totals by status, type, top modules)
 *   - GET  /api/platform/modules/:slug        — Single module detail with full aggregation
 *   - DELETE /api/platform/modules/:slug      — Hard delete module (platform_admin only)
 */

import type { FastifyInstance } from 'fastify';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { Module } from '../../models/module.model.js';
import { Tenant } from '../../models/tenant.model.js';
import { TenantModule } from '../../models/tenant-module.model.js';
import { PricingConfig } from '../../models/pricing.model.js';
import { logger } from '../../../utils/logger.js';

// ── Auth Interface ──────────────────────────────────────────

// ── Helpers ─────────────────────────────────────────────────

async function getModulePricing(): Promise<
  Map<
    string,
    {
      basePrice: number;
      isFree: boolean;
      billingCycle: string;
      regionPrices: { countryCode: string; price: number; currency: string }[];
    }
  >
> {
  const config = await PricingConfig.findOne().lean();
  const priceMap = new Map<
    string,
    {
      basePrice: number;
      isFree: boolean;
      billingCycle: string;
      regionPrices: { countryCode: string; price: number; currency: string }[];
    }
  >();

  if (config?.modules && Array.isArray(config.modules)) {
    for (const mod of config.modules as {
      slug: string;
      basePrice?: number;
      isFree?: boolean;
      billingCycle?: string;
      regionPrices?: { countryCode: string; price: number; currency: string }[];
    }[]) {
      priceMap.set(mod.slug, {
        basePrice: mod.basePrice ?? 0,
        isFree: mod.isFree ?? false,
        billingCycle: mod.billingCycle ?? 'monthly',
        regionPrices: mod.regionPrices ?? [],
      });
    }
  }

  return priceMap;
}

async function getTenantCounts(): Promise<{
  enabledMap: Map<string, number>;
  totalTenants: number;
}> {
  const [counts, totalTenants] = await Promise.all([
    Tenant.aggregate([
      { $unwind: '$enabledModules' },
      { $group: { _id: '$enabledModules', count: { $sum: 1 } } },
    ]),
    Tenant.countDocuments(),
  ]);

  const enabledMap = new Map<string, number>();
  for (const item of counts) {
    enabledMap.set(item._id, item.count);
  }
  return { enabledMap, totalTenants };
}

// ── Module Management Routes ────────────────────────────────

export async function moduleManagementRoutes(fastify: FastifyInstance) {
  // ─── AGGREGATED MODULE LIST ─────────────────────────────────
  // GET /api/platform/modules
  // Returns modules with tenant counts + pricing, grouped by type
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_modules', 'read')] },
    async (request, reply) => {
      try {
        const query = request.query as {
          status?: string;
          type?: string;
          search?: string;
          category?: string;
          page?: string;
          limit?: string;
        };

        const filter: Record<string, unknown> = {};

        // Filter by status
        if (
          query.status &&
          ['development', 'beta', 'active', 'deprecated', 'retired'].includes(query.status)
        ) {
          filter.status = query.status;
        }

        // Filter by type (core/paid)
        if (query.type && ['core', 'paid'].includes(query.type)) {
          filter.type = query.type;
        }

        // Search by name or slug
        if (query.search) {
          const safeSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          filter.$or = [
            { slug: { $regex: safeSearch, $options: 'i' } },
            { 'name.en': { $regex: safeSearch, $options: 'i' } },
            { 'name.ar': { $regex: safeSearch, $options: 'i' } },
          ];
        }

        const page = Math.max(1, parseInt(query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
        const skip = (page - 1) * limit;

        // Parallel fetches
        const [modules, total, tenantCounts, priceMap] = await Promise.all([
          Module.find(filter).sort({ type: 1, slug: 1 }).skip(skip).limit(limit).lean(),
          Module.countDocuments(filter),
          getTenantCounts(),
          getModulePricing(),
        ]);

        // Enrich modules with tenant counts + pricing
        const enriched = modules.map((mod) => {
          const pricing = priceMap.get(mod.slug);
          const count =
            mod.type === 'core'
              ? tenantCounts.totalTenants
              : tenantCounts.enabledMap.get(mod.slug) || 0;
          return {
            ...mod,
            tenantCount: count,
            pricing: pricing || {
              basePrice: 0,
              isFree: mod.type === 'core',
              billingCycle: 'monthly',
              regionPrices: [],
            },
          };
        });

        return apiResponse(reply, 200, enriched, undefined, {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        });
      } catch (err) {
        logger.error({ err }, 'Module list error');
        return apiError(reply, 500, 'Failed to list modules');
      }
    },
  );

  // ─── MODULE STATS ─────────────────────────────────────────
  // GET /api/platform/modules/stats
  // Summary statistics for the module management dashboard
  fastify.get(
    '/stats',
    { preHandler: [authGuard, platformGuard('platform_modules', 'read')] },
    async (_request, reply) => {
      try {
        const [
          totalModules,
          activeModules,
          betaModules,
          deprecatedModules,
          coreModules,
          paidModules,
          statusCounts,
          topModules,
          totalInstallations,
        ] = await Promise.all([
          Module.countDocuments(),
          Module.countDocuments({ status: 'active' }),
          Module.countDocuments({ status: 'beta' }),
          Module.countDocuments({ status: 'deprecated' }),
          Module.countDocuments({ type: 'core' }),
          Module.countDocuments({ type: 'paid' }),
          Module.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]),
          TenantModule.aggregate([
            { $group: { _id: '$moduleSlug', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ]),
          TenantModule.countDocuments(),
        ]);

        // Enrich top modules with names
        const topSlugs = topModules.map((t) => t._id);
        const topNames = await Module.find({ slug: { $in: topSlugs } })
          .select('slug name icon')
          .lean();
        const nameMap = new Map(topNames.map((m) => [m.slug, m]));

        const topModulesEnriched = topModules.map((t) => ({
          slug: t._id,
          count: t.count,
          name: nameMap.get(t._id)?.name || { en: t._id },
          icon: nameMap.get(t._id)?.icon || 'Package',
        }));

        return apiResponse(reply, 200, {
          totalModules,
          activeModules,
          betaModules,
          deprecatedModules,
          coreModules,
          paidModules,
          totalInstallations,
          statusBreakdown: statusCounts.reduce(
            (acc, item) => {
              acc[item._id] = item.count;
              return acc;
            },
            {} as Record<string, number>,
          ),
          topModules: topModulesEnriched,
        });
      } catch (err) {
        logger.error({ err }, 'Module stats error');
        return apiError(reply, 500, 'Failed to fetch module stats');
      }
    },
  );

  // ─── SINGLE MODULE DETAIL ────────────────────────────────
  // GET /api/platform/modules/:slug
  // Full module detail with aggregated data
  fastify.get(
    '/:slug',
    { preHandler: [authGuard, platformGuard('platform_modules', 'read')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };

        const mod = await Module.findOne({ slug }).lean();
        if (!mod) {
          return apiError(reply, 404, `Module "${slug}" not found`);
        }

        // Parallel fetches for enrichment
        const [tenantCount, canaryCount, tenantVersions, priceMap] = await Promise.all([
          TenantModule.countDocuments({ moduleSlug: slug }),
          TenantModule.countDocuments({ moduleSlug: slug, isCanary: true }),
          TenantModule.aggregate([
            { $match: { moduleSlug: slug } },
            { $group: { _id: '$installedVersion', count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
          ]),
          getModulePricing(),
        ]);

        const pricing = priceMap.get(slug);

        return apiResponse(reply, 200, {
          module: mod,
          tenantCount,
          canaryCount,
          versionDistribution: tenantVersions.map((v) => ({
            version: v._id,
            count: v.count,
          })),
          pricing: pricing || {
            basePrice: 0,
            isFree: mod.type === 'core',
            billingCycle: 'monthly',
            regionPrices: [],
          },
        });
      } catch (err) {
        logger.error({ err }, 'Module detail error');
        return apiError(reply, 500, 'Failed to fetch module detail');
      }
    },
  );

  // ─── DELETE MODULE ────────────────────────────────────────
  // DELETE /api/platform/modules/:slug
  // Hard-delete a module (only if no tenants are using it)
  fastify.delete(
    '/:slug',
    { preHandler: [authGuard, platformGuard('platform_modules', 'delete')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };

        const mod = await Module.findOne({ slug });
        if (!mod) {
          return apiError(reply, 404, `Module "${slug}" not found`);
        }

        // Safety: prevent deletion if tenants are using it
        const tenantCount = await TenantModule.countDocuments({ moduleSlug: slug });
        if (tenantCount > 0) {
          return apiError(
            reply,
            400,
            `Cannot delete module "${slug}": ${tenantCount} tenant(s) still using it. Retire the module first.`,
          );
        }

        await Module.deleteOne({ slug });

        return apiResponse(reply, 200, { deleted: true, slug });
      } catch (err) {
        logger.error({ err }, 'Module delete error');
        return apiError(reply, 500, 'Failed to delete module');
      }
    },
  );
}
