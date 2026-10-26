import mongoose, { Schema, type Document } from 'mongoose';

/**
 * API Key Model — Platform Database (dento_platform)
 *
 * Per SECURITY_AND_ENCRYPTION.md §6.2 — API Key Security:
 *
 * - Keys generated with nanoid(48) → dento_live_... / dento_test_...
 * - Stored as SHA-256 hash (NEVER plaintext)
 * - Plaintext shown ONCE at creation
 * - Visible in UI: prefix + "..." + last 4 chars only
 * - Per-key configurable rate limits (default 1000 req/min)
 */

// ── Types ───────────────────────────────────────────────────

export interface IApiKeyDoc extends Document {
  name: string;
  tenantId: mongoose.Types.ObjectId;
  scope: 'live' | 'test';
  permissions: Array<'read' | 'write' | 'admin'>;
  keyPrefix: string;
  keyHash: string; // SHA-256 hash
  keySuffix: string; // Last 4 chars
  rateLimitMax: number;
  rateLimitWindow: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApiKeyUsageDoc extends Document {
  apiKeyId: mongoose.Types.ObjectId;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ip: string;
  userAgent: string;
  timestamp: Date;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
}

// ── API Key Schema ──────────────────────────────────────────

const apiKeySchema = new Schema<IApiKeyDoc>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ['live', 'test'],
      required: true,
    },
    permissions: {
      type: [String],
      enum: ['read', 'write', 'admin'],
      default: ['read'],
    },

    // ── Security (SHA-256 hashing) ──────────────────────
    keyPrefix: {
      type: String,
      required: true,
    },
    keyHash: {
      type: String,
      required: true,
    },
    keySuffix: {
      type: String,
      required: true,
    },

    // ── Rate Limiting ───────────────────────────────────
    rateLimitMax: {
      type: Number,
      default: 1000,
      min: 1,
      max: 10000,
    },
    rateLimitWindow: {
      type: String,
      default: '1 minute',
    },

    // ── Status ──────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },

    // ── Audit ───────────────────────────────────────────
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'api_keys',
  },
);

// ── Indexes ─────────────────────────────────────────────────

apiKeySchema.index({ tenantId: 1, isActive: 1 });
apiKeySchema.index({ keyHash: 1 }, { unique: true });

// ── API Key Usage Schema ────────────────────────────────────

const apiKeyUsageSchema = new Schema<IApiKeyUsageDoc>(
  {
    apiKeyId: {
      type: Schema.Types.ObjectId,
      ref: 'ApiKey',
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true },
    responseTimeMs: { type: Number, default: 0 },
    ip: { type: String, required: true },
    userAgent: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    collection: 'api_key_usage',
  },
);

// TTL: auto-delete usage logs after 90 days
apiKeyUsageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
apiKeyUsageSchema.index({ apiKeyId: 1, timestamp: -1 });

// ── Models ──────────────────────────────────────────────────

export const ApiKey = mongoose.model<IApiKeyDoc>('ApiKey', apiKeySchema);
export const ApiKeyUsage = mongoose.model<IApiKeyUsageDoc>('ApiKeyUsage', apiKeyUsageSchema);
