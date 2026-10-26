/**
 * Module Sync Service
 *
 * Keeps Tenant.enabledModules[] and TenantModule records in sync.
 * Both sources must always agree — this service is the single place
 * that ensures bidirectional consistency.
 */

import { Tenant } from '../models/index.js';
import { TenantModule } from '../models/tenant-module.model.js';
import { TenantLanguage } from '../models/tenant-language.model.js';
import { Module } from '../models/module.model.js';
import { logger } from '../../utils/logger.js';

/**
 * Call after a TenantModule record is created (versioning install).
 * Ensures the slug also appears in Tenant.enabledModules[].
 */
export async function syncAfterInstall(tenantId: string, moduleSlug: string): Promise<void> {
  await Tenant.updateOne({ _id: tenantId }, { $addToSet: { enabledModules: moduleSlug } });
}

/**
 * Call after a TenantModule record is deleted (versioning uninstall).
 * Ensures the slug is removed from Tenant.enabledModules[].
 */
export async function syncAfterUninstall(tenantId: string, moduleSlug: string): Promise<void> {
  await Tenant.updateOne({ _id: tenantId }, { $pull: { enabledModules: moduleSlug } });
}

/**
 * Call when Tenant.enabledModules[] is directly set (dev portal toggle / PATCH).
 * Diffs against existing TenantModule records and creates/deletes as needed.
 */
export async function syncTenantModulesFromEnabledList(
  tenantId: string,
  newEnabledModules: string[],
): Promise<void> {
  const existing = await TenantModule.find({ tenantId }).select('moduleSlug').lean();
  const existingSlugs = new Set(existing.map((e) => e.moduleSlug));
  const newSlugs = new Set(newEnabledModules);

  // Slugs added — create TenantModule records
  const toAdd = newEnabledModules.filter((s) => !existingSlugs.has(s));
  if (toAdd.length > 0) {
    const modules = await Module.find({ slug: { $in: toAdd } })
      .select('slug version')
      .lean();
    const moduleMap = new Map(modules.map((m) => [m.slug, m]));

    const docs = toAdd.map((slug) => {
      const mod = moduleMap.get(slug);
      return {
        tenantId,
        moduleSlug: slug,
        installedVersion: mod?.version ?? '1.0.0',
        availableVersion: mod?.version ?? '1.0.0',
        updatePolicy: 'auto' as const,
        isCanary: false,
        installedAt: new Date(),
      };
    });

    await TenantModule.insertMany(docs, { ordered: false }).catch((err) => {
      // Ignore duplicate key errors (E11000) — record already exists
      if (err?.code !== 11000) {
        logger.error({ err, tenantId, toAdd }, 'Failed to create TenantModule records during sync');
      }
    });
  }

  // Slugs removed — delete TenantModule records
  const toRemove = [...existingSlugs].filter((s) => !newSlugs.has(s));
  if (toRemove.length > 0) {
    await TenantModule.deleteMany({ tenantId, moduleSlug: { $in: toRemove } });
  }
}

/**
 * Call after tenant provisioning to bulk-create TenantModule records
 * for all initially enabled modules.
 */
export async function syncAfterProvisioning(
  tenantId: string,
  enabledModules: string[],
): Promise<void> {
  if (!enabledModules.length) return;

  const modules = await Module.find({ slug: { $in: enabledModules } })
    .select('slug version')
    .lean();
  const moduleMap = new Map(modules.map((m) => [m.slug, m]));

  const docs = enabledModules.map((slug) => {
    const mod = moduleMap.get(slug);
    return {
      tenantId,
      moduleSlug: slug,
      installedVersion: mod?.version ?? '1.0.0',
      availableVersion: mod?.version ?? '1.0.0',
      updatePolicy: 'auto' as const,
      isCanary: false,
      installedAt: new Date(),
    };
  });

  await TenantModule.insertMany(docs, { ordered: false }).catch((err) => {
    // Ignore duplicate key errors — idempotent
    if (err?.code !== 11000) {
      logger.error({ err, tenantId }, 'Failed to create TenantModule records during provisioning');
    }
  });
}

// ── Language Sync ───────────────────────────────────────────

/**
 * Sync TenantLanguage records when Tenant.settings.supportedLanguages is updated.
 *
 * - Creates TenantLanguage records for newly added languages
 * - Deactivates records for removed languages (soft-delete)
 * - Updates isDefault flag when defaultLanguage changes
 */
export async function syncTenantLanguages(
  tenantId: string,
  supportedLanguages: string[],
  defaultLanguage: string,
): Promise<void> {
  const existing = await TenantLanguage.find({ tenantId }).lean();
  const existingCodes = new Set(existing.map((e) => e.languageCode));
  const newCodes = new Set(supportedLanguages);

  // Activate or create records for supported languages
  for (const code of supportedLanguages) {
    if (existingCodes.has(code)) {
      // Re-activate if it was deactivated, and update isDefault
      await TenantLanguage.updateOne(
        { tenantId, languageCode: code },
        { $set: { isActive: true, isDefault: code === defaultLanguage } },
      );
    } else {
      // Create new record
      await TenantLanguage.updateOne(
        { tenantId, languageCode: code },
        {
          $setOnInsert: { tenantId, languageCode: code },
          $set: { isActive: true, isDefault: code === defaultLanguage },
        },
        { upsert: true },
      );
    }
  }

  // Deactivate records for removed languages
  const toDeactivate = [...existingCodes].filter((c) => !newCodes.has(c));
  if (toDeactivate.length > 0) {
    await TenantLanguage.updateMany(
      { tenantId, languageCode: { $in: toDeactivate } },
      { $set: { isActive: false, isDefault: false } },
    );
  }

  // ── Auto-activate / deactivate language_pack module ───────
  const hasSecondaryLang = supportedLanguages.some((l) => l !== 'en');
  const tenant = await Tenant.findById(tenantId).select('enabledModules').lean();
  if (!tenant) return;

  const hasLanguagePack = (tenant.enabledModules ?? []).includes('language_pack');

  if (hasSecondaryLang && !hasLanguagePack) {
    // Add language_pack to enabledModules and create TenantModule record
    await Tenant.updateOne({ _id: tenantId }, { $addToSet: { enabledModules: 'language_pack' } });
    await syncAfterInstall(tenantId, 'language_pack');
    logger.info({ tenantId }, 'Auto-activated language_pack module (secondary language added)');
  } else if (!hasSecondaryLang && hasLanguagePack) {
    // Remove language_pack — only EN remains
    await Tenant.updateOne({ _id: tenantId }, { $pull: { enabledModules: 'language_pack' } });
    await syncAfterUninstall(tenantId, 'language_pack');
    logger.info({ tenantId }, 'Auto-deactivated language_pack module (only EN remains)');
  }
}
