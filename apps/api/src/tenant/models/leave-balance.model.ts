import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Leave Balance Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §9.3
 * Tracks yearly leave allowance, usage, and carry-forward per user per leave type.
 */

// ── Types ───────────────────────────────────────────────────

export interface ILeaveBalance extends Document {
  userId: Types.ObjectId;
  leaveTypeId: Types.ObjectId;
  year: number; // e.g. 2026
  totalAllowance: number;
  usedDays: number;
  remainingDays: number; // computed: totalAllowance + carriedForward - usedDays
  carriedForward: number;

  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const leaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    year: { type: Number, required: true },
    totalAllowance: { type: Number, required: true, min: 0 },
    usedDays: { type: Number, default: 0, min: 0 },
    remainingDays: { type: Number, required: true, min: 0 },
    carriedForward: { type: Number, default: 0, min: 0 },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

leaveBalanceSchema.index({ userId: 1, leaveTypeId: 1, year: 1 }, { unique: true });
leaveBalanceSchema.index({ userId: 1, year: 1 });

// ── Model Factory ───────────────────────────────────────────

export function getLeaveBalanceModel(connection: Connection): Model<ILeaveBalance> {
  return (connection.models.LeaveBalance ||
    connection.model('LeaveBalance', leaveBalanceSchema)) as Model<ILeaveBalance>;
}

export type LeaveBalanceModel = ReturnType<typeof getLeaveBalanceModel>;
