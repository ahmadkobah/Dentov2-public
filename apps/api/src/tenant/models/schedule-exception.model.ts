import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Schedule Exception Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §6.3 + MASTER_PLAN §22
 * Standalone collection replacing embedded doctor.exceptions[].
 *
 * Covers: vacation, sick_leave, day_off, conference, special_hours, other.
 * 'special_hours' overrides normal schedule times (doesn't block).
 * All other types block the slot engine.
 */

// ── Types ───────────────────────────────────────────────────

export type ExceptionType =
  | 'vacation'
  | 'sick_leave'
  | 'day_off'
  | 'conference'
  | 'special_hours'
  | 'other';

export type ExceptionStatus = 'pending' | 'approved' | 'rejected';

export interface IScheduleException extends Document {
  doctorId: Types.ObjectId;
  branchId: Types.ObjectId | null; // null = ALL branches
  exceptionType: ExceptionType;
  startDate: Date;
  endDate: Date; // ≥ startDate
  isFullDay: boolean;
  specialStartTime: string | null; // only for 'special_hours'
  specialEndTime: string | null;
  reason: string | null;
  status: ExceptionStatus;
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

const scheduleExceptionSchema = new Schema<IScheduleException>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    exceptionType: {
      type: String,
      enum: ['vacation', 'sick_leave', 'day_off', 'conference', 'special_hours', 'other'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isFullDay: { type: Boolean, default: true },
    specialStartTime: { type: String, default: null },
    specialEndTime: { type: String, default: null },
    reason: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
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

scheduleExceptionSchema.index({ doctorId: 1, startDate: 1, endDate: 1 });
scheduleExceptionSchema.index({ status: 1, startDate: 1 });
scheduleExceptionSchema.index({ branchId: 1, startDate: 1 });

// ── Model Factory ───────────────────────────────────────────

export function getScheduleExceptionModel(connection: Connection): Model<IScheduleException> {
  return (connection.models.ScheduleException ||
    connection.model('ScheduleException', scheduleExceptionSchema)) as Model<IScheduleException>;
}

export type ScheduleExceptionModel = ReturnType<typeof getScheduleExceptionModel>;
