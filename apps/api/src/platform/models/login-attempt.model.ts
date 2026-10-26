import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Login Attempt Model — Platform Database (dento_platform)
 *
 * Per V2_DATABASE §4.10, MASTER_PLAN §27 — Gap G4
 *
 * Persistent tracking of login attempts alongside Redis.
 * - Redis: ephemeral, speed-first brute-force detection
 * - MongoDB: persistent 90-day audit trail for compliance
 *
 * Dual-write: brute-force.ts writes to both Redis + this collection.
 */

// ── Types ───────────────────────────────────────────────────

export type LoginFailReason =
  | 'invalid_credentials'
  | 'invalid_password'
  | 'user_not_found'
  | 'account_locked'
  | '2fa_failed'
  | 'rate_limited'
  | 'session_limit';

export interface ILoginAttempt extends Document {
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failReason: LoginFailReason | null;
  tenantSlug: string | null;
  userId: mongoose.Types.ObjectId | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const loginAttemptSchema = new Schema<ILoginAttempt>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    success: {
      type: Boolean,
      required: true,
    },
    failReason: {
      type: String,
      enum: [
        'invalid_credentials',
        'invalid_password',
        'user_not_found',
        'account_locked',
        '2fa_failed',
        'rate_limited',
        'session_limit',
        null,
      ],
      default: null,
    },
    tenantSlug: {
      type: String,
      default: null,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'login_attempts',
  },
);

// ── Indexes (per V2_DATABASE §4.10) ────────────────────────

// 1. Per-email attempt history
loginAttemptSchema.index({ email: 1, createdAt: -1 });
// 2. Per-IP tracking
loginAttemptSchema.index({ ipAddress: 1, createdAt: -1 });
// 3. TTL index — auto-delete after 90 days
loginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// 4. Success + date for audit dashboards
loginAttemptSchema.index({ success: 1, createdAt: -1 });

// ── Model Export ────────────────────────────────────────────

export const LoginAttempt = mongoose.model<ILoginAttempt>('LoginAttempt', loginAttemptSchema);
