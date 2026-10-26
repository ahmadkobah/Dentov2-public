import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Appointment Type Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §6.6 — appointment_types collection
 * Defines reusable appointment categories with color-coding for calendar.
 */

// ── Types ───────────────────────────────────────────────────

export interface IAppointmentType extends Document {
  name: { en: string; ar?: string };
  code: string; // "consultation", "follow_up", "treatment", "emergency", "checkup"
  defaultDuration: number; // minutes
  color: string; // Hex color for calendar
  icon?: string;

  isDoctorRequired: boolean;
  isOnlineBookingAllowed: boolean;
  defaultFee?: number;

  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const bilingualSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const appointmentTypeSchema = new Schema<IAppointmentType>(
  {
    name: { type: bilingualSchema, required: true },
    code: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    defaultDuration: { type: Number, required: true, default: 30 },
    color: {
      type: String,
      required: true,
      default: '#4CAF50',
      match: /^#[0-9a-fA-F]{6}$/,
    },
    icon: String,

    isDoctorRequired: { type: Boolean, default: true },
    isOnlineBookingAllowed: { type: Boolean, default: false },
    defaultFee: Number,

    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────────────

appointmentTypeSchema.index({ code: 1 }, { unique: true });
appointmentTypeSchema.index({ isActive: 1, sortOrder: 1 });

// ── Model Factory ───────────────────────────────────────────

export function getAppointmentTypeModel(connection: Connection): Model<IAppointmentType> {
  return (connection.models.AppointmentType ||
    connection.model('AppointmentType', appointmentTypeSchema)) as Model<IAppointmentType>;
}

export type AppointmentTypeModel = ReturnType<typeof getAppointmentTypeModel>;
