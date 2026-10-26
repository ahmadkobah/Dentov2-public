/**
 * Deployment Types — Phase 6 (Infrastructure)
 *
 * Per MASTER_PLAN §7 — Deployment tracking and management
 * Used by: DeploymentsPage, useDeployments, deployments.route.ts
 */

export const DEPLOY_STATUSES = [
  'queued',
  'building',
  'deploying',
  'success',
  'failed',
  'cancelled',
  'rolled_back',
] as const;
export type DeployStatus = (typeof DEPLOY_STATUSES)[number];

export const DEPLOY_APPS = ['api', 'admin', 'developer', 'worker'] as const;
export type DeployApp = (typeof DEPLOY_APPS)[number];

export interface Deployment {
  _id: string;
  app: DeployApp;
  version: string;
  commitSha: string;
  commitMessage?: string;
  branch: string;
  status: DeployStatus;
  triggeredBy: string;
  provider: 'railway' | 'vercel' | 'docker' | 'manual';
  providerDeployId?: string;
  environment: 'staging' | 'production';
  duration?: number;
  buildLogs?: string;
  deployLogs?: string;
  rollbackFromId?: string;
  metadata?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentFilters {
  app?: DeployApp;
  status?: DeployStatus;
  environment?: 'staging' | 'production';
  branch?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DeploymentStats {
  totalDeployments: number;
  successRate: number;
  avgDuration: number;
  deploymentsToday: number;
  byApp: { app: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recentFailures: number;
}
