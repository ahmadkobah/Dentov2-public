/**
 * Tenant Provisioning Service
 *
 * Extracted from onboarding.route.ts for reuse by both:
 *   - POST /api/onboarding (public self-signup)
 *   - POST /api/platform/tenants (developer portal wizard)
 *
 * Handles: slug generation, user creation, tenant record,
 *          database provisioning, branch setup, settings seeding.
 */

import type { Connection } from 'mongoose';
import argon2 from 'argon2';
import { getTenantDb } from '../../config/database.js';
import { Tenant, User, TenantLanguage } from '../models/index.js';
import { getBranchModel } from '../../tenant/models/index.js';
import { seedTenantDatabase } from '../../scripts/seed-tenant.js';
import { SettingsService } from '../../tenant/services/settings.service.js';
import { logger } from '../../utils/logger.js';
import { getCountryDefaultTaxRate } from '@dento/shared';
import { syncAfterProvisioning } from './module-sync.service.js';
import { getStorageTierById, getDefaultStorageTier } from '../models/storage-tier.model.js';

// ── Types ───────────────────────────────────────────────────

export interface ProvisionClinicInput {
  name: string;
  nameAr?: string;
  phone: string;
  email: string;
  website?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
}

export interface ProvisionBranchInput {
  name: string;
  phone: string;
  email?: string;
  isMainBranch?: boolean;
  workingHours?: Array<{
    day: number;
    startTime: string;
    endTime: string;
    isOpen: boolean;
  }>;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

export interface ProvisionAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface ProvisionSettingsInput {
  locale?: string; // backward compat
  defaultLanguage?: string;
  supportedLanguages?: string[];
  country?: string;
  currency?: string;
  timezone?: string;
  dateFormat?: string;
  appointmentDuration?: number;
}

export interface ProvisionModulesInput {
  enabledModules?: string[];
  maxUsers?: number;
  maxBranches?: number;
  storageTierId?: string;
  customStorageGB?: number;
  customStoragePrice?: number;
  customStorageCurrency?: string;
}

export interface ProvisionBrandingInput {
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
}

export interface ProvisionTenantInput {
  clinic: ProvisionClinicInput;
  branch?: ProvisionBranchInput;
  admin: ProvisionAdminInput;
  settings?: ProvisionSettingsInput;
  modules?: ProvisionModulesInput;
  branding?: ProvisionBrandingInput;
}

export interface ProvisionResult {
  tenant: { id: string; slug: string; name: { en: string; ar?: string }; status: string };
  user: { id: string; email: string };
  tenantDb: Connection;
}

// ── Slug Helpers ────────────────────────────────────────────

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;

  while (await Tenant.exists({ slug })) {
    attempt++;
    slug = `${base}-${attempt}`;
  }

  return slug;
}

// ── Main Provisioning ───────────────────────────────────────

/**
 * Provision a new tenant end-to-end.
 *
 * Steps:
 *  1. Check for duplicate admin email
 *  2. Generate unique slug
 *  3. Hash admin password
 *  4. Create admin user in platform DB
 *  5. Create tenant record in platform DB
 *  6. Provision tenant database (useDb)
 *  7. Create first branch (optional — skipped if no branch input)
 *  8. Seed tenant defaults (medications, lab order types)
 *  9. Seed tenant settings
 *
 * Rolls back user + tenant on failure.
 */
