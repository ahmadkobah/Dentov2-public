/**
 * Audit Log Types — Phase 6 (Security)
 *
 * Per V2_DATABASE §4.10, SECURITY_AND_ENCRYPTION §10.1
 * Used by: AuditLogsPage, useAuditLogs, audit-logs.route.ts
 */

import type { AuditAction, AuditSensitivity } from '../schemas/audit.schema.js';

export type { AuditAction, AuditSensitivity };

export interface AuditLogEntry {
  _id: string;
  tenantSlug: string;
  actorId: string;
  actorEmail: string;
  actorName?: string;
  actorRole: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  description: string;
  sensitivityLevel: AuditSensitivity;
  status: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogFilters {
  tenantSlug?: string;
  actorId?: string;
  actorEmail?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  sensitivityLevel?: AuditSensitivity;
  status?: 'success' | 'failure';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogStats {
  today: number;
  thisWeek: number;
  byAction: Record<string, number>;
  bySensitivity: Record<string, number>;
  byStatus: Record<string, number>;
}
