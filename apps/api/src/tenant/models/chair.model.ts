/**
 * Chair Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §6.4 — chairs collection
 * Per DENTO_V2_MASTER_PLAN.md §18 — Chair Dashboard & Daily Ops
 *
 * Tracks physical dental chairs per branch with real-time status.
 */

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export type ChairStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved';

export interface IChair extends Document {
  branchId: Types.ObjectId;
  name: string; // e.g., "Chair 1", "Chair A"
  number: number; // Physical chair number
  status: ChairStatus;

  // Current assignment
  currentPatientId?: Types.ObjectId;
  currentDoctorId?: Types.ObjectId;
  currentAppointmentId?: Types.ObjectId;
  occupiedSince?: Date;

  // Configuration
  hasXray: boolean; // Integrated X-ray unit
  hasMonitor: boolean;
  floor?: string;
  zone?: string;
  notes?: string;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const chairSchema = new Schema<IChair>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true },
    number: { type: Number, required: true },
    status: {
      type: String,
      enum: ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'],
      default: 'available',
    },

    // Current assignment
    currentPatientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
    currentDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    currentAppointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    occupiedSince: Date,

    // Configuration
    hasXray: { type: Boolean, default: false },
    hasMonitor: { type: Boolean, default: false },
    floor: String,
    zone: String,
    notes: String,

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────────────

chairSchema.index({ branchId: 1, isActive: 1 });
chairSchema.index({ branchId: 1, number: 1 }, { unique: true });
chairSchema.index({ branchId: 1, status: 1 });

// ── Model Factory ───────────────────────────────────────────

export function getChairModel(connection: Connection): Model<IChair> {
  return (connection.models.Chair || connection.model('Chair', chairSchema)) as Model<IChair>;
}

export type ChairModel = ReturnType<typeof getChairModel>;
