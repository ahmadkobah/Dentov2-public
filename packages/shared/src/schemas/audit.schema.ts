/**
 * Audit Log Schemas — Zod Validation
 *
 * Per V2_DATABASE.md §4.10 — audit_logs
 * Per SECURITY_AND_ENCRYPTION.md §10.1 — Audit Logging (Jede Mutation)
 * Per BUILD_RULES §15.4 — Every data mutation MUST be logged
 */

import { z } from 'zod';

// ── Audit Action Enum ───────────────────────────────────────

export const auditActionEnum = z.enum([
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'export',
  'impersonate',
  'config_change',
  'bulk_operation',
  '2fa_setup',
  '2fa_verify',
  '2fa_disable',
]);

// ── Sensitivity Level Enum ──────────────────────────────────

export const auditSensitivityEnum = z.enum(['low', 'medium', 'high', 'critical']);

// ── Audit Log Query Schema ──────────────────────────────────

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  actorId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  action: auditActionEnum.optional(),
  sensitivityLevel: auditSensitivityEnum.optional(),
  status: z.enum(['success', 'failure']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
});

// ── Audit Log Create Schema (internal) ──────────────────────

export const createAuditLogSchema = z.object({
  actorId: z.string(),
  actorEmail: z.string().email().optional(),
  actorRole: z.string(),
  tenantSlug: z.string().optional().nullable(),
  resourceType: z.string(),
  resourceId: z.string().optional(),
  action: auditActionEnum,
  description: z.string().max(500).optional(),
  oldValues: z.record(z.string(), z.unknown()).optional().nullable(),
  newValues: z.record(z.string(), z.unknown()).optional().nullable(),
  changedFields: z.array(z.string()).optional(),
  ipAddress: z.string(),
  userAgent: z.string().max(500).optional(),
  requestId: z.string().optional(),
  sensitivityLevel: auditSensitivityEnum.default('low'),
  status: z.enum(['success', 'failure']).default('success'),
  errorMessage: z.string().optional().nullable(),
});

// ── Inferred Types ──────────────────────────────────────────

export type AuditAction = z.infer<typeof auditActionEnum>;
export type AuditSensitivity = z.infer<typeof auditSensitivityEnum>;
export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
