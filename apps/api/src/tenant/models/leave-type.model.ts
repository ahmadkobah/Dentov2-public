import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Leave Type Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §9.3
 * Configurable leave types (annual, sick, emergency, etc.)
 * Seed data created during tenant onboarding.
 */

// ── Types ───────────────────────────────────────────────────

export interface ILeaveType extends Document {
  name: { en: string; ar?: string };
  code: string; // unique per tenant
  maxDaysPerYear: number;
  isPaid: boolean;
  isApprovalRequired: boolean;
  maxDaysPerRequest: number | null;
  color: string;

  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const bilingualSchema = new Schema(
  { en: { type: String, required: true }, ar: { type: String, default: '' } },
  { _id: false },
);

const leaveTypeSchema = new Schema<ILeaveType>(
  {
    name: { type: bilingualSchema, required: true },
    code: { type: String, required: true },
    maxDaysPerYear: { type: Number, required: true, min: 0 },
    isPaid: { type: Boolean, default: true },
    isApprovalRequired: { type: Boolean, default: true },
    maxDaysPerRequest: { type: Number, default: null },
    color: { type: String, default: '#6B7280' },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

leaveTypeSchema.index({ code: 1 }, { unique: true });
leaveTypeSchema.index({ isActive: 1 });

// ── Model Factory ───────────────────────────────────────────

export function getLeaveTypeModel(connection: Connection): Model<ILeaveType> {
  return (connection.models.LeaveType ||
    connection.model('LeaveType', leaveTypeSchema)) as Model<ILeaveType>;
}

export type LeaveTypeModel = ReturnType<typeof getLeaveTypeModel>;