export async function provisionTenant(
  input: ProvisionTenantInput,
  createdByUserId?: string,
): Promise<ProvisionResult> {
  const { clinic, branch, admin, settings, modules, branding } = input;

  // ── 1. Check duplicate email ──────────────────────────────
  const existingUser = await User.findOne({ email: admin.email.toLowerCase() });
  if (existingUser) {
    throw new ProvisionError(409, 'An account with this email already exists');
  }

  // ── 2. Generate unique slug ───────────────────────────────
  const baseSlug = generateSlug(clinic.name);
  if (!baseSlug) {
    throw new ProvisionError(400, 'Clinic name must contain at least one alphanumeric character');
  }
  const slug = await ensureUniqueSlug(baseSlug);

  let userId: string | undefined;

  try {
    // ── 3. Hash admin password ────────────────────────────────
    const hashedPassword = await argon2.hash(admin.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // ── 4. Create admin user ──────────────────────────────────
    const user = await User.create({
      email: admin.email.toLowerCase(),
      password: hashedPassword,
      role: 'tenant_admin',
      tenantSlug: slug,
      profile: {
        firstName: { en: admin.firstName },
        lastName: { en: admin.lastName },
        phone: admin.phone,
      },
      status: 'active',
      isEmailVerified: false,
      tokenVersion: 0,
      passwordHistory: [hashedPassword],
    });

    userId = user._id.toString();

    // ── 5. Create tenant record ───────────────────────────────
    const defaultLanguage = settings?.defaultLanguage ?? settings?.locale ?? 'en';
    const supportedLanguages = settings?.supportedLanguages ?? [defaultLanguage];
    // storageTierId resolves from a Document `_id` (typed `unknown`) and is stored
    // as an ObjectId by Mongoose; payload typed loosely so Mongoose 9's stricter
    // create casting accepts the resolved value unchanged.
    const tenantDoc: Record<string, unknown> = {
      name: { en: clinic.name, ...(clinic.nameAr && { ar: clinic.nameAr }) },
      slug,
      status: 'trial',
      trialStartedAt: new Date(),
      trialEndAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      contact: {
        email: clinic.email.toLowerCase(),
        phone: clinic.phone,
        website: clinic.website,
        address: {
          street: clinic.address.street,
          city: clinic.address.city,
          state: clinic.address.state,
          country: clinic.address.country,
          postalCode: clinic.address.postalCode,
        },
      },
      branding: branding
        ? {
            primaryColor: branding.primaryColor ?? '#4f46e5',
            accentColor: branding.accentColor ?? '#10b981',
            logoUrl: branding.logoUrl,
            logoDarkUrl: branding.logoDarkUrl,
            faviconUrl: branding.faviconUrl,
          }
        : undefined,
      settings: {
        timezone: settings?.timezone ?? 'Africa/Cairo',
        defaultLanguage,
        supportedLanguages,
        currency: settings?.currency ?? 'EGP',
        dateFormat: settings?.dateFormat ?? 'DD/MM/YYYY',
      },
      enabledModules: modules?.enabledModules ?? [],
      maxUsers: modules?.maxUsers ?? 10,
      maxBranches: modules?.maxBranches ?? 1,
      ...(await resolveStorageTier(modules)),
      ownerId: user._id,
      createdBy: createdByUserId ?? user._id,
    };
    const tenant = await Tenant.create(tenantDoc);

    // ── 5b. Sync TenantModule records for enabled modules ────
    // Auto-add language_pack if tenant has a secondary (non-EN) language
    const hasSecondaryLang = supportedLanguages.some((l) => l !== 'en');
    const enabledList = [...(modules?.enabledModules ?? [])];
    if (hasSecondaryLang && !enabledList.includes('language_pack')) {
      enabledList.push('language_pack');
      // Also persist on the tenant record
      await Tenant.updateOne(
        { _id: tenant._id },
        { $addToSet: { enabledModules: 'language_pack' } },
      );
    }
    if (enabledList.length > 0) {
      await syncAfterProvisioning(tenant._id.toString(), enabledList);
    }

    // ── 5c. Seed TenantLanguage records ─────────────────────
    for (const langCode of supportedLanguages) {
      await TenantLanguage.updateOne(
        { tenantId: tenant._id, languageCode: langCode },
        {
          $setOnInsert: {
            tenantId: tenant._id,
            languageCode: langCode,
            isDefault: langCode === defaultLanguage,
            isActive: true,
          },
        },
        { upsert: true },
      );
    }

    // ── 6. Provision tenant database ──────────────────────────
    const tenantDb = getTenantDb(slug);

    // ── 7. Create first branch (if provided) ──────────────────
    if (branch) {
      const Branch = getBranchModel(tenantDb);

      const defaultWorkingHours = branch.workingHours?.length
        ? branch.workingHours.map((wh) => ({
            dayOfWeek: wh.day,
            openTime: wh.startTime,
            closeTime: wh.endTime,
            isClosed: !wh.isOpen,
          }))
        : [
            { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 5, openTime: '09:00', closeTime: '13:00', isClosed: true },
            { dayOfWeek: 6, openTime: '09:00', closeTime: '13:00', isClosed: true },
          ];

      const branchAddress = branch.address
        ? `${branch.address.street ?? ''}, ${branch.address.city ?? ''}`.replace(/^, |, $/g, '')
        : '';

      await Branch.create({
        name: { en: branch.name },
        code: 'MAIN',
        address: { en: branchAddress },
        city: branch.address?.city ?? '',
        phone: branch.phone,
        email: branch.email,
        chairs: [{ number: 1, name: 'Chair 1', isActive: true, equipmentType: 'standard' }],
        workingHours: defaultWorkingHours,
        isPrimary: true,
        isActive: true,
        createdBy: user._id,
      });
    }

    // ── 8. Seed tenant defaults ───────────────────────────────
    await seedTenantDatabase(tenantDb, slug);

    // ── 9. Seed tenant settings ───────────────────────────────
    const settingsService = new SettingsService(tenantDb);
    await settingsService.seedDefaults();

    const countryCode = settings?.country ?? clinic.address.country ?? 'EG';
    const defaultTaxRate = getCountryDefaultTaxRate(countryCode);

    await settingsService.update(
      'clinic',
      {
        name: { en: clinic.name },
        phone: clinic.phone,
        email: clinic.email,
        website: clinic.website ?? null,
        address: {
          en: [clinic.address.street, clinic.address.city].filter(Boolean).join(', '),
        },
        timezone: settings?.timezone ?? 'Africa/Cairo',
        defaultLanguage,
        currency: settings?.currency ?? 'EGP',
        dateFormat: settings?.dateFormat ?? 'DD/MM/YYYY',
        taxEnabled: defaultTaxRate > 0,
        taxPercentage: defaultTaxRate,
      },
      userId,
    );

    if (branch) {
      const workingHours = branch.workingHours?.length
        ? branch.workingHours.filter((wh) => wh.isOpen).map((wh) => wh.day)
        : [0, 1, 2, 3, 4];

      await settingsService.update(
        'appointment',
        {
          slotDuration: settings?.appointmentDuration ?? 30,
          workingDays: workingHours,
          workingHoursStart: '09:00',
          workingHoursEnd: '17:00',
        },
        userId,
      );
    }

    logger.info({ slug, userId }, 'Tenant provisioned successfully');

    return {
      tenant: {
        id: tenant._id.toString(),
        slug: tenant.slug,
        name: tenant.name as { en: string; ar?: string },
        status: tenant.status,
      },
      user: {
        id: userId,
        email: user.email,
      },
      tenantDb,
    };
  } catch (error) {
    // Rollback on failure
    try {
      await User.deleteOne({ email: admin.email.toLowerCase(), tenantSlug: slug });
      await Tenant.deleteOne({ slug });
    } catch {
      logger.warn({ slug }, 'Best-effort cleanup during provisioning rollback');
    }

    if (error instanceof ProvisionError) throw error;

    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new ProvisionError(409, 'This clinic name is already taken');
    }

    throw error;
  }
}

// ── Error Class ─────────────────────────────────────────────

export class ProvisionError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ProvisionError';
    this.statusCode = statusCode;
  }
}

// ── Storage Tier Resolution ─────────────────────────────────

async function resolveStorageTier(
  modules?: ProvisionModulesInput,
): Promise<{ storageTierId?: unknown; storageLimitMB: number }> {
  // If explicit tier selected
  if (modules?.storageTierId) {
    const tier = await getStorageTierById(modules.storageTierId);
    if (tier) {
      // For custom tiers, use the per-tenant customStorageGB; otherwise use tier limit
      const limitGB =
        tier.isCustom && modules.customStorageGB ? modules.customStorageGB : tier.storageLimitGB;
      return {
        storageTierId: tier._id,
        storageLimitMB: limitGB * 1024,
      };
    }
  }

  // Fall back to default tier (Basic 100 GB)
  const defaultTier = await getDefaultStorageTier();
  if (defaultTier) {
    return {
      storageTierId: defaultTier._id,
      storageLimitMB: defaultTier.storageLimitGB * 1024,
    };
  }

  // Absolute fallback if no tiers exist yet
  return { storageLimitMB: 102400 }; // 100 GB
}
