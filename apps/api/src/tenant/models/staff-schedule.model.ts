import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Staff Schedule Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §9.1 + MASTER_PLAN §22
 * Scheduling for non-doctor staff (receptionist, nurse, etc.)
 * Separate from doctor_schedules (which affect booking).
 */

// ── Types ───────────────────────────────────────────────────

export type StaffScheduleStatus = 'scheduled' | 'confirmed' | 'swapped' | 'cancelled';

export interface IStaffSchedule extends Document {
  userId: Types.ObjectId;
  branchId: Types.ObjectId;
  shiftTemplateId: Types.ObjectId | null;
  scheduleDate: Date;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  role: string; // copied from user.role at creation
  status: StaffScheduleStatus;
  isPublished: boolean;
  isRamadanSchedule: boolean;
  notes: string | null;

  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const staffScheduleSchema = new Schema<IStaffSchedule>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    shiftTemplateId: { type: Schema.Types.ObjectId, ref: 'ShiftTemplate', default: null },
    scheduleDate: { type: Date, required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakStart: { type: String, default: null },
    breakEnd: { type: String, default: null },
    role: { type: String, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'swapped', 'cancelled'],
      default: 'scheduled',
    },
    isPublished: { type: Boolean, default: false },
    isRamadanSchedule: { type: Boolean, default: false },
    notes: { type: String, default: null },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

staffScheduleSchema.index({ userId: 1, branchId: 1, dayOfWeek: 1 });
staffScheduleSchema.index({ branchId: 1, scheduleDate: 1 });
staffScheduleSchema.index({ isPublished: 1, branchId: 1 });

// ── Model Factory ───────────────────────────────────────────

export function getStaffScheduleModel(connection: Connection): Model<IStaffSchedule> {
  return (connection.models.StaffSchedule ||
    connection.model('StaffSchedule', staffScheduleSchema)) as Model<IStaffSchedule>;
}

export type StaffScheduleModel = ReturnType<typeof getStaffScheduleModel>;
