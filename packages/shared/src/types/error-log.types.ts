/**
 * Error Log Types — Phase 6 (Monitoring)
 *
 * Per V2_DATABASE §4.11, MASTER_PLAN §7
 * Used by: MonitoringPage, useErrorLogs, error-logs.route.ts
 */

export const ERROR_LOG_LEVELS = ['error', 'fatal', 'warn'] as const;
export type ErrorLogLevel = (typeof ERROR_LOG_LEVELS)[number];

export const ERROR_LOG_SOURCES = ['api', 'admin', 'developer', 'mobile', 'worker'] as const;
export type ErrorLogSource = (typeof ERROR_LOG_SOURCES)[number];

export interface ErrorLog {
  _id: string;
  fingerprint: string;
  level: ErrorLogLevel;
  message: string;
  stack: string | null;
  source: ErrorLogSource;
  endpoint: string | null;
  method: string | null;
  statusCode: number | null;
  userId: string | null;
  tenantSlug: string | null;
  requestId: string | null;
  userAgent: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorLogFilters {
  source?: ErrorLogSource;
  level?: ErrorLogLevel;
  tenantSlug?: string;
  resolved?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ErrorStats {
  totalErrors: number;
  unresolvedCount: number;
  bySource: { _id: string; count: number; unique: number }[];
  byLevel: { _id: string; count: number }[];
  timeline: { _id: string; count: number }[];
  window: string;
}
