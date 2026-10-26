import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Support Session Model — Platform Database (dento_platform)
 *
 * Per MASTER_PLAN §9 — Tenant Impersonation
 *
 * Tracks impersonation sessions: who impersonated, which tenant,
 * temporary JWT, actions performed, and expiry tracking.
 *
 * Security: 60-minute max, all actions logged, JWT revocation via Redis.
 */

// ── Types ───────────────────────────────────────────────────

export interface ISessionAction {
  timestamp: Date;
  method: string;
  path: string;
  description?: string;
}

export interface ISupportSessionDoc extends Document {
  sessionId: string;
  performedBy: {
    userId: string;
    email: string;
    name: string;
  };
  tenantSlug: string;
  tenantName: string;
  status: 'active' | 'ended' | 'expired' | 'revoked';
  startedAt: Date;
  endedAt: Date | null;
  expiresAt: Date;
  reason: string;
  linkedTicketId: string | null;
  tempToken: string;
  tokenJti: string;
  tailscaleKeyId: string | null;
  actionsPerformed: ISessionAction[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-Schemas ─────────────────────────────────────────────

const performerSchema = new Schema(
  {
    userId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
);

const actionSchema = new Schema<ISessionAction>(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    method: { type: String, required: true },
    path: { type: String, required: true },
    description: { type: String },
  },
  { _id: false },
);

// ── Support Session Schema ──────────────────────────────────

const supportSessionSchema = new Schema<ISupportSessionDoc>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    performedBy: {
      type: performerSchema,
      required: true,
    },
    tenantSlug: {
      type: String,
      required: true,
      index: true,
    },
    tenantName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'ended', 'expired', 'revoked'],
      default: 'active',
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    linkedTicketId: {
      type: String,
      default: null,
    },
    tempToken: {
      type: String,
      required: true,
    },
    tokenJti: {
      type: String,
      required: true,
      unique: true,
    },
    tailscaleKeyId: {
      type: String,
      default: null,
    },
    actionsPerformed: {
      type: [actionSchema],
      default: [],
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
    collection: 'support_sessions',
  },
);

// ── Indexes ─────────────────────────────────────────────────
supportSessionSchema.index({ 'performedBy.userId': 1, status: 1 });
supportSessionSchema.index({ tenantSlug: 1, status: 1 });
supportSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 }); // TTL: cleanup 24h after expiry

// ── Model ───────────────────────────────────────────────────
export const SupportSession = mongoose.model<ISupportSessionDoc>(
  'SupportSession',
  supportSessionSchema,
);
