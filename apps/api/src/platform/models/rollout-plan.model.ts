import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Rollout Plan Model — Platform Database (dento_platform)
 *
 * Per MASTER_PLAN §24 — Canary Rollout System
 *
 * Tracks staged rollouts: Canary 5% → Rolling 25% → 50% → 100%
 * with automatic rollback if error rate exceeds threshold.
 *
 * Flow:
 *   Developer pushes v2.1.0
 *     → Canary (5% of tenants with isCanary=true)
 *     → 24h Monitoring (Error Rate < 1%?)
 *       → YES: Rolling 25% → 50% → 100%
 *       → NO:  Auto-Rollback to previous version
 */

// ── Types ───────────────────────────────────────────────────

export interface IRolloutStageEntry {
  stage: 'canary' | 'rolling_25' | 'rolling_50' | 'rolling_100';
  startedAt: Date;
  completedAt: Date | null;
  tenantsAffected: number;
  errorRate: number;
}

export interface IRolloutPlan extends Document {
  moduleSlug: string;
  fromVersion: string;
  toVersion: string;
  stage: 'canary' | 'rolling_25' | 'rolling_50' | 'rolling_100' | 'completed' | 'rolled_back';
  canaryPercent: number;
  errorRateThreshold: number; // Max acceptable error rate (%)
  monitoringHours: number;
  startedAt: Date;
  completedAt: Date | null;
  rolledBackAt: Date | null;
  rollbackReason: string | null;
  stages: IRolloutStageEntry[];
  initiatedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-Schemas ─────────────────────────────────────────────

const rolloutStageEntrySchema = new Schema<IRolloutStageEntry>(
  {
    stage: {
      type: String,
      enum: ['canary', 'rolling_25', 'rolling_50', 'rolling_100'],
      required: true,
    },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    tenantsAffected: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
  },
  { _id: false },
);

// ── RolloutPlan Schema ──────────────────────────────────────

const rolloutPlanSchema = new Schema<IRolloutPlan>(
  {
    moduleSlug: {
      type: String,
      required: true,
      index: true,
    },
    fromVersion: {
      type: String,
      required: true,
    },
    toVersion: {
      type: String,
      required: true,
    },
    stage: {
      type: String,
      enum: ['canary', 'rolling_25', 'rolling_50', 'rolling_100', 'completed', 'rolled_back'],
      default: 'canary',
      index: true,
    },
    canaryPercent: {
      type: Number,
      default: 5,
      min: 1,
      max: 50,
    },
    errorRateThreshold: {
      type: Number,
      default: 1.0, // 1%
      min: 0.1,
      max: 100,
    },
    monitoringHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168, // 1 week max
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    rolledBackAt: {
      type: Date,
      default: null,
    },
    rollbackReason: {
      type: String,
      default: null,
    },
    stages: {
      type: [rolloutStageEntrySchema],
      default: [],
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    collection: 'rollout_plans',
  },
);

// ── Indexes ─────────────────────────────────────────────────
rolloutPlanSchema.index({ moduleSlug: 1, stage: 1 });
rolloutPlanSchema.index({ moduleSlug: 1, createdAt: -1 });

// ── Model ───────────────────────────────────────────────────
export const RolloutPlan = mongoose.model<IRolloutPlan>('RolloutPlan', rolloutPlanSchema);
