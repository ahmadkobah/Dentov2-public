import mongoose, { Schema, type Document, type Types } from 'mongoose';

/**
 * Tenant Module Model — Platform Database (dento_platform)
 *
 * Per MASTER_PLAN §24 — Module Versioning System
 *
 * Tracks which modules each tenant has installed, their version,
 * update policy, canary status, and price overrides.
 *
 * Stored in dento_platform DB — NOT in tenant DBs (platform-wide visibility).
 */

// ── Types ───────────────────────────────────────────────────

export interface IUpdateHistoryEntry {
  from: string;
  to: string;
  at: Date;
  status: 'success' | 'failed' | 'rolled_back';
  error?: string;
}

export interface ITenantModule extends Document {
  tenantId: Types.ObjectId;
  moduleSlug: string;
  installedVersion: string;
  availableVersion: string;
  updatePolicy: 'auto' | 'manual' | 'pinned';
  pinnedVersion: string | null;
  isCanary: boolean;

  // Per-tenant pricing override (§28 cross-ref)
  priceOverride: number | null;
  discountPercent: number;
  discountExpiresAt: Date | null;

  // History
  updateHistory: IUpdateHistoryEntry[];

  // Metadata
  installedAt: Date;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-Schemas ─────────────────────────────────────────────

const updateHistorySchema = new Schema<IUpdateHistoryEntry>(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['success', 'failed', 'rolled_back'],
      required: true,
    },
    error: { type: String },
  },
  { _id: false },
);

// ── TenantModule Schema ─────────────────────────────────────

const tenantModuleSchema = new Schema<ITenantModule>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    moduleSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    installedVersion: {
      type: String,
      required: true,
    },
    availableVersion: {
      type: String,
      required: true,
    },
    updatePolicy: {
      type: String,
      enum: ['auto', 'manual', 'pinned'],
      default: 'auto',
    },
    pinnedVersion: {
      type: String,
      default: null,
    },
    isCanary: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ── Per-tenant pricing override (§28 cross-ref) ─────
    priceOverride: {
      type: Number,
      default: null,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountExpiresAt: {
      type: Date,
      default: null,
    },

    // ── History ─────────────────────────────────────────
    updateHistory: {
      type: [updateHistorySchema],
      default: [],
    },

    // ── Tracking ────────────────────────────────────────
    installedAt: {
      type: Date,
      default: Date.now,
    },

    // ── Standard Fields ─────────────────────────────────
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
    collection: 'tenant_modules',
  },
);

// ── Indexes ─────────────────────────────────────────────────
// One module per tenant (unique pair)
tenantModuleSchema.index({ tenantId: 1, moduleSlug: 1 }, { unique: true });
tenantModuleSchema.index({ moduleSlug: 1, isCanary: 1 });
tenantModuleSchema.index({ moduleSlug: 1, installedVersion: 1 });

// ── Model ───────────────────────────────────────────────────
export const TenantModule = mongoose.model<ITenantModule>('TenantModule', tenantModuleSchema);
