/**
 * Module Versioning Routes — Platform API
 * Based on DENTO_V2_MASTER_PLAN.md §24 — Module Versioning System
 *
 * Endpoints:
 *   Modules:
 *   - GET    /api/modules                 — List all modules (with filters)
 *   - GET    /api/modules/:slug           — Get module by slug
 *   - POST   /api/modules                 — Create module (platform_admin)
 *   - PATCH  /api/modules/:slug           — Update module metadata
 *   - POST   /api/modules/:slug/version   — Push new version (with validations)
 *   - PATCH  /api/modules/:slug/status    — Change lifecycle status
 *
 *   Tenant Modules:
 *   - GET    /api/modules/tenant/:tenantId           — List modules for tenant
 *   - POST   /api/modules/tenant/:tenantId/install   — Install module for tenant
 *   - DELETE /api/modules/tenant/:tenantId/:slug      — Uninstall module
 *   - PATCH  /api/modules/tenant/:tenantId/:slug      — Update policy/canary/pricing
 *
 *   Rollout:
 *   - POST   /api/modules/:slug/rollout              — Start canary rollout
 *   - GET    /api/modules/:slug/rollout               — Get active rollout
 *   - POST   /api/modules/:slug/rollout/advance       — Advance rollout stage
 *   - POST   /api/modules/:slug/rollout/rollback      — Rollback
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { Module } from '../../models/module.model.js';
import { TenantModule } from '../../models/tenant-module.model.js';
import { RolloutPlan } from '../../models/rollout-plan.model.js';
import { SEMVER_REGEX, compareSemVer } from '@dento/shared';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { syncAfterInstall, syncAfterUninstall } from '../../services/module-sync.service.js';
import { regexContains } from '../../../tenant/services/search.helpers.js';

// ── Route Helpers ───────────────────────────────────────────

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Validation Schemas ──────────────────────────────────────

const bilingualSchema = z
  .object({
    en: z.string().min(1).max(200),
    ar: z.string().max(200).optional(),
  })
  .strict();

const createModuleSchema = z
  .object({
    slug: z
      .string()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9_]+$/, 'Slug must be lowercase alphanumeric with underscores'),
    name: bilingualSchema,
    description: bilingualSchema.optional(),
    version: z.string().regex(SEMVER_REGEX, 'Must be valid SemVer (e.g. 1.0.0)').default('0.1.0'),
    type: z.enum(['core', 'paid']).default('paid'),
    dependsOn: z.array(z.string()).optional(),
    conflictsWith: z.array(z.string()).optional(),
    icon: z.string().max(50).optional(),
  })
  .strict();

const updateModuleSchema = z
  .object({
    name: bilingualSchema.optional(),
    description: bilingualSchema.optional(),
    dependsOn: z.array(z.string()).optional(),
    conflictsWith: z.array(z.string()).optional(),
    icon: z.string().max(50).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const pushVersionSchema = z
  .object({
    version: z.string().regex(SEMVER_REGEX, 'Must be valid SemVer'),
    changelog: z
      .object({
        changes: z.array(z.string().min(1)).min(1, 'At least one change entry required'),
      })
      .strict(),
    migrations: z
      .array(
        z
          .object({
            type: z.enum(['addField', 'removeField', 'addIndex', 'addCollection', 'migrateData']),
            collection: z.string().min(1),
            field: z.string().optional(),
            description: z.string().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

const changeStatusSchema = z
  .object({
    status: z.enum(['development', 'beta', 'active', 'deprecated', 'retired']),
  })
  .strict();

const installModuleSchema = z
  .object({
    moduleSlug: z.string().min(2).max(60),
    updatePolicy: z.enum(['auto', 'manual', 'pinned']).default('auto'),
    isCanary: z.boolean().default(false),
  })
  .strict();

const updateTenantModuleSchema = z
  .object({
    updatePolicy: z.enum(['auto', 'manual', 'pinned']).optional(),
    pinnedVersion: z.string().nullable().optional(),
    isCanary: z.boolean().optional(),
    priceOverride: z.number().min(0).nullable().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    discountExpiresAt: z.string().datetime().nullable().optional(),
  })
  .strict();

const startRolloutSchema = z
  .object({
    toVersion: z.string().regex(SEMVER_REGEX, 'Must be valid SemVer'),
    canaryPercent: z.number().min(1).max(50).default(5),
    monitoringHours: z.number().min(1).max(168).default(24),
    errorRateThreshold: z.number().min(0.1).max(100).default(1.0),
  })
  .strict();

// ── Lifecycle Validation Helpers ────────────────────────────

const LIFECYCLE_ORDER = ['development', 'beta', 'active', 'deprecated', 'retired'];

function isValidStatusTransition(from: string, to: string): boolean {
  const fromIdx = LIFECYCLE_ORDER.indexOf(from);
  const toIdx = LIFECYCLE_ORDER.indexOf(to);
  // Can only move forward or back one step (e.g. beta → development for bugfix)
  return toIdx >= 0 && fromIdx >= 0 && (toIdx === fromIdx + 1 || toIdx === fromIdx - 1);
}

// ── Module Routes ───────────────────────────────────────────

export async function versioningRoutes(fastify: FastifyInstance) {
  // ─── LIST MODULES ─────────────────────────────────────────
  fastify.get(
    '/modules',
    { preHandler: [authGuard, platformGuard('platform_modules', 'read')] },
    async (request, reply) => {
      try {
        const query = request.query as {
          status?: string;
          type?: string;
          search?: string;
          page?: string;
          limit?: string;
        };

        const filter: Record<string, unknown> = {};
        if (query.status) filter.status = query.status;
        if (query.type) filter.type = query.type;
        if (query.search) {
          const rx = regexContains(query.search);
          filter.$or = [{ slug: rx }, { 'name.en': rx }];
        }

        const page = Math.max(1, parseInt(query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
        const skip = (page - 1) * limit;

        const [modules, total] = await Promise.all([
          Module.find(filter).sort({ slug: 1 }).skip(skip).limit(limit).lean(),
          Module.countDocuments(filter),
        ]);

        return apiResponse(reply, 200, {
          modules,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to list modules');
      }
    },
  );

  // ─── GET MODULE BY SLUG ───────────────────────────────────
  fastify.get(
    '/modules/:slug',
    { preHandler: [authGuard, platformGuard('platform_modules', 'read')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };
        const mod = await Module.findOne({ slug }).lean();
        if (!mod) {
          return apiError(reply, 404, `Module "${slug}" not found`);
        }

        // Get tenant count using this module
        const tenantCount = await TenantModule.countDocuments({ moduleSlug: slug });

        return apiResponse(reply, 200, { module: mod, tenantCount });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch module');
      }
    },
  );

  // ─── CREATE MODULE ────────────────────────────────────────
  fastify.post(
    '/modules',
    { preHandler: [authGuard, platformGuard('platform_modules', 'create')] },
    async (request, reply) => {
      try {
        const data = createModuleSchema.parse(request.body);

        // Check slug uniqueness
        const existing = await Module.findOne({ slug: data.slug });
        if (existing) {
          return apiError(reply, 409, `Module "${data.slug}" already exists`);
        }

        // Validate dependsOn modules exist
        if (data.dependsOn?.length) {
          const deps = await Module.find({ slug: { $in: data.dependsOn } })
            .select('slug')
            .lean();
          const foundSlugs = deps.map((d) => d.slug);
          const missing = data.dependsOn.filter((s) => !foundSlugs.includes(s));
          if (missing.length) {
            return apiError(reply, 404, `Dependencies not found: ${missing.join(', ')}`);
          }
        }

        const mod = await Module.create({
          ...data,
          status: 'development',
          changelog: [
            {
              version: data.version,
              date: new Date(),
              changes: ['Initial version'],
            },
          ],
        });

        return apiResponse(reply, 201, { module: mod.toObject() });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to create module');
      }
    },
  );

  // ─── UPDATE MODULE METADATA ───────────────────────────────
  fastify.patch(
    '/modules/:slug',
    { preHandler: [authGuard, platformGuard('platform_modules', 'update')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };
        const data = updateModuleSchema.parse(request.body);

        const mod = await Module.findOneAndUpdate({ slug }, { $set: data }, { new: true }).lean();

        if (!mod) {
          return apiError(reply, 404, `Module "${slug}" not found`);
        }

        return apiResponse(reply, 200, { module: mod });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to update module');
      }
    },
  );

  // ─── PUSH NEW VERSION ────────────────────────────────────
  fastify.post(
    '/modules/:slug/version',
    { preHandler: [authGuard, platformGuard('platform_modules', 'create')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };
        const data = pushVersionSchema.parse(request.body);

        const mod = await Module.findOne({ slug });
        if (!mod) {
          return apiError(reply, 404, `Module "${slug}" not found`);
        }

        // §24 Validation: SemVer — no downgrades
        if (compareSemVer(data.version, mod.version) !== 1) {
          return apiError(
            reply,
            400,
            `New version ${data.version} must be greater than current ${mod.version}`,
          );
        }

        // Push changelog entry
        mod.changelog.unshift({
          version: data.version,
          date: new Date(),
          changes: data.changelog.changes,
        });

        // Push migration entries
        if (data.migrations?.length) {
          for (const m of data.migrations) {
            mod.migrations.push({ ...m, version: data.version });
          }
        }

        // Update version
        mod.version = data.version;
        await mod.save();

        // Update availableVersion for all tenants with this module
        await TenantModule.updateMany(
          { moduleSlug: slug },
          { $set: { availableVersion: data.version } },
        );

        return apiResponse(reply, 200, { module: mod.toObject() });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to push version');
      }
    },
  );

  // ─── CHANGE LIFECYCLE STATUS ──────────────────────────────
  fastify.patch(
    '/modules/:slug/status',
    { preHandler: [authGuard, platformGuard('platform_modules', 'update')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };
        const { status } = changeStatusSchema.parse(request.body);

        const mod = await Module.findOne({ slug });
        if (!mod) {
          return apiError(reply, 404, `Module "${slug}" not found`);
        }

        // §24 Validation: Valid lifecycle transition
        if (!isValidStatusTransition(mod.status, status)) {
          return apiError(
            reply,
            400,
            `Cannot transition from "${mod.status}" to "${status}". ` +
              `Valid transitions: ${LIFECYCLE_ORDER.join(' → ')}`,
          );
        }

        // §24 Validation: Cannot retire if active tenants
        if (status === 'retired') {
          const activeTenants = await TenantModule.countDocuments({ moduleSlug: slug });
          if (activeTenants > 0) {
            return apiError(
              reply,
              400,
              `Cannot retire "${slug}" — ${activeTenants} tenant(s) still have it installed`,
            );
          }
        }

        mod.status = status;
        await mod.save();

        return apiResponse(reply, 200, { module: mod.toObject() });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to change status');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // TENANT MODULE ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  // ─── LIST TENANT MODULES ──────────────────────────────────
  fastify.get(
    '/modules/tenant/:tenantId',
    { preHandler: [authGuard, platformGuard('platform_modules', 'read')] },
    async (request, reply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };

        const tenantModules = await TenantModule.find({ tenantId }).lean();

        // Enrich with module metadata
        const moduleSlugs = tenantModules.map((tm) => tm.moduleSlug);
        const modules = await Module.find({ slug: { $in: moduleSlugs } }).lean();
        const moduleMap = new Map(modules.map((m) => [m.slug, m]));

        const enriched = tenantModules.map((tm) => ({
          ...tm,
          module: moduleMap.get(tm.moduleSlug) || null,
          hasUpdate: tm.installedVersion !== tm.availableVersion,
        }));

        return apiResponse(reply, 200, { tenantModules: enriched });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to list tenant modules');
      }
    },
  );

  // ─── INSTALL MODULE FOR TENANT ────────────────────────────
  fastify.post(
    '/modules/tenant/:tenantId/install',
    { preHandler: [authGuard, platformGuard('platform_modules', 'create')] },
    async (request, reply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const data = installModuleSchema.parse(request.body);

        // Find module
        const mod = await Module.findOne({ slug: data.moduleSlug });
        if (!mod) {
          return apiError(reply, 404, `Module "${data.moduleSlug}" not found`);
        }

        // Check already installed
        const existing = await TenantModule.findOne({ tenantId, moduleSlug: data.moduleSlug });
        if (existing) {
          return apiError(reply, 400, `Module "${data.moduleSlug}" already installed`);
        }

        // §24 Validation: Dependency check
        if (mod.dependsOn.length > 0) {
          const installed = await TenantModule.find({
            tenantId,
            moduleSlug: { $in: mod.dependsOn },
          })
            .select('moduleSlug')
            .lean();
          const installedSlugs = installed.map((i) => i.moduleSlug);
          const missing = mod.dependsOn.filter((d) => !installedSlugs.includes(d));
          if (missing.length > 0) {
            return apiError(
              reply,
              400,
              `Required dependencies not installed: ${missing.join(', ')}`,
            );
          }
        }

        // §24 Validation: Conflict check
        if (mod.conflictsWith.length > 0) {
          const conflicts = await TenantModule.find({
            tenantId,
            moduleSlug: { $in: mod.conflictsWith },
          })
            .select('moduleSlug')
            .lean();
          if (conflicts.length > 0) {
            return apiError(
              reply,
              409,
              `Conflicts with installed modules: ${conflicts.map((c) => c.moduleSlug).join(', ')}`,
            );
          }
        }

        const tenantModule = await TenantModule.create({
          tenantId,
          moduleSlug: data.moduleSlug,
          installedVersion: mod.version,
          availableVersion: mod.version,
          updatePolicy: data.updatePolicy,
          isCanary: data.isCanary,
          installedAt: new Date(),
        });

        // Sync: ensure Tenant.enabledModules[] includes this slug
        await syncAfterInstall(tenantId, data.moduleSlug);

        return apiResponse(reply, 201, { tenantModule: tenantModule.toObject() });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to install module');
      }
    },
  );

  // ─── UNINSTALL MODULE FROM TENANT ─────────────────────────
  fastify.delete(
    '/modules/tenant/:tenantId/:slug',
    { preHandler: [authGuard, platformGuard('platform_modules', 'delete')] },
    async (request, reply) => {
      try {
        const { tenantId, slug } = request.params as { tenantId: string; slug: string };

        // Check if other installed modules depend on this one
        const dependents = await TenantModule.find({ tenantId }).lean();
        const allModules = await Module.find({
          slug: { $in: dependents.map((d) => d.moduleSlug) },
        }).lean();
        const blocking = allModules.filter((m) => m.slug !== slug && m.dependsOn.includes(slug));
        if (blocking.length > 0) {
          return apiError(
            reply,
            400,
            `Cannot uninstall "${slug}" — required by: ${blocking.map((b) => b.slug).join(', ')}`,
          );
        }

        const result = await TenantModule.findOneAndDelete({ tenantId, moduleSlug: slug });
        if (!result) {
          return apiError(reply, 400, `Module "${slug}" not installed for this tenant`);
        }

        // Sync: remove slug from Tenant.enabledModules[]
        await syncAfterUninstall(tenantId, slug);

        return apiResponse(reply, 200, { message: `Module "${slug}" uninstalled successfully` });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to uninstall module');
      }
    },
  );

  // ─── UPDATE TENANT MODULE (policy/canary/pricing) ─────────
  fastify.patch(
    '/modules/tenant/:tenantId/:slug',
    { preHandler: [authGuard, platformGuard('platform_modules', 'update')] },
    async (request, reply) => {
      try {
        const { tenantId, slug } = request.params as { tenantId: string; slug: string };
        const data = updateTenantModuleSchema.parse(request.body);

        const tenantModule = await TenantModule.findOneAndUpdate(
          { tenantId, moduleSlug: slug },
          { $set: data },
          { new: true },
        ).lean();

        if (!tenantModule) {
          return apiError(reply, 400, `Module "${slug}" not installed for this tenant`);
        }

        return apiResponse(reply, 200, { tenantModule });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to update tenant module');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // CANARY ROLLOUT ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  // ─── START ROLLOUT ────────────────────────────────────────
  fastify.post(
    '/modules/:slug/rollout',
    { preHandler: [authGuard, platformGuard('platform_modules', 'create')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };
        const data = startRolloutSchema.parse(request.body);

        // Find module
        const mod = await Module.findOne({ slug });
        if (!mod) {
          return apiError(reply, 404, `Module "${slug}" not found`);
        }

        // Verify target version exists in changelog
        const versionExists = mod.changelog.some((c) => c.version === data.toVersion);
        if (!versionExists) {
          return apiError(reply, 400, `Version ${data.toVersion} not in changelog`);
        }

        // Check no active rollout for this module
        const activeRollout = await RolloutPlan.findOne({
          moduleSlug: slug,
          stage: { $nin: ['completed', 'rolled_back'] },
        });
        if (activeRollout) {
          return apiError(
            reply,
            409,
            `Active rollout already exists for "${slug}" (stage: ${activeRollout.stage})`,
          );
        }

        // Get current most-common installed version
        const tenantModules = await TenantModule.find({ moduleSlug: slug }).lean();
        if (tenantModules.length === 0) {
          return apiError(reply, 400, `No tenants have "${slug}" installed`);
        }

        // Get canary tenants (those with isCanary=true)
        const canaryTenants = tenantModules.filter((tm) => tm.isCanary);
        const canaryCount = Math.max(
          1,
          Math.ceil(tenantModules.length * (data.canaryPercent / 100)),
        );

        // Create rollout plan
        const rollout = await RolloutPlan.create({
          moduleSlug: slug,
          fromVersion:
            mod.version === data.toVersion ? tenantModules[0].installedVersion : mod.version,
          toVersion: data.toVersion,
          stage: 'canary',
          canaryPercent: data.canaryPercent,
          errorRateThreshold: data.errorRateThreshold,
          monitoringHours: data.monitoringHours,
          startedAt: new Date(),
          stages: [
            {
              stage: 'canary',
              startedAt: new Date(),
              completedAt: null,
              tenantsAffected: canaryTenants.length || canaryCount,
              errorRate: 0,
            },
          ],
          initiatedBy: getUserId(request),
        });

        // Update canary tenants to new version
        const canaryIds =
          canaryTenants.length > 0
            ? canaryTenants.map((ct) => ct._id)
            : tenantModules.slice(0, canaryCount).map((tm) => tm._id);

        await TenantModule.updateMany(
          { _id: { $in: canaryIds } },
          {
            $set: { installedVersion: data.toVersion },
            $push: {
              updateHistory: {
                from: tenantModules[0].installedVersion,
                to: data.toVersion,
                at: new Date(),
                status: 'success',
              },
            },
          },
        );

        return apiResponse(reply, 201, {
          rollout: rollout.toObject(),
          canaryTenantsUpdated: canaryIds.length,
          totalTenants: tenantModules.length,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to start rollout');
      }
    },
  );

  // ─── GET ACTIVE ROLLOUT ───────────────────────────────────
  fastify.get(
    '/modules/:slug/rollout',
    { preHandler: [authGuard, platformGuard('platform_modules', 'read')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };

        const rollout = await RolloutPlan.findOne({
          moduleSlug: slug,
          stage: { $nin: ['completed', 'rolled_back'] },
        }).lean();

        if (!rollout) {
          // Return last completed/rolled-back rollout
          const lastRollout = await RolloutPlan.findOne({ moduleSlug: slug })
            .sort({ createdAt: -1 })
            .lean();

          return apiResponse(reply, 200, {
            activeRollout: null,
            lastRollout: lastRollout || null,
          });
        }

        // Get progress stats
        const totalTenants = await TenantModule.countDocuments({ moduleSlug: slug });
        const updatedTenants = await TenantModule.countDocuments({
          moduleSlug: slug,
          installedVersion: rollout.toVersion,
        });

        return apiResponse(reply, 200, {
          activeRollout: rollout,
          progress: {
            total: totalTenants,
            updated: updatedTenants,
            percent: totalTenants > 0 ? Math.round((updatedTenants / totalTenants) * 100) : 0,
          },
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch rollout');
      }
    },
  );

  // ─── ADVANCE ROLLOUT STAGE ────────────────────────────────
  fastify.post(
    '/modules/:slug/rollout/advance',
    { preHandler: [authGuard, platformGuard('platform_modules', 'create')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };

        const rollout = await RolloutPlan.findOne({
          moduleSlug: slug,
          stage: { $nin: ['completed', 'rolled_back'] },
        });

        if (!rollout) {
          return apiError(reply, 400, `No active rollout for "${slug}"`);
        }

        // Determine next stage
        const stageOrder = [
          'canary',
          'rolling_25',
          'rolling_50',
          'rolling_100',
          'completed',
        ] as const;
        const currentIdx = stageOrder.indexOf(rollout.stage as (typeof stageOrder)[number]);
        if (currentIdx === -1 || currentIdx >= stageOrder.length - 1) {
          return apiError(reply, 400, 'Rollout already at final stage');
        }

        const nextStage = stageOrder[currentIdx + 1];
        const totalTenants = await TenantModule.countDocuments({ moduleSlug: slug });

        // Calculate how many tenants to update in this stage
        const stagePercents: Record<string, number> = {
          rolling_25: 25,
          rolling_50: 50,
          rolling_100: 100,
          completed: 100,
        };

        const targetPercent = stagePercents[nextStage] || 100;
        const targetCount = Math.ceil(totalTenants * (targetPercent / 100));

        // Update tenants that haven't been updated yet
        if (nextStage !== 'completed') {
          const notUpdated = await TenantModule.find({
            moduleSlug: slug,
            installedVersion: { $ne: rollout.toVersion },
          })
            .limit(targetCount)
            .lean();

          if (notUpdated.length > 0) {
            await TenantModule.updateMany(
              { _id: { $in: notUpdated.map((t) => t._id) } },
              {
                $set: { installedVersion: rollout.toVersion },
                $push: {
                  updateHistory: {
                    from: notUpdated[0].installedVersion,
                    to: rollout.toVersion,
                    at: new Date(),
                    status: 'success',
                  },
                },
              },
            );
          }

          // Record stage
          rollout.stages.push({
            stage: nextStage as 'canary' | 'rolling_25' | 'rolling_50' | 'rolling_100',
            startedAt: new Date(),
            completedAt: null,
            tenantsAffected: notUpdated.length,
            errorRate: 0,
          });
        }

        // Mark previous stage as completed
        const lastStage = rollout.stages[rollout.stages.length - 1];
        if (lastStage) {
          lastStage.completedAt = new Date();
        }

        rollout.stage = nextStage;
        if (nextStage === 'completed') {
          rollout.completedAt = new Date();
        }
        await rollout.save();

        return apiResponse(reply, 200, { rollout: rollout.toObject() });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to advance rollout');
      }
    },
  );

  // ─── ROLLBACK ─────────────────────────────────────────────
  fastify.post(
    '/modules/:slug/rollout/rollback',
    { preHandler: [authGuard, platformGuard('platform_modules', 'create')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };
        const body = request.body as { reason?: string } | undefined;

        const rollout = await RolloutPlan.findOne({
          moduleSlug: slug,
          stage: { $nin: ['completed', 'rolled_back'] },
        });

        if (!rollout) {
          return apiError(reply, 400, `No active rollout for "${slug}"`);
        }

        // Revert all tenants that were updated in this rollout
        const result = await TenantModule.updateMany(
          { moduleSlug: slug, installedVersion: rollout.toVersion },
          {
            $set: { installedVersion: rollout.fromVersion },
            $push: {
              updateHistory: {
                from: rollout.toVersion,
                to: rollout.fromVersion,
                at: new Date(),
                status: 'rolled_back',
                error: body?.reason || 'Manual rollback',
              },
            },
          },
        );

        rollout.stage = 'rolled_back';
        rollout.rolledBackAt = new Date();
        rollout.rollbackReason = body?.reason || 'Manual rollback';
        await rollout.save();

        return apiResponse(reply, 200, {
          rollout: rollout.toObject(),
          tenantsRolledBack: result.modifiedCount,
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to rollback');
      }
    },
  );
}
