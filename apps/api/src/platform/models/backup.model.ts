import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Backup Tracking Model — Platform Database (dento_platform)
 *
 * Per MASTER_PLAN §34 — Per-Tenant Backup/Restore
 *
 * Tracks all tenant database backups:
 * - Type: scheduled (cron), manual, pre-migration, pre-delete
 * - Status: pending → running → completed/failed
 * - Storage: S3/R2 with gzip compression
 * - Integrity: SHA-256 checksum
 * - Retention: TTL index auto-deletes after retentionDays
 */

// ── Types ───────────────────────────────────────────────────

export interface IBackup extends Document {
  tenantSlug: string;
  type: 'scheduled' | 'manual' | 'pre-migration' | 'pre-delete';
  status: 'pending' | 'running' | 'completed' | 'failed';
  filePath: string | null;
  fileSize: number | null;
  storageBucket: string;
  checksum: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  retentionDays: number;
  expiresAt: Date | null;
  initiatedBy: mongoose.Types.ObjectId | null;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const backupSchema = new Schema<IBackup>(
  {
    tenantSlug: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['scheduled', 'manual', 'pre-migration', 'pre-delete'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    filePath: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    storageBucket: {
      type: String,
      default: 'dento-backups',
    },
    checksum: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    retentionDays: {
      type: Number,
      default: 30,
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }, // TTL index — auto-delete
      default: null,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'backups',
  },
);

// ── Indexes ─────────────────────────────────────────────────

backupSchema.index({ tenantSlug: 1, createdAt: -1 });
backupSchema.index({ status: 1, type: 1 });

// ── Model ───────────────────────────────────────────────────

export const Backup = mongoose.model<IBackup>('Backup', backupSchema);
