import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Deployment Model — Platform Database (dento_platform)
 *
 * Per MASTER_PLAN §7.3 — Infrastructure Monitoring
 * Per IMPLEMENTATION_ROADMAP §6 — Deployment tracking
 *
 * Tracks deployment history across all apps (api, admin, developer, worker).
 * TTL: 180 days — auto-cleanup of old deployment records.
 */

// ── Types ───────────────────────────────────────────────────

export type DeployStatus =
  | 'queued'
  | 'building'
  | 'deploying'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'rolled_back';

export type DeployApp = 'api' | 'admin' | 'developer' | 'worker';

export interface IDeployment extends Document {
  app: DeployApp;
  version: string;
  commitSha: string;
  commitMessage: string | null;
  branch: string;
  status: DeployStatus;
  triggeredBy: string;
  provider: 'railway' | 'vercel' | 'docker' | 'manual';
  providerDeployId: string | null;
  environment: 'staging' | 'production';
  duration: number | null;
  buildLogs: string | null;
  deployLogs: string | null;
  rollbackFromId: mongoose.Types.ObjectId | null;
  metadata: Record<string, unknown> | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const deploymentSchema = new Schema<IDeployment>(
  {
    app: {
      type: String,
      enum: ['api', 'admin', 'developer', 'worker'],
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    commitSha: {
      type: String,
      required: true,
    },
    commitMessage: {
      type: String,
      default: null,
    },
    branch: {
      type: String,
      required: true,
      default: 'main',
    },
    status: {
      type: String,
      enum: ['queued', 'building', 'deploying', 'success', 'failed', 'cancelled', 'rolled_back'],
      required: true,
      default: 'queued',
    },
    triggeredBy: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ['railway', 'vercel', 'docker', 'manual'],
      required: true,
    },
    providerDeployId: {
      type: String,
      default: null,
    },
    environment: {
      type: String,
      enum: ['staging', 'production'],
      required: true,
    },
    duration: {
      type: Number,
      default: null,
    },
    buildLogs: {
      type: String,
      default: null,
    },
    deployLogs: {
      type: String,
      default: null,
    },
    rollbackFromId: {
      type: Schema.Types.ObjectId,
      ref: 'Deployment',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'deployments',
  },
);

// ── Indexes ─────────────────────────────────────────────────

// 1. App + date for filtered listing
deploymentSchema.index({ app: 1, createdAt: -1 });
// 2. Environment + status for dashboard
deploymentSchema.index({ environment: 1, status: 1 });
// 3. Branch lookup
deploymentSchema.index({ branch: 1, createdAt: -1 });
// 4. TTL: 180 days auto-cleanup
deploymentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

// ── Model Export ────────────────────────────────────────────

export const Deployment = mongoose.model<IDeployment>('Deployment', deploymentSchema);
