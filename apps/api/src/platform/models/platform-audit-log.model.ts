/**
 * Platform Audit Log Model — Platform
 *
 * Per HIPAA §164.312(b) — audit controls for ePHI/PII access.
 * Per SECURITY_AND_ENCRYPTION.md §10.1 — append-only audit logging.
 *
 * Collection: `platform_audit_logs` in `dento_platform` database.
 *
 * Records every platform-user action that touches a tenant's data
 * (e.g. reading or modifying a SaaS invoice, impersonating, exporting
 * tenant data). Append-only — never updated or deleted.
 */

import mongoose, { Schema, type Document } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export type PlatformAuditAction =
  | 'platform.invoice.read'
  | 'platform.invoice.list'
  | 'platform.invoice.create'
  | 'platform.invoice.update'
  | 'platform.invoice.issue'
  | 'platform.invoice.cancel'
  | 'platform.invoice.delete'
  | 'platform.tenant.read'
  | 'platform.tenant.update'
  | 'platform.tenant.suspend'
  | 'platform.tenant.impersonate'
  | 'platform.user.read'
  | 'platform.user.update';

export interface IPlatformAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId | null;
  action: PlatformAuditAction | string;
  targetType: string;
  targetId: string | null;
  tenantId: mongoose.Types.ObjectId | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const platformAuditLogSchema = new Schema<IPlatformAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, default: null },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { collection: 'platform_audit_logs', versionKey: false },
);

platformAuditLogSchema.index({ actorId: 1, createdAt: -1 });
platformAuditLogSchema.index({ tenantId: 1, createdAt: -1 });
platformAuditLogSchema.index({ action: 1, createdAt: -1 });

// Block updates/deletes at the schema level — append-only invariant.
// Mongoose 9 pre-hooks abort by throwing instead of calling a `next` callback.
platformAuditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function () {
  throw new Error('Platform audit logs are append-only and cannot be modified');
});
platformAuditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  throw new Error('Platform audit logs are append-only and cannot be deleted');
});

export const PlatformAuditLog =
  (mongoose.models.PlatformAuditLog as mongoose.Model<IPlatformAuditLog>) ||
  mongoose.model<IPlatformAuditLog>('PlatformAuditLog', platformAuditLogSchema);
