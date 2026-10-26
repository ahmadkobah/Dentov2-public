import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Shift Template Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §9.2 + MASTER_PLAN §22
 * Predefined shift patterns (Morning, Evening, Night, etc.)
 * Used when assigning staff schedules.
 */

// ── Types ───────────────────────────────────────────────────

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'night' | 'full_day' | 'split';

export interface IShiftTemplate extends Document {
  name: { en: string; ar?: string };
  startTime: string; // HH:mm
  endTime: string;
  breakDuration: number; // minutes
  shiftType: ShiftType;
  color: string;
  branchId: Types.ObjectId | null; // null = global (all branches)
  applicableRoles: string[];
  isDefault: boolean;

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

const shiftTemplateSchema = new Schema<IShiftTemplate>(
  {
    name: { type: bilingualSchema, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakDuration: { type: Number, default: 0, min: 0 },
    shiftType: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'full_day', 'split'],
      required: true,
    },
    color: { type: String, default: '#3B82F6' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    applicableRoles: { type: [String], default: [] },
    isDefault: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

shiftTemplateSchema.index({ isActive: 1 });
shiftTemplateSchema.index({ branchId: 1, isActive: 1 });

// ── Model Factory ───────────────────────────────────────────

export function getShiftTemplateModel(connection: Connection): Model<IShiftTemplate> {
  return (connection.models.ShiftTemplate ||
    connection.model('ShiftTemplate', shiftTemplateSchema)) as Model<IShiftTemplate>;
}

export type ShiftTemplateModel = ReturnType<typeof getShiftTemplateModel>;
