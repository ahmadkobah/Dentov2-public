/**
 * Feature Flag Model — Phase 7
 *
 * Per V2_DATABASE §4.8, PHASE_7_IMPLEMENTATION_PLAN Step 3.3
 *
 * Collection: `feature_flags` in `dento_platform` database.
 * Supports global flags (tenantId = null), tenant-scoped flags,
 * percentage rollout, user targeting, and JSON conditions.
 *
 * Indexes:
 *   - { key: 1, tenantId: 1 } unique — prevents duplicate keys per scope
 *   - { tenantId: 1, enabled: 1 }    — fast tenant-scoped lookups
 *   - { key: 1 }                     — fast key lookups
 */

import mongoose, { Schema, type Document } from 'mongoose';

// ── Interface ───────────────────────────────────────────────

export interface IFeatureFlag extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  name: string;
  description: string;
  tenantId: mongoose.Types.ObjectId | null;
  enabled: boolean;
  percentageRollout: number | null;
  userIds: mongoose.Types.ObjectId[] | null;
  conditions: Record<string, unknown> | null;
  value: unknown | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const featureFlagSchema = new Schema<IFeatureFlag>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      match: /^[a-z][a-z0-9_]*$/,
      maxlength: 100,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    percentageRollout: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    userIds: {
      type: [Schema.Types.ObjectId],
      default: null,
    },
    conditions: {
      type: Schema.Types.Mixed,
      default: null,
    },
    value: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'feature_flags',
    versionKey: false,
  },
);

// ── Indexes ─────────────────────────────────────────────────

featureFlagSchema.index({ key: 1, tenantId: 1 }, { unique: true });
featureFlagSchema.index({ tenantId: 1, enabled: 1 });
featureFlagSchema.index({ key: 1 });

// ── Model ───────────────────────────────────────────────────

export const FeatureFlag = mongoose.model<IFeatureFlag>('FeatureFlag', featureFlagSchema);
