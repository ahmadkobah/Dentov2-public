import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * Attendance Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §9.4
 * Daily attendance records for all staff (doctors + non-doctor).
 * Clock-in/out with automatic hours calculation.
 */

// ── Types ───────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday';

export interface IAttendance extends Document {
  userId: Types.ObjectId;
  branchId: Types.ObjectId;
  date: Date;
  checkIn: string | null; // HH:mm — actual clock-in time
  checkOut: string | null; // HH:mm — actual clock-out time
  breakStart: string | null; // HH:mm — break start time
  breakEnd: string | null; // HH:mm — break end time
  scheduledStart: string; // HH:mm — from schedule
  scheduledEnd: string;
  status: AttendanceStatus;
  lateMinutes: number;
  overtime: number; // minutes
  actualHours: number; // decimal hours
  notes: string | null;
  verifiedBy: Types.ObjectId | null;

  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const attendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    date: { type: Date, required: true },
    checkIn: { type: String, default: null },
    checkOut: { type: String, default: null },
    breakStart: { type: String, default: null },
    breakEnd: { type: String, default: null },
    scheduledStart: { type: String, required: true },
    scheduledEnd: { type: String, required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday'],
      default: 'absent',
    },
    lateMinutes: { type: Number, default: 0, min: 0 },
    overtime: { type: Number, default: 0, min: 0 },
    actualHours: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

attendanceSchema.index({ userId: 1, date: -1 }, { unique: true });
attendanceSchema.index({ branchId: 1, date: -1 });
attendanceSchema.index({ status: 1, date: -1 });
// ── Field-Level Encryption (HIPAA/GDPR — C-1 Tier-2) ──────────────
attendanceSchema.plugin(fieldEncryptionPlugin, { fields: ['notes'] });
// ── Model Factory ───────────────────────────────────────────

export function getAttendanceModel(connection: Connection): Model<IAttendance> {
  return (connection.models.Attendance ||
    connection.model('Attendance', attendanceSchema)) as Model<IAttendance>;
}

export type AttendanceModel = ReturnType<typeof getAttendanceModel>;
