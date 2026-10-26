import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Doctor Schedule Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §6.3 + MASTER_PLAN §22
 * Standalone collection replacing embedded doctor.schedules[].
 *
 * Supports two types:
 * - recurring: Weekly repeating schedule (dayOfWeek based)
 * - override: One-off schedule for a specific date
 */

// ── Types ───────────────────────────────────────────────────

export type ScheduleType = 'recurring' | 'override';

export interface IDoctorSchedule extends Document {
  doctorId: Types.ObjectId;
  branchId: Types.ObjectId;
  scheduleType: ScheduleType;
  dayOfWeek: number | null; // 0-6 (Sunday-Saturday), only for recurring
  specificDate: Date | null; // only for override
  startTime: string; // HH:mm
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  slotDuration: number; // minutes (default: 30)
  isAvailable: boolean;
  isRamadanSchedule: boolean;
  notes: string | null;

  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const doctorScheduleSchema = new Schema<IDoctorSchedule>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    scheduleType: {
      type: String,
      enum: ['recurring', 'override'],
      required: true,
      default: 'recurring',
    },
    dayOfWeek: { type: Number, min: 0, max: 6, default: null },
    specificDate: { type: Date, default: null },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakStart: { type: String, default: null },
    breakEnd: { type: String, default: null },
    slotDuration: { type: Number, default: 30, min: 5 },
    isAvailable: { type: Boolean, default: true },
    isRamadanSchedule: { type: Boolean, default: false },
    notes: { type: String, default: null },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

doctorScheduleSchema.index({ doctorId: 1, branchId: 1, dayOfWeek: 1 });
doctorScheduleSchema.index({ doctorId: 1, specificDate: 1 });
doctorScheduleSchema.index({ branchId: 1, isActive: 1 });

// ── Model Factory ───────────────────────────────────────────

export function getDoctorScheduleModel(connection: Connection): Model<IDoctorSchedule> {
  return (connection.models.DoctorSchedule ||
    connection.model('DoctorSchedule', doctorScheduleSchema)) as Model<IDoctorSchedule>;
}

export type DoctorScheduleModel = ReturnType<typeof getDoctorScheduleModel>;
