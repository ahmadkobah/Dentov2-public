/**
 * SaaS Dunning Log Model — Platform
 *
 * Per V2_DATABASE DEEP_SCAN_GAPS_REPORT — P1 #9
 *
 * Collection: `saas_dunning_logs` in `dento_platform` database.
 * Tracks payment dunning reminders sent to overdue tenants.
 */

import mongoose, { Schema, type Document } from 'mongoose';

// ── Interface ───────────────────────────────────────────────

export type DunningChannel = 'email' | 'sms' | 'whatsapp' | 'inApp';
export type DunningStatus = 'sent' | 'delivered' | 'failed' | 'bounced';
export type EscalationLevel = 'reminder' | 'warning' | 'final_notice' | 'suspension';

export interface IDunningLog extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId | null;
  attempt: number;
  channel: DunningChannel;
  sentAt: Date;
  status: DunningStatus;
  nextRetryAt: Date | null;
  escalationLevel: EscalationLevel;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const dunningLogSchema = new Schema<IDunningLog>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'SaaSPayment',
      default: null,
    },
    attempt: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    channel: {
      type: String,
      required: true,
      enum: ['email', 'sms', 'whatsapp', 'inApp'],
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      required: true,
      enum: ['sent', 'delivered', 'failed', 'bounced'],
      default: 'sent',
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    escalationLevel: {
      type: String,
      required: true,
      enum: ['reminder', 'warning', 'final_notice', 'suspension'],
      default: 'reminder',
    },
    error: {
      type: String,
      default: null,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: 'saas_dunning_logs',
    versionKey: false,
  },
);

// ── Indexes ─────────────────────────────────────────────────

dunningLogSchema.index({ tenantId: 1, sentAt: -1 });
dunningLogSchema.index({ invoiceId: 1 });
dunningLogSchema.index({ status: 1, nextRetryAt: 1 });
dunningLogSchema.index({ escalationLevel: 1 });

// ── Model ───────────────────────────────────────────────────

export const DunningLog = mongoose.model<IDunningLog>('DunningLog', dunningLogSchema);
