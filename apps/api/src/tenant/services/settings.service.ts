/**
 * Settings Service — Business Logic
 *
 * Per V2_DATABASE.md §11.1 — Tenant-Konfiguration
 * Key-value settings with typed defaults per category.
 */

import type { Connection } from 'mongoose';
import { getSettingsModel, DEFAULT_SETTINGS, type SettingsKey } from '../models/settings.model.js';
import { ApiError } from '../../utils/api-response.js';
import { Tenant } from '../../platform/models/index.js';
import { getCountryDefaultTaxRate } from '@dento/shared';

export class SettingsService {
  private SettingsModel;

  constructor(private tenantDb: Connection) {
    this.SettingsModel = getSettingsModel(tenantDb);
  }

  /**
   * Get all settings (returns all keys with defaults merged)
   */
  async getAll(): Promise<Record<SettingsKey, Record<string, unknown>>> {
    const docs = await this.SettingsModel.find({}).lean();
    const result = { ...DEFAULT_SETTINGS } as Record<SettingsKey, Record<string, unknown>>;

    for (const doc of docs) {
      const key = doc.key as SettingsKey;
      if (DEFAULT_SETTINGS[key]) {
        result[key] = { ...DEFAULT_SETTINGS[key], ...doc.value };
      }
    }

    // Auto-fill tax rate from tenant country when not yet configured
    if (result.clinic?.taxPercentage == null) {
      try {
        const slug = this.tenantDb.name?.replace('tenant_', '');
        if (slug) {
          const tenant = await Tenant.findOne({ slug }).select('contact.address.country').lean();
          const country = (tenant as any)?.contact?.address?.country;
          if (country) {
            const rate = getCountryDefaultTaxRate(country);
            result.clinic.taxEnabled = rate > 0;
            result.clinic.taxPercentage = rate;
          }
        }
      } catch {
        // Ignore — keep defaults
      }
    }

    return result;
  }

  /**
   * Get a single settings key (merged with defaults)
   */
  async getByKey(key: SettingsKey): Promise<Record<string, unknown>> {
    const defaults = DEFAULT_SETTINGS[key];
    if (!defaults) {
      throw new ApiError(400, `Unknown settings key: ${key}`, 'INVALID_SETTINGS_KEY');
    }

    const doc = await this.SettingsModel.findOne({ key }).lean();
    const result = doc ? { ...defaults, ...doc.value } : { ...defaults };

    // Auto-fill tax rate from tenant country when not yet configured
    if (key === 'clinic' && result.taxPercentage == null) {
      try {
        const slug = this.tenantDb.name?.replace('tenant_', '');
        if (slug) {
          const tenant = await Tenant.findOne({ slug }).select('contact.address.country').lean();
          const country = (tenant as any)?.contact?.address?.country;
          if (country) {
            const rate = getCountryDefaultTaxRate(country);
            result.taxEnabled = rate > 0;
            result.taxPercentage = rate;
          }
        }
      } catch {
        // Ignore — keep defaults
      }
    }

    return result;
  }

  /**
   * Update a settings key (merge with existing values)
   */
  async update(
    key: SettingsKey,
    value: Record<string, unknown>,
    userId: string,
  ): Promise<Record<string, unknown>> {
    if (!DEFAULT_SETTINGS[key]) {
      throw new ApiError(400, `Unknown settings key: ${key}`, 'INVALID_SETTINGS_KEY');
    }

    const existing = await this.SettingsModel.findOne({ key });
    const mergedValue = {
      ...(existing?.value ?? DEFAULT_SETTINGS[key]),
      ...value,
    };

    const result = await this.SettingsModel.findOneAndUpdate(
      { key },
      { $set: { value: mergedValue, updatedBy: userId } },
      { new: true, upsert: true, lean: true },
    );

    return result!.value;
  }

  /**
   * Reset a settings key to defaults
   */
  async reset(key: SettingsKey, userId: string): Promise<Record<string, unknown>> {
    if (!DEFAULT_SETTINGS[key]) {
      throw new ApiError(400, `Unknown settings key: ${key}`, 'INVALID_SETTINGS_KEY');
    }

    await this.SettingsModel.findOneAndUpdate(
      { key },
      { $set: { value: DEFAULT_SETTINGS[key], updatedBy: userId } },
      { upsert: true },
    );

    return DEFAULT_SETTINGS[key];
  }

  /**
   * Seed default settings for a new tenant
   */
  async seedDefaults(): Promise<void> {
    const keys = Object.keys(DEFAULT_SETTINGS) as SettingsKey[];
    const bulkOps = keys.map((key) => ({
      updateOne: {
        filter: { key },
        update: { $setOnInsert: { key, value: DEFAULT_SETTINGS[key] } },
        upsert: true,
      },
    }));

    await this.SettingsModel.bulkWrite(bulkOps);
  }
}
