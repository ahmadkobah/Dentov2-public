/**
 * Health Check Types — Phase 6 (Monitoring)
 *
 * Per MASTER_PLAN §7 — System health and component status
 * Used by: HealthStatusPage, useHealthStatus
 */

export const HEALTH_STATUSES = ['ok', 'degraded', 'down'] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const COMPONENT_STATUSES = ['up', 'degraded', 'down'] as const;
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

export interface ComponentHealth {
  status: ComponentStatus;
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  version: string;
  environment: string;
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  components: Record<string, ComponentHealth>;
  timestamp: string;
}
