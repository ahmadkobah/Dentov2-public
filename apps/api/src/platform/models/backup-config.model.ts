import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Backup Config Model — Platform Database (dento_platform)
 *
 * Per V2_DATABASE §4.13, MASTER_PLAN §34 — Gap G7
 *
 * Singleton document (_id = 'default') storing global backup configuration:
 * - Schedule (cron expression)
 * - Retention policy
 * - Encryption settings
 * - Storage provider configuration
 * - Last backup / restore test timestamps
 */

// ── Types ───────────────────────────────────────────────────

export interface IBackupConfig extends Document<string> {
  _id: string;
  scheduleEnabled: boolean;
  scheduleCron: string;
  retentionDays: number;
  encryptionEnabled: boolean;
  storageProvider: 's3' | 'r2';
  bucket: string;
  region: string;
  maxBackupSizeGB: number;
  notifyOnFailure: boolean;
  notifyEmail: string | null;
  lastBackupAt: Date | null;
  lastRestoreTestAt: Date | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const backupConfigSchema = new Schema<IBackupConfig>(
  {
    _id: {
      type: String,
      default: 'default',
    },
    scheduleEnabled: {
      type: Boolean,
      default: true,
    },
    scheduleCron: {
      type: String,
      default: '0 3 * * *', // 03:00 daily
    },
    retentionDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365,
    },
    encryptionEnabled: {
      type: Boolean,
      default: true,
    },
    storageProvider: {
      type: String,
      enum: ['s3', 'r2'],
      default: 'r2',
    },
    bucket: {
      type: String,
      default: 'dento-backups',
    },
    region: {
      type: String,
      default: 'auto',
    },
    maxBackupSizeGB: {
      type: Number,
      default: 10,
    },
    notifyOnFailure: {
      type: Boolean,
      default: true,
    },
    notifyEmail: {
      type: String,
      default: null,
    },
    lastBackupAt: {
      type: Date,
      default: null,
    },
    lastRestoreTestAt: {
      type: Date,
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    _id: false, // Use our custom string _id
    timestamps: true,
    collection: 'backup_config',
  },
);

// ── Singleton Helper ────────────────────────────────────────

/**
 * Get (or create) the singleton backup config document.
 */
export async function getBackupConfig(): Promise<IBackupConfig> {
  let config = await BackupConfig.findById('default');
  if (!config) {
    config = await BackupConfig.create({ _id: 'default' });
  }
  return config;
}

// ── Model Export ────────────────────────────────────────────

export const BackupConfig = mongoose.model<IBackupConfig>('BackupConfig', backupConfigSchema);
