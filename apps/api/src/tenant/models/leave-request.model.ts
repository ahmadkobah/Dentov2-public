import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * Leave Request Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §9.3 + MASTER_PLAN §22
 * Leave-Request create + review/approve flow.
 * Approved leave auto-creates schedule_exceptions.
 */

// ── Types ───────────────────────────────────────────────────

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ILeaveAttachment {
  name: string;
  url: string;
}

export interface ILeaveRequest extends Document {
  userId: Types.ObjectId; // Doctor or Staff
  leaveTypeId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string | null;
  attachments: ILeaveAttachment[];
  status: LeaveRequestStatus;
  approvedBy: Types.ObjectId | null;
  approvedAt: Date | null;
  rejectionReason: string | null;

  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const leaveAttachmentSchema = new Schema<ILeaveAttachment>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true, min: 0.5 },
    reason: { type: String, default: null },
    attachments: { type: [leaveAttachmentSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

leaveRequestSchema.index({ userId: 1, status: 1, startDate: -1 });
leaveRequestSchema.index({ status: 1, startDate: 1 });
// ── Field-Level Encryption (HIPAA/GDPR — C-1 Tier-2) ──────────────
leaveRequestSchema.plugin(fieldEncryptionPlugin, {
  fields: ['reason', 'rejectionReason'],
});
// ── Model Factory ───────────────────────────────────────────

export function getLeaveRequestModel(connection: Connection): Model<ILeaveRequest> {
  return (connection.models.LeaveRequest ||
    connection.model('LeaveRequest', leaveRequestSchema)) as Model<ILeaveRequest>;
}

export type LeaveRequestModel = ReturnType<typeof getLeaveRequestModel>;
