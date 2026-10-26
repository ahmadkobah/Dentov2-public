/**
 * Platform Tenants Route — Developer Portal CRUD
 *
 * Full lifecycle management of tenants from the Developer Portal.
 *
 * Endpoints:
 *   GET    /                — List tenants (paginated, filterable)
 *   GET    /stats           — Aggregate stats (counts, MRR)
 *   GET    /:id             — Single tenant detail
 *   POST   /                — Create tenant via wizard (provision)
 *   PATCH  /:id             — Update tenant metadata
 *   PATCH  /:id/status      — Change status (activate, suspend, cancel)
 *   DELETE /:id             — Soft-delete (cancel) a tenant
 *
 * Auth: authGuard → platformGuard('platform_tenants', action)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { Tenant, User } from '../../models/index.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { provisionTenant, ProvisionError } from '../../services/tenant-provisioning.service.js';
import { logger } from '../../../utils/logger.js';
import { sendEmail } from '../../../services/providers/email.provider.js';
import { passwordResetEmailHtml } from '../../../utils/email-templates.js';
import { env } from '../../../config/env.js';
import { getTenantConnection } from '../../../tenant/middleware/tenant-db.js';
import { regexContains } from '../../../tenant/services/search.helpers.js';
import {
  syncTenantModulesFromEnabledList,
  syncTenantLanguages,
} from '../../services/module-sync.service.js';
import {
  createBrandingModel,
  DEFAULT_BRANDING_VALUES,
} from '../../../tenant/models/branding.model.js';
import { hashPassword } from '../../../utils/password.js';
import { DoctorSyncService } from '../../../tenant/services/doctor-sync.service.js';
import { SettingsService } from '../../../tenant/services/settings.service.js';
import {
  editUserProfileSchema,
  directCreateUserSchema,
  securitySettingsSchema,
} from '@dento/shared';
import { randomUUID } from 'node:crypto';
import { uploadToS3, getPresignedDownloadUrl } from '../../../config/s3.js';
import { getTenantBackupConfig } from '../../models/tenant-backup-config.model.js';
import { Backup } from '../../models/backup.model.js';
import { getBackupConfig } from '../../models/backup-config.model.js';
import { enqueueBackup } from '../../../queues/backup.queue.js';
import { DEFAULT_STORAGE_BUCKET } from '@dento/shared';
import { getStorageTierById } from '../../models/storage-tier.model.js';

/** Check if a value looks like an S3 key (not a full URL). */
function isS3Key(value: string): boolean {
  return !!value && !value.startsWith('http://') && !value.startsWith('https://');
}

/** Resolve S3 keys in tenant branding to presigned download URLs. */
async function resolveTenantBrandingUrls(
  branding: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const s3Ready = !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET);
  if (!s3Ready) return branding;

  const obj = { ...branding };
  for (const field of ['logoUrl', 'logoDarkUrl', 'faviconUrl'] as const) {
    const val = obj[field];
    if (typeof val === 'string' && isS3Key(val)) {
      obj[field] = await getPresignedDownloadUrl(val, 86_400);
    }
  }
  return obj;
}

// ── Validation Schemas ──────────────────────────────────────

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(['pending', 'trial', 'active', 'suspended', 'cancelled']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'status', 'lastActivityAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const addressSchema = z.object({
  street: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().min(2).max(3),
  postalCode: z.string().max(20).optional(),
});

