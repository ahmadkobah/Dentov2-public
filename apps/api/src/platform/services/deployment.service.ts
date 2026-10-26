import { Deployment, type DeployStatus, type DeployApp } from '../models/deployment.model.js';
import { logger } from '../../utils/logger.js';

/**
 * Deployment Service — Phase 6 (Gap A1)
 *
 * Per MASTER_PLAN §7.3 — Infrastructure Monitoring
 * Per IMPLEMENTATION_ROADMAP §6 — Deployment tracking
 *
 * Pattern: standalone exported async functions (per error-log.service.ts)
 */

// ── Types ───────────────────────────────────────────────────

export interface DeploymentFilter {
  app?: DeployApp;
  status?: DeployStatus;
  environment?: 'staging' | 'production';
  branch?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ── Service Functions ──────────────────────────────────────

/**
 * List deployments with filters + pagination
 */
export async function listDeployments(filter: DeploymentFilter) {
  const query: Record<string, unknown> = {};

  if (filter.app) query.app = filter.app;
  if (filter.status) query.status = filter.status;
  if (filter.environment) query.environment = filter.environment;
  if (filter.branch) query.branch = filter.branch;

  if (filter.startDate || filter.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filter.startDate) dateFilter.$gte = filter.startDate;
    if (filter.endDate) dateFilter.$lte = filter.endDate;
    query.createdAt = dateFilter;
  }

  const page = filter.page ?? 1;
  const limit = filter.limit ?? 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Deployment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Deployment.countDocuments(query),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single deployment by ID
 */
export async function getDeploymentById(id: string) {
  return Deployment.findById(id).lean();
}

/**
 * Get deployment stats — success rate, avg duration, by-app breakdown
 */
export async function getDeploymentStats() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalDeployments,
    deploymentsToday,
    successCount,
    recentFailures,
    byApp,
    byStatus,
    avgDurationResult,
  ] = await Promise.all([
    Deployment.countDocuments({}),
    Deployment.countDocuments({ createdAt: { $gte: dayAgo } }),
    Deployment.countDocuments({ status: 'success' }),
    Deployment.countDocuments({ status: 'failed', createdAt: { $gte: weekAgo } }),

    // By app
    Deployment.aggregate([
      { $group: { _id: '$app', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // By status
    Deployment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Average duration (only completed deployments)
    Deployment.aggregate([
      { $match: { duration: { $ne: null } } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
    ]),
  ]);

  return {
    totalDeployments,
    deploymentsToday,
    successRate: totalDeployments > 0 ? (successCount / totalDeployments) * 100 : 0,
    avgDuration: avgDurationResult[0]?.avgDuration ?? 0,
    recentFailures,
    byApp: byApp.map((a: { _id: string; count: number }) => ({ app: a._id, count: a.count })),
    byStatus: byStatus.map((s: { _id: string; count: number }) => ({
      status: s._id,
      count: s.count,
    })),
  };
}

/**
 * Trigger rollback — creates a new deployment entry marked as rollback
 */
export async function triggerRollback(id: string, triggeredBy: string) {
  const original = await Deployment.findById(id).lean();
  if (!original) return null;

  const rollback = await Deployment.create({
    app: original.app,
    version: original.version,
    commitSha: original.commitSha,
    commitMessage: `Rollback to ${original.version} (${original.commitSha.slice(0, 7)})`,
    branch: original.branch,
    status: 'queued',
    triggeredBy,
    provider: original.provider,
    environment: original.environment,
    rollbackFromId: original._id,
    startedAt: new Date(),
  });

  logger.info({
    msg: 'Deployment rollback triggered',
    originalId: id,
    rollbackId: rollback._id,
    app: original.app,
    version: original.version,
    triggeredBy,
  });

  return rollback.toObject();
}
