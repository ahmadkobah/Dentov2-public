/**
 * Audit Log Model — Platform Database (dento_platform)
 *
 * Per V2_DATABASE.md §4.10 — audit_logs — Alle Mutations geloggt
 * Per SECURITY_AND_ENCRYPTION.md §10.1 — Audit Logging (Jede Mutation)
 * Per BUILD_RULES §15.4 — Every data mutation MUST be logged, append-only
 *
 * Fields include tenantId/tenantSlug for cross-tenant querying.
 * TTL: 730 days (2 years, HIPAA-konform)
 */

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'impersonate'
  | 'config_change'
  | 'bulk_operation'
  | '2fa_setup'
  | '2fa_verify'
  | '2fa_disable';

export type AuditSensitivity = 'low' | 'medium' | 'high' | 'critical';

export interface IAuditLog extends Document {
  // Who
  actorId: Types.ObjectId;
  actorEmail: string;
  actorRole: string;

  // Where
  tenantId: Types.ObjectId | null;
  tenantSlug: string | null;

  // What
  resourceType: string;
  resourceId: string;
  action: AuditAction;
  description: string;

  // Diff
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[];

  // Context
  ipAddress: string;
  userAgent: string;
  requestId: string;

  // Sensitivity
  sensitivityLevel: AuditSensitivity;
  status: 'success' | 'failure';
  errorMessage: string | null;

  createdAt: Date;
}

export type AuditLogModel = Model<IAuditLog>;

// ── Schema ──────────────────────────────────────────────────

const auditLogSchema = new Schema<IAuditLog>(
  {
    // Who
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorEmail: { type: String, default: '' },
    actorRole: { type: String, required: true },

    // Where
    tenantId: { type: Schema.Types.ObjectId, default: null },
    tenantSlug: { type: String, default: null },

    // What
    resourceType: { type: String, required: true },
    resourceId: { type: String, default: '' },
    action: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    description: { type: String, default: '' },

    // Diff
    oldValues: { type: Schema.Types.Mixed, default: null },
    newValues: { type: Schema.Types.Mixed, default: null },
    changedFields: [{ type: String }],

    // Context
    ipAddress: { type: String, required: true },
    userAgent: { type: String, default: '' },
    requestId: { type: String, default: '' },

    // Sensitivity
    sensitivityLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
    },
    errorMessage: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only — no updatedAt
    collection: 'audit_logs',
  },
);

// ── Indexes — per V2_DATABASE.md §4.10 ─────────────────────

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ sensitivityLevel: 1, createdAt: -1 });

// TTL: 730 days (2 years, HIPAA)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 730 * 24 * 60 * 60 });

// ── WeakMap Cache ───────────────────────────────────────────

const cache = new WeakMap<Connection, AuditLogModel>();

export function getAuditLogModel(conn: Connection): AuditLogModel {
  if (cache.has(conn)) return cache.get(conn)!;
  const model = conn.model<IAuditLog>('AuditLog', auditLogSchema);
  cache.set(conn, model);
  return model;
}