const createTenantWizardSchema = z.object({
  // Step 1 — Clinic Info
  clinic: z.object({
    name: z.string().min(2).max(200),
    nameAr: z.string().max(200).optional(),
    phone: z.string().min(5).max(30),
    email: z.string().email(),
    website: z.string().url().optional(),
    address: addressSchema,
  }),
  // Step 2 — Branch Setup (optional for developer-created tenants)
  branch: z
    .object({
      name: z.string().min(2).max(200),
      phone: z.string().min(5).max(30),
      email: z.string().email().optional(),
      isMainBranch: z.boolean().default(true),
      workingHours: z
        .array(
          z.object({
            day: z.number().min(0).max(6),
            startTime: z.string().regex(/^\d{2}:\d{2}$/),
            endTime: z.string().regex(/^\d{2}:\d{2}$/),
            isOpen: z.boolean(),
          }),
        )
        .optional(),
      address: addressSchema.optional(),
    })
    .optional(),
  // Step 3 — Admin Account
  admin: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(5).max(30),
    password: z.string().min(8).max(128),
  }),
  // Step 4 — Settings
  settings: z
    .object({
      defaultLanguage: z.string().min(2).max(5).default('en'),
      supportedLanguages: z.array(z.string().min(2).max(5)).min(1).default(['en']),
      locale: z.string().min(2).max(5).optional(), // backward compat
      country: z.string().min(2).max(3).default('EG'),
      currency: z.string().min(3).max(3).default('EGP'),
      timezone: z.string().default('Africa/Cairo'),
      dateFormat: z.string().default('DD/MM/YYYY'),
      appointmentDuration: z.number().min(5).max(240).default(30),
    })
    .optional(),
  // Step 5 — Modules & Limits
  modules: z
    .object({
      enabledModules: z.array(z.string()).optional(),
      maxUsers: z.number().int().min(1).max(10000).optional(),
      maxBranches: z.number().int().min(1).max(500).optional(),
      storageTierId: z.string().optional(),
      customStorageGB: z.number().int().min(1).max(10000).optional(),
      customStoragePrice: z.number().min(0).optional(),
      customStorageCurrency: z.string().min(3).max(3).optional(),
    })
    .optional(),
  // Step 6 — Branding
  branding: z
    .object({
      primaryColor: z.string().max(20).optional(),
      accentColor: z.string().max(20).optional(),
      logoUrl: z.string().url().optional(),
      logoDarkUrl: z.string().url().optional(),
      faviconUrl: z.string().url().optional(),
    })
    .optional(),
});

const updateTenantSchema = z
  .object({
    name: z
      .object({
        en: z.string().min(2).max(200).optional(),
        ar: z.string().max(200).optional(),
      })
      .optional(),
    contact: z
      .object({
        email: z.string().email().optional(),
        phone: z.string().min(5).max(30).optional(),
        website: z.string().url().optional(),
        address: z
          .object({
            street: z.string().max(300).optional(),
            city: z.string().max(100).optional(),
            state: z.string().max(100).optional(),
            country: z.string().min(2).max(3).optional(),
            postalCode: z.string().max(20).optional(),
          })
          .optional(),
      })
      .optional(),
    branding: z
      .object({
        primaryColor: z.string().max(20).optional(),
        accentColor: z.string().max(20).optional(),
        logoUrl: z.string().url().optional(),
        logoDarkUrl: z.string().url().optional(),
        faviconUrl: z.string().url().optional(),
      })
      .optional(),
    settings: z
      .object({
        timezone: z.string().optional(),
        locale: z.string().min(2).max(5).optional(),
        defaultLanguage: z.string().min(2).max(5).optional(),
        supportedLanguages: z.array(z.string().min(2).max(5)).min(1).optional(),
        currency: z.string().min(3).max(3).optional(),
        dateFormat: z.string().optional(),
        timeFormat: z.enum(['12h', '24h']).optional(),
        weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]).optional(),
        sessionLimits: z
          .object({
            maxDesktop: z.number().int().min(1).max(5).optional(),
            maxMobile: z.number().int().min(1).max(5).optional(),
            maxTablet: z.number().int().min(1).max(5).optional(),
          })
          .optional(),
        platformEnforce2FA: z.boolean().optional(),
      })
      .optional(),
    enabledModules: z.array(z.string()).optional(),
    maxUsers: z.number().int().min(1).max(10000).optional(),
    maxBranches: z.number().int().min(1).max(500).optional(),
    storageTierId: z.string().optional(),
    billingDay: z.number().int().min(1).max(28).optional(),
    gracePeriodDays: z.number().int().min(0).max(30).optional(),
  })
  .strict();

const statusUpdateSchema = z.object({
  status: z.enum(['active', 'suspended', 'cancelled', 'trial']),
  reason: z.string().max(500).optional(),
});

// ── Route Registration ──────────────────────────────────────

