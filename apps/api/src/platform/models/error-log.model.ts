import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Error Log Model — Platform Database (dento_platform)
 *
 * Per V2_DATABASE §4.11, MASTER_PLAN §7 — Gap G1
 *
 * Persistent error aggregation with dedup fingerprint.
 * Sentry captures real-time; this provides a searchable
 * MongoDB-backed error log with 90-day TTL.
 *
 * Dedup: MD5(message + stack + source) → increment occurrences
 */

// ── Types ───────────────────────────────────────────────────

export type ErrorLevel = 'error' | 'fatal' | 'warn';
export type ErrorSource = 'api' | 'admin' | 'developer' | 'mobile' | 'worker';

export interface IErrorLog extends Document {
  fingerprint: string;
  level: ErrorLevel;
  message: string;
  stack: string | null;
  source: ErrorSource;
  endpoint: string | null;
  method: string | null;
  statusCode: number | null;
  userId: mongoose.Types.ObjectId | null;
  tenantSlug: string | null;
  requestId: string | null;
  userAgent: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  occurrences: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  resolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const errorLogSchema = new Schema<IErrorLog>(
  {
    fingerprint: {
      type: String,
      required: true,
      unique: true,
    },
    level: {
      type: String,
      enum: ['error', 'fatal', 'warn'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      enum: ['api', 'admin', 'developer', 'mobile', 'worker'],
      required: true,
    },
    endpoint: {
      type: String,
      default: null,
    },
    method: {
      type: String,
      default: null,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tenantSlug: {
      type: String,
      default: null,
    },
    requestId: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    occurrences: {
      type: Number,
      default: 1,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'error_logs',
  },
);

// ── Indexes (per V2_DATABASE §4.11) ────────────────────────

// 1. Unique dedup lookup — already defined inline (unique: true on fingerprint)
// 2. Dashboard filtering: source + level + date
errorLogSchema.index({ source: 1, level: 1, createdAt: -1 });
// 3. Tenant error history
errorLogSchema.index({ tenantSlug: 1, createdAt: -1 });
// 4. Unresolved errors feed
errorLogSchema.index({ resolved: 1, lastSeenAt: -1 });
// 5. TTL index — auto-delete after 90 days
errorLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ── Model Export ────────────────────────────────────────────

export const ErrorLog = mongoose.model<IErrorLog>('ErrorLog', errorLogSchema);
