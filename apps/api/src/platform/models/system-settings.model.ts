import mongoose, { Schema, type Document } from 'mongoose';

/**
 * System Settings Model — Platform Database (dento_platform)
 *
 * Per V2_DATABASE §4.17 — system_settings singleton
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.2
 *
 * Singleton document (_id = 'default') storing global platform configuration:
 * - Maintenance mode + message
 * - Defaults (timezone, currency, language)
 * - Registration toggle
 * - Cluster capacity
 * - Support contact + version
 */

// ── Types ───────────────────────────────────────────────────

export interface ISystemSettings extends Document<string> {
  _id: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLanguage: string;
  registrationEnabled: boolean;
  maxTenantsPerCluster: number;
  supportEmail: string;
  platformVersion: string;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    _id: {
      type: String,
      default: 'default',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    defaultTimezone: {
      type: String,
      default: 'Asia/Riyadh',
    },
    defaultCurrency: {
      type: String,
      default: 'SAR',
      minlength: 3,
      maxlength: 3,
    },
    defaultLanguage: {
      type: String,
      enum: ['en', 'ar'],
      default: 'ar',
    },
    registrationEnabled: {
      type: Boolean,
      default: true,
    },
    maxTenantsPerCluster: {
      type: Number,
      default: 500,
      min: 1,
      max: 10000,
    },
    supportEmail: {
      type: String,
      default: 'support@dento.app',
    },
    platformVersion: {
      type: String,
      default: '2.0.0',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    _id: false,
    timestamps: true,
    collection: 'system_settings',
  },
);

// ── Singleton Helper ────────────────────────────────────────

/**
 * Get (or create) the singleton system settings document.
 */
export async function getSystemSettings(): Promise<ISystemSettings> {
  let settings = await SystemSettings.findById('default');
  if (!settings) {
    settings = await SystemSettings.create({ _id: 'default' });
  }
  return settings;
}

// ── Model Export ────────────────────────────────────────────

export const SystemSettings = mongoose.model<ISystemSettings>(
  'SystemSettings',
  systemSettingsSchema,
);
