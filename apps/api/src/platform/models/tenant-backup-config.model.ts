import mongoose, { Schema, type Document } from 'mongoose';
import type { BackupFrequency, BackupGroup } from '@dento/shared';

/**
 * Per-Tenant Backup Configuration — Platform Database (dento_platform)
 *
 * Each tenant can override global backup defaults:
 * - Enable/disable automatic backups
 * - Set backup frequency (daily/weekly/monthly) + time
 * - Select which backup groups to include/exclude
 * - Auto-backup before migration or deletion
 *
 * Stored in platform DB (survives tenant deletion for HIPAA compliance).
 */

// ── Types ───────────────────────────────────────────────────

export interface ITenantBackupConfig extends Document {
  tenantSlug: string;
  backupEnabled: boolean;
  frequency: BackupFrequency;
  hour: number; // 0–23 UTC
  dayOfWeek: number | null; // 0=Sun..6=Sat (weekly only)
  dayOfMonth: number | null; // 1–28 (monthly only)
  retentionDays: number;
  excludeGroups: BackupGroup[];
  autoBackupOnMigration: boolean;
  autoBackupOnDelete: boolean;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const tenantBackupConfigSchema = new Schema<ITenantBackupConfig>(
  {
    tenantSlug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    backupEnabled: {
      type: Boolean,
      default: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily',
    },
    hour: {
      type: Number,
      default: 3, // 03:00 UTC
      min: 0,
      max: 23,
    },
    dayOfWeek: {
      type: Number,
      default: null,
      min: 0,
      max: 6,
    },
    dayOfMonth: {
      type: Number,
      default: null,
      min: 1,
      max: 28,
    },
    retentionDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365,
    },
    excludeGroups: {
      type: [String],
      enum: [
        'clinical',
        'appointments',
        'imaging',
        'financial',
        'inventory',
        'lab',
        'medications',
        'hr',
        'communications',
        'automation',
        'settings',
      ],
      default: [],
    },
    autoBackupOnMigration: {
      type: Boolean,
      default: true,
    },
    autoBackupOnDelete: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'tenant_backup_configs',
  },
);

// ── Helpers ─────────────────────────────────────────────────

/**
 * Build a cron expression from frequency + hour + day fields.
 */
export function buildCronExpression(config: ITenantBackupConfig): string {
  switch (config.frequency) {
    case 'weekly':
      return `0 ${config.hour} * * ${config.dayOfWeek ?? 0}`;
    case 'monthly':
      return `0 ${config.hour} ${config.dayOfMonth ?? 1} * *`;
    case 'daily':
    default:
      return `0 ${config.hour} * * *`;
  }
}

/**
 * Get the tenant backup config, or null if not configured.
 */
export async function getTenantBackupConfig(
  tenantSlug: string,
): Promise<ITenantBackupConfig | null> {
  return TenantBackupConfig.findOne({ tenantSlug });
}

/**
 * Get all enabled tenant backup configs.
 */
export async function getEnabledTenantBackupConfigs(): Promise<ITenantBackupConfig[]> {
  return TenantBackupConfig.find({ backupEnabled: true });
}

// ── Model Export ────────────────────────────────────────────

export const TenantBackupConfig = mongoose.model<ITenantBackupConfig>(
  'TenantBackupConfig',
  tenantBackupConfigSchema,
);
