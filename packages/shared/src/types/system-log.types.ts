/**
 * System Log Types — Phase 6 (Observability)
 *
 * Per MASTER_PLAN §7 — Server-side log viewing
 * Used by: SystemLogsPage, useSystemLogs, system-logs.route.ts
 */

export const SYSTEM_LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
export type SystemLogLevel = (typeof SYSTEM_LOG_LEVELS)[number];

export interface SystemLog {
  _id: string;
  level: SystemLogLevel;
  message: string;
  source: string;
  hostname?: string;
  pid?: number;
  timestamp: string;
  requestId?: string;
  tenantSlug?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
  stack?: string | null;
}

export interface SystemLogFilters {
  level?: SystemLogLevel;
  source?: string;
  tenantSlug?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SystemLogStats {
  totalLogs: number;
  byLevel: { _id: string; count: number }[];
  bySource: { _id: string; count: number }[];
  logTimeline: { _id: string; count: number }[];
  errorRate: number;
}