export async function platformTenantRoutes(fastify: FastifyInstance) {
  // ─────────────────────────────────────────────────────────
  // GET / — List tenants (paginated, filterable)
  // ─────────────────────────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listQuerySchema.parse(request.query);
      const { page, limit, search, status, sortBy, sortOrder } = query;

      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      if (search) {
        const rx = regexContains(search);
        filter.$or = [{ 'name.en': rx }, { 'name.ar': rx }, { slug: rx }, { 'contact.email': rx }];
      }

      const skip = (page - 1) * limit;
      const sortDir = sortOrder === 'asc' ? 1 : -1;
      const sortField = sortBy === 'name' ? 'name.en' : sortBy;

      const [tenants, total] = await Promise.all([
        Tenant.find(filter)
          .sort({ [sortField]: sortDir })
          .skip(skip)
          .limit(limit)
          .select('-__v')
          .lean(),
        Tenant.countDocuments(filter),
      ]);

      // Enrich with user counts per tenant slug
      const slugs = tenants.map((t) => t.slug);
      const userCounts = await User.aggregate([
        { $match: { tenantSlug: { $in: slugs } } },
        { $group: { _id: '$tenantSlug', count: { $sum: 1 } } },
      ]);
      const countMap = new Map(userCounts.map((u) => [u._id, u.count as number]));

      const enriched = await Promise.all(
        tenants.map(async (t) => {
          const branding: Record<string, unknown> = { ...(t.branding ?? {}) };
          const resolved = await resolveTenantBrandingUrls(branding);
          return {
            ...t,
            userCount: countMap.get(t.slug) ?? 0,
            branding: resolved,
          };
        }),
      );

      return apiResponse(reply, 200, enriched, 'Tenants retrieved', {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    },
  );

  // ─────────────────────────────────────────────────────────
  // GET /stats — Aggregate stats for dashboard cards
  // ─────────────────────────────────────────────────────────
  fastify.get(
    '/stats',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [totalTenants, activeTenants, trialTenants, suspendedTenants, countriesAgg] =
        await Promise.all([
          Tenant.countDocuments(),
          Tenant.countDocuments({ status: 'active' }),
          Tenant.countDocuments({ status: 'trial' }),
          Tenant.countDocuments({ status: 'suspended' }),
          Tenant.aggregate([{ $group: { _id: '$contact.address.country' } }, { $count: 'count' }]),
        ]);

      return apiResponse(reply, 200, {
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
        countries: countriesAgg[0]?.count ?? 0,
      });
    },
  );

  // ─────────────────────────────────────────────────────────
  // GET /:id — Single tenant detail
  // ─────────────────────────────────────────────────────────
  fastify.get(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const tenant = await Tenant.findById(id).select('-__v').lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      // Enrich with real user count
      const userCountResult = await User.aggregate([
        { $match: { tenantSlug: tenant.slug } },
        { $count: 'count' },
      ]);
      const userCount = userCountResult[0]?.count ?? 0;

      // Enrich with real database size
      let dbSizeMB = 0;
      try {
        const tenantDb = getTenantConnection(tenant.slug);
        const stats = await tenantDb.db!.stats();
        dbSizeMB = Math.round((stats.dataSize / (1024 * 1024)) * 10) / 10;
      } catch {
        // Tenant DB may not exist yet or connection failed — keep 0
      }

      // Resolve storage tier name
      let storageTierName = 'Basic (Default)';
      if (tenant.storageTierId) {
        const tier = await getStorageTierById(String(tenant.storageTierId));
        if (tier) storageTierName = tier.name;
      }

      // Resolve branding URLs
      const branding: Record<string, unknown> = { ...(tenant.branding ?? {}) };
      const resolvedBranding = await resolveTenantBrandingUrls(branding);

      return apiResponse(reply, 200, {
        ...tenant,
        userCount,
        dbSizeMB,
        storageTierName,
        branding: resolvedBranding,
      });
    },
  );

  // ─────────────────────────────────────────────────────────
  // POST / — Create tenant via wizard (full provisioning)
  // ─────────────────────────────────────────────────────────
  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let parsed;
      try {
        parsed = createTenantWizardSchema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      try {
        const currentUserId = request.user?.userId;
        const result = await provisionTenant(parsed, currentUserId);

        logger.info(
          { slug: result.tenant.slug, createdBy: currentUserId },
          'Tenant created via developer portal',
        );

        return apiResponse(
          reply,
          201,
          {
            tenant: result.tenant,
            user: result.user,
          },
          'Tenant created successfully',
        );
      } catch (error) {
        if (error instanceof ProvisionError) {
          return apiError(reply, error.statusCode, error.message);
        }
        throw error;
      }
    },
  );

  // ─────────────────────────────────────────────────────────
  // PATCH /:id — Update tenant metadata
  // ─────────────────────────────────────────────────────────
  fastify.patch(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      let parsed;
      try {
        parsed = updateTenantSchema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      // Build flat update object for MongoDB $set
      const update: Record<string, unknown> = {};

      if (parsed.name) {
        if (parsed.name.en) update['name.en'] = parsed.name.en;
        if (parsed.name.ar !== undefined) update['name.ar'] = parsed.name.ar;
      }
      if (parsed.contact) {
        for (const [key, val] of Object.entries(parsed.contact)) {
          if (key === 'address' && val && typeof val === 'object') {
            for (const [aKey, aVal] of Object.entries(val)) {
              if (aVal !== undefined) update[`contact.address.${aKey}`] = aVal;
            }
          } else if (val !== undefined) {
            update[`contact.${key}`] = val;
          }
        }
      }
      if (parsed.branding) {
        for (const [key, val] of Object.entries(parsed.branding)) {
          if (val !== undefined) update[`branding.${key}`] = val;
        }
      }
      if (parsed.settings) {
        for (const [key, val] of Object.entries(parsed.settings)) {
          if (val === undefined) continue;
          if (key === 'sessionLimits' && typeof val === 'object') {
            for (const [sk, sv] of Object.entries(val as Record<string, unknown>)) {
              if (sv !== undefined) update[`settings.sessionLimits.${sk}`] = sv;
            }
          } else {
            update[`settings.${key}`] = val;
          }
        }
      }
      if (parsed.enabledModules) update.enabledModules = parsed.enabledModules;
      if (parsed.maxUsers) update.maxUsers = parsed.maxUsers;
      if (parsed.maxBranches) update.maxBranches = parsed.maxBranches;
      if (parsed.billingDay !== undefined) update.billingDay = parsed.billingDay;
      if (parsed.gracePeriodDays !== undefined) update.gracePeriodDays = parsed.gracePeriodDays;

      // Handle storage tier change (upgrade/downgrade)
      if (parsed.storageTierId) {
        const newTier = await getStorageTierById(parsed.storageTierId);
        if (!newTier) {
          return apiError(reply, 400, 'Invalid storage tier');
        }
        const newLimitMB = newTier.storageLimitGB * 1024;
        if (tenant.storageUsedMB > newLimitMB) {
          return apiError(
            reply,
            409,
            `Cannot downgrade: tenant is using ${Math.round(tenant.storageUsedMB)} MB but new tier limit is ${newLimitMB} MB`,
          );
        }
        update.storageTierId = newTier._id;
        update.storageLimitMB = newLimitMB;
      }

      update.updatedBy = request.user?.userId ?? null;

      const updated = await Tenant.findByIdAndUpdate(id, { $set: update }, { new: true })
        .select('-__v')
        .lean();

      // Sync TenantModule records when enabledModules changes
      if (parsed.enabledModules) {
        await syncTenantModulesFromEnabledList(id, parsed.enabledModules);
      }

      // Sync TenantLanguage records when supportedLanguages changes
      if (parsed.settings?.supportedLanguages) {
        const defaultLang =
          parsed.settings.defaultLanguage ?? updated?.settings?.defaultLanguage ?? 'en';
        await syncTenantLanguages(id, parsed.settings.supportedLanguages, defaultLang);
      }

      return apiResponse(reply, 200, updated, 'Tenant updated');
    },
  );

  // ─────────────────────────────────────────────────────────
  // PATCH /:id/status — Change tenant status
  // ─────────────────────────────────────────────────────────
  fastify.patch(
    '/:id/status',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      let parsed;
      try {
        parsed = statusUpdateSchema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      // Apply status transition
      const updateFields: Record<string, unknown> = {
        status: parsed.status,
        updatedBy: request.user?.userId ?? null,
      };

      if (parsed.status === 'active' && !tenant.activatedAt) {
        updateFields.activatedAt = new Date();
      }

      const updated = await Tenant.findByIdAndUpdate(id, { $set: updateFields }, { new: true })
        .select('-__v')
        .lean();

      logger.info(
        {
          tenantId: id,
          oldStatus: tenant.status,
          newStatus: parsed.status,
          reason: parsed.reason,
          changedBy: request.user?.userId,
        },
        'Tenant status changed',
      );

      return apiResponse(reply, 200, updated, `Tenant status updated to ${parsed.status}`);
    },
  );

  // ─────────────────────────────────────────────────────────
  // GET /:id/users — List users belonging to a tenant
  // ─────────────────────────────────────────────────────────
  fastify.get(
    '/:id/users',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const query = z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(50),
          search: z.string().max(200).optional(),
          role: z
            .enum([
              'tenant_admin',
              'dentist',
              'receptionist',
              'assistant',
              'accountant',
              'lab_tech',
              'hygienist',
            ])
            .optional(),
          status: z
            .enum(['invited', 'pending_activation', 'active', 'suspended', 'deactivated'])
            .optional(),
        })
        .parse(request.query);

      // Resolve tenant to get its slug
      const tenant = await Tenant.findById(id).select('slug').lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      const { page, limit, search, role, status } = query;
      const filter: Record<string, unknown> = { tenantSlug: tenant.slug };
      if (role) filter.role = role;
      if (status) filter.status = status;
      if (search) {
        const rx = regexContains(search);
        filter.$or = [{ email: rx }, { 'profile.firstName.en': rx }, { 'profile.lastName.en': rx }];
      }

      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('email profile role status lastLoginAt createdAt twoFactorEnabled')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter),
      ]);

      return apiResponse(reply, 200, users, undefined, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    },
  );

  // ─────────────────────────────────────────────────────────
  // PUT /:id/users/:userId — Edit a tenant user's profile
  // ─────────────────────────────────────────────────────────
  fastify.put(
    '/:id/users/:userId',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id, userId } = request.params as { id: string; userId: string };

      const tenant = await Tenant.findById(id).select('slug').lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      let parsed;
      try {
        parsed = editUserProfileSchema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      const user = await User.findOne({ _id: userId, tenantSlug: tenant.slug });
      if (!user) {
        return apiError(reply, 404, 'User not found in this tenant');
      }

      user.profile.firstName = parsed.firstName;
      user.profile.lastName = parsed.lastName;
      if (parsed.phone !== undefined) user.profile.phone = parsed.phone ?? undefined;
      if (parsed.gender !== undefined) user.profile.gender = parsed.gender ?? undefined;
      if (parsed.role) user.role = parsed.role;
      user.updatedBy = request.user?.userId as unknown as typeof user.updatedBy;
      await user.save();

      // Sync to Doctor record if user is a dentist
      if (user.role === 'dentist') {
        try {
          const tenantDb = getTenantConnection(tenant.slug);
          const doctorSync = new DoctorSyncService(tenantDb);
          await doctorSync.syncUserToDoctor(user as any, request.user!.userId);
        } catch (syncErr) {
          logger.error({ err: syncErr, userId }, 'Failed to sync user profile to Doctor');
        }
      }

      logger.info(
        { tenantId: id, userId, updatedBy: request.user?.userId },
        'Tenant user profile updated via platform',
      );

      const result = await User.findById(userId)
        .select('email profile role status lastLoginAt createdAt')
        .lean();

      return apiResponse(reply, 200, result, 'User updated');
    },
  );

  // ─────────────────────────────────────────────────────────
  // POST /:id/users/create-direct — Create tenant user directly
  // (Developer-only: bypasses invite/email verification)
  // ─────────────────────────────────────────────────────────
  fastify.post(
    '/:id/users/create-direct',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const tenant = await Tenant.findById(id).select('slug maxUsers').lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      let parsed;
      try {
        parsed = directCreateUserSchema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      // Check email uniqueness
      const existing = await User.findOne({ email: parsed.email.toLowerCase() });
      if (existing) {
        return apiError(reply, 409, 'A user with this email already exists');
      }

      // Check user count against maxUsers
      const currentCount = await User.countDocuments({ tenantSlug: tenant.slug });
      if (tenant.maxUsers && currentCount >= tenant.maxUsers) {
        return apiError(reply, 400, `Tenant has reached its maximum of ${tenant.maxUsers} users`);
      }

      const hashedPw = await hashPassword(parsed.password);

      const user = await User.create({
        email: parsed.email.toLowerCase(),
        password: hashedPw,
        role: parsed.role,
        tenantSlug: tenant.slug,
        profile: {
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          phone: parsed.phone,
        },
        status: 'active',
        isEmailVerified: true,
        isProfileComplete: true,
        createdBy: request.user?.userId,
      });

      // If dentist, create Doctor record in tenant DB
      if (parsed.role === 'dentist') {
        try {
          const tenantDb = getTenantConnection(tenant.slug);
          const doctorSync = new DoctorSyncService(tenantDb);
          await doctorSync.createDoctorFromUser(user as any, request.user!.userId);
        } catch (syncErr) {
          logger.error({ err: syncErr, userId: user._id }, 'Failed to create Doctor from user');
        }
      }

      logger.info(
        { tenantId: id, userId: user._id, email: parsed.email, role: parsed.role },
        'Tenant user created directly via platform (bypass invite)',
      );

      const result = await User.findById(user._id)
        .select('email profile role status lastLoginAt createdAt')
        .lean();

      return apiResponse(reply, 201, result, 'User created');
    },
  );

  // ─────────────────────────────────────────────────────────
  // DELETE /:id — Soft-delete or permanent delete
  //   - Active/suspended → soft-delete (set status to cancelled)
  //   - Already cancelled → permanent delete (remove from DB)
  // ─────────────────────────────────────────────────────────
  fastify.delete(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'delete')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      if (tenant.status === 'cancelled') {
        // Permanent delete — tenant was already cancelled
        // Trigger pre-delete backup if configured
        const backupConfig = await getTenantBackupConfig(tenant.slug);
        if (backupConfig?.autoBackupOnDelete) {
          try {
            const date = new Date().toISOString().replace(/[:.]/g, '-');
            const filePath = `backups/${tenant.slug}/pre-delete_${date}.gz`;
            const globalConfig = await getBackupConfig();
            const backup = await Backup.create({
              tenantSlug: tenant.slug,
              type: 'pre-delete',
              status: 'pending',
              filePath,
              storageBucket: DEFAULT_STORAGE_BUCKET,
              retentionDays: backupConfig.retentionDays,
              initiatedBy: request.user?.userId ?? null,
            });
            await enqueueBackup({
              type: 'tenant-backup',
              backupId: backup._id.toString(),
              tenantSlug: tenant.slug,
              initiatedBy: request.user?.userId || 'system',
              encrypt: globalConfig.encryptionEnabled,
            });
            logger.info(
              { tenantSlug: tenant.slug, backupId: backup._id },
              'Pre-delete backup triggered',
            );
          } catch (err) {
            logger.error(
              { err, tenantSlug: tenant.slug },
              'Pre-delete backup trigger failed (continuing with deletion)',
            );
          }
        }

        await Tenant.findByIdAndDelete(id);

        logger.info(
          { tenantId: id, slug: tenant.slug, deletedBy: request.user?.userId },
          'Tenant permanently deleted',
        );

        return apiResponse(reply, 200, null, 'Tenant permanently deleted');
      }

      // Soft-delete — set status to cancelled
      // Trigger pre-migration backup if configured
      const backupConfig = await getTenantBackupConfig(tenant.slug);
      if (backupConfig?.autoBackupOnMigration) {
        try {
          const date = new Date().toISOString().replace(/[:.]/g, '-');
          const filePath = `backups/${tenant.slug}/pre-migration_${date}.gz`;
          const globalConfig = await getBackupConfig();
          const backup = await Backup.create({
            tenantSlug: tenant.slug,
            type: 'pre-migration',
            status: 'pending',
            filePath,
            storageBucket: DEFAULT_STORAGE_BUCKET,
            retentionDays: backupConfig.retentionDays,
            initiatedBy: request.user?.userId ?? null,
          });
          await enqueueBackup({
            type: 'tenant-backup',
            backupId: backup._id.toString(),
            tenantSlug: tenant.slug,
            initiatedBy: request.user?.userId || 'system',
            encrypt: globalConfig.encryptionEnabled,
          });
          logger.info(
            { tenantSlug: tenant.slug, backupId: backup._id },
            'Pre-migration backup triggered (status → cancelled)',
          );
        } catch (err) {
          logger.error(
            { err, tenantSlug: tenant.slug },
            'Pre-migration backup trigger failed (continuing with cancellation)',
          );
        }
      }

      await Tenant.findByIdAndUpdate(id, {
        $set: {
          status: 'cancelled',
          isActive: false,
          updatedBy: request.user?.userId ?? null,
        },
      });

      logger.info(
        { tenantId: id, slug: tenant.slug, deletedBy: request.user?.userId },
        'Tenant soft-deleted (cancelled)',
      );

      return apiResponse(reply, 200, null, 'Tenant cancelled');
    },
  );

  // ─────────────────────────────────────────────────────────
  // POST /:id/users/:userId/reset-password — Platform admin
  // force-resets a tenant user's password
  // ─────────────────────────────────────────────────────────
  fastify.post(
    '/:id/users/:userId/reset-password',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id, userId } = request.params as { id: string; userId: string };

      // Resolve tenant to get slug
      const tenant = await Tenant.findById(id).select('slug').lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      // Find the user belonging to that tenant
      const targetUser = await User.findOne({
        _id: userId,
        tenantSlug: tenant.slug,
      });
      if (!targetUser) {
        return apiError(reply, 404, 'User not found in this tenant');
      }

      // Generate reset token (same flow as forgot-password)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      targetUser.resetToken = hashedToken;
      targetUser.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await targetUser.save();

      // Send reset email (fire-and-forget)
      const adminPortalUrl = env.ADMIN_PORTAL_URL || 'http://localhost:5173';
      const resetLink = `${adminPortalUrl}/reset-password?token=${resetToken}`;
      const displayName = targetUser.profile?.firstName?.en || 'there';

      sendEmail({
        to: targetUser.email,
        subject: 'Password Reset Requested by Platform Administrator — Dento',
        html: passwordResetEmailHtml({
          resetLink,
          userName: displayName,
          expiresInMinutes: 60,
        }),
      }).catch((err) => {
        logger.error(
          { err, userId, tenantId: id },
          'Failed to send platform-initiated reset email',
        );
      });

      logger.info(
        { tenantId: id, userId, triggeredBy: request.user?.userId },
        'Platform admin triggered password reset for tenant user',
      );

      return apiResponse(reply, 200, null, 'Password reset email sent to user');
    },
  );

  // ─────────────────────────────────────────────────────────
  // POST /:id/users/:userId/reset-2fa — Platform admin
  // resets a tenant user's 2FA (clears TOTP secret + codes)
  // ─────────────────────────────────────────────────────────
  fastify.post(
    '/:id/users/:userId/reset-2fa',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id, userId } = request.params as { id: string; userId: string };

      const tenant = await Tenant.findById(id).select('slug').lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      const targetUser = await User.findOne({ _id: userId, tenantSlug: tenant.slug });
      if (!targetUser) {
        return apiError(reply, 404, 'User not found in this tenant');
      }

      if (!targetUser.twoFactorEnabled) {
        return apiError(reply, 400, '2FA is not enabled for this user');
      }

      await User.findByIdAndUpdate(userId, {
        $set: { twoFactorEnabled: false },
        $unset: {
          twoFactorSecret: 1,
          twoFactorPendingSecret: 1,
          twoFactorRecoveryCodes: 1,
        },
      });

      logger.info(
        { tenantId: id, userId, triggeredBy: request.user?.userId },
        'Platform admin reset 2FA for tenant user',
      );

      return apiResponse(reply, 200, null, '2FA reset successfully');
    },
  );

  // ─────────────────────────────────────────────────────────
  // GET /:id/branding — Read tenant's branding settings
  // ─────────────────────────────────────────────────────────
  fastify.get(
    '/:id/branding',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const tenant = await Tenant.findById(id).lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      const tenantDb = getTenantConnection(tenant.slug);
      const BrandingModel = createBrandingModel(tenantDb);

      let branding = await BrandingModel.findOne({ type: 'branding' }).lean();
      if (!branding) {
        branding = {
          ...DEFAULT_BRANDING_VALUES,
          updatedAt: new Date(),
          updatedBy: null,
        } as unknown as typeof branding;
      }

      return apiResponse(reply, 200, {
        branding: await resolveTenantBrandingUrls(branding as Record<string, unknown>),
      });
    },
  );

  // ─────────────────────────────────────────────────────────
  // PATCH /:id/branding — Update tenant's branding settings
  // ─────────────────────────────────────────────────────────
  const tenantBrandingUpdateSchema = z
    .object({
      logoUrl: z.string().max(2048).nullable().optional(),
      logoDarkUrl: z.string().max(2048).nullable().optional(),
      faviconUrl: z.string().max(2048).nullable().optional(),
      clinicName: z
        .object({ en: z.string().min(1).max(200), ar: z.string().max(200).optional() })
        .strict()
        .optional(),
      address: z
        .object({
          main: z
            .object({ en: z.string().min(1).max(200), ar: z.string().max(200).optional() })
            .strict()
            .optional(),
          branchId: z.string().optional(),
        })
        .strict()
        .optional(),
      phone: z.string().max(30).optional(),
      email: z.string().email().max(200).optional().or(z.literal('')),
      website: z.string().max(200).optional(),
      primaryColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
        .optional(),
      accentColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
        .optional(),
      customCss: z.string().max(5000).nullable().optional(),
    })
    .strict();

  fastify.patch(
    '/:id/branding',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const tenant = await Tenant.findById(id).lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      let body;
      try {
        body = tenantBrandingUpdateSchema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      const tenantDb = getTenantConnection(tenant.slug);
      const BrandingModel = createBrandingModel(tenantDb);

      const branding = await BrandingModel.findOneAndUpdate(
        { type: 'branding' },
        {
          $set: {
            ...body,
            updatedBy: request.user?.userId ?? null,
          },
          $setOnInsert: { type: 'branding' },
        },
        { upsert: true, new: true, lean: true },
      );

      // Sync logo fields to platform tenant record for list/detail views
      const platformUpdate: Record<string, unknown> = {};
      if (body.logoUrl !== undefined) platformUpdate['branding.logoUrl'] = body.logoUrl;
      if (body.logoDarkUrl !== undefined) platformUpdate['branding.logoDarkUrl'] = body.logoDarkUrl;
      if (body.faviconUrl !== undefined) platformUpdate['branding.faviconUrl'] = body.faviconUrl;
      if (body.primaryColor !== undefined)
        platformUpdate['branding.primaryColor'] = body.primaryColor;
      if (body.accentColor !== undefined) platformUpdate['branding.accentColor'] = body.accentColor;
      if (Object.keys(platformUpdate).length > 0) {
        await Tenant.updateOne({ _id: id }, { $set: platformUpdate });
      }

      return apiResponse(reply, 200, { branding, message: 'Tenant branding updated' });
    },
  );

  // ─────────────────────────────────────────────────────────
  // POST /:id/branding/upload — Upload branding asset for tenant
  // ─────────────────────────────────────────────────────────
  fastify.post(
    '/:id/branding/upload',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const tenant = await Tenant.findById(id).lean();
        if (!tenant) {
          return apiError(reply, 404, 'Tenant not found');
        }

        if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY || !env.S3_BUCKET) {
          return apiError(reply, 503, 'File storage (S3/R2) is not configured.');
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
        const MAX_SIZE = 5 * 1024 * 1024;

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
        const key = `tenants/${tenant.slug}/branding/${randomUUID()}${ext}`;

        await uploadToS3(key, buffer, data.mimetype);
        const url = await getPresignedDownloadUrl(key, 86400);

        return apiResponse(
          reply,
          201,
          {
            key,
            url,
            fileName: data.filename,
            mimeType: data.mimetype,
            fileSize: buffer.length,
          },
          'Branding asset uploaded',
        );
      } catch (err) {
        request.log.error(err, 'Tenant branding upload failed');
        const message = err instanceof Error ? err.message : 'Upload failed';
        return apiError(reply, 500, message);
      }
    },
  );

  // ─────────────────────────────────────────────────────────
  // GET /:id/security-settings — Read tenant's security settings
  // ─────────────────────────────────────────────────────────
  fastify.get(
    '/:id/security-settings',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const tenant = await Tenant.findById(id).lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      const tenantDb = getTenantConnection(tenant.slug);
      const svc = new SettingsService(tenantDb);
      const settings = await svc.getByKey('security');

      return apiResponse(reply, 200, { security: settings });
    },
  );

  // ─────────────────────────────────────────────────────────
  // PATCH /:id/security-settings — Update tenant's security settings
  // ─────────────────────────────────────────────────────────
  fastify.patch(
    '/:id/security-settings',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const tenant = await Tenant.findById(id).lean();
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      const parsed = securitySettingsSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return apiError(reply, 400, 'Validation failed', parsed.error.issues);
      }

      const tenantDb = getTenantConnection(tenant.slug);
      const svc = new SettingsService(tenantDb);
      const updated = await svc.update(
        'security',
        parsed.data as Record<string, unknown>,
        request.user?.userId ?? 'platform',
      );

      return apiResponse(reply, 200, { security: updated }, 'Security settings updated');
    },
  );
}
