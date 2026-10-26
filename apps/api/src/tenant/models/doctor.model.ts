import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Doctor Model — Tenant Database (tenant_{slug})
 *
 * Links to User in platform DB via userId.
 * Per MASTER_PLAN §13 - Doctor Management
 *
 * Sync Strategy:
 * - When User (platform) is created with role 'dentist' → Doctor created here
 * - Fields synced bidirectionally: name, photo, gender, phone
 * - Doctor-specific fields: specialization, schedules, branches
 */

// ── Types ───────────────────────────────────────────────────

export interface IDoctorSchedule {
  branchId: Types.ObjectId;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;
  slotDuration: number; // minutes (default: 30)
  isActive: boolean;
}

export interface IDoctorException {
  date: Date;
  type: 'vacation' | 'sick' | 'conference' | 'holiday' | 'other';
  reason?: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
}

export interface IDoctor extends Document {
  // Link to User in platform DB
  userId: string; // Platform User._id as string

  // Synced from User (bidirectional)
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: 'male' | 'female';
  avatarUrl?: string;

  // Doctor-specific fields
  title?: string; // Dr., Prof., etc.
  specialization: string; // General Dentist, Orthodontist, etc.
  licenseNumber?: string;
  bio?: string;

  // Multi-branch support
  branches: Types.ObjectId[]; // Branch IDs where this doctor works
  primaryBranchId?: Types.ObjectId;

  // Scheduling
  schedules: IDoctorSchedule[];
  exceptions: IDoctorException[];
  defaultSlotDuration: number; // minutes
  bufferBetweenSlots: number; // minutes

  // Availability
  isAcceptingNewPatients: boolean;
  isOnlineBookingEnabled: boolean;
  maxDailyPatients?: number;

  // Status
  isActive: boolean;
  hiredAt?: Date;
  terminatedAt?: Date;

  // Metadata
  displayOrder: number;
  color?: string; // Calendar color

  // Standard Fields
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const doctorScheduleSchema = new Schema<IDoctorSchedule>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true },
    slotDuration: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const doctorExceptionSchema = new Schema<IDoctorException>(
  {
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['vacation', 'sick', 'conference', 'holiday', 'other'],
      required: true,
    },
    reason: String,
    isFullDay: { type: Boolean, default: true },
    startTime: String,
    endTime: String,
  },
  { _id: true },
);

const doctorSchema = new Schema<IDoctor>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },

    // Synced fields
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    gender: { type: String, enum: ['male', 'female'] },
    avatarUrl: String,

    // Doctor-specific
    title: String,
    specialization: {
      type: String,
      required: true,
      default: 'General Dentist',
    },
    licenseNumber: String,
    bio: String,

    // Branches
    branches: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    primaryBranchId: { type: Schema.Types.ObjectId, ref: 'Branch' },

    // Scheduling
    schedules: [doctorScheduleSchema],
    exceptions: [doctorExceptionSchema],
    defaultSlotDuration: { type: Number, default: 30 },
    bufferBetweenSlots: { type: Number, default: 0 },

    // Availability
    isAcceptingNewPatients: { type: Boolean, default: true },
    isOnlineBookingEnabled: { type: Boolean, default: true },
    maxDailyPatients: Number,

    // Status
    isActive: { type: Boolean, default: true },
    hiredAt: Date,
    terminatedAt: Date,

    // Metadata
    displayOrder: { type: Number, default: 0 },
    color: String,

    // Standard Fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  },
);

// Indexes
doctorSchema.index({ isActive: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ 'schedules.branchId': 1 });

// ── Model Factory ───────────────────────────────────────────

/**
 * Get Doctor model for a specific tenant database connection.
 * Usage: const Doctor = getDoctorModel(tenantDb);
 */
export function getDoctorModel(connection: Connection): Model<IDoctor> {
  return (connection.models.Doctor || connection.model('Doctor', doctorSchema)) as Model<IDoctor>;
}

// ── Default export for type inference ───────────────────────

export type DoctorModel = ReturnType<typeof getDoctorModel>;
