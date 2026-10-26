/**
 * Lab Order Type Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.14 — lab_order_types collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Lab Order Types
 *
 * 14 bilingual seed types + tenant-created custom types.
 */

import { Schema, type Document, type Connection, type Model } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export interface ILabOrderType extends Document {
  name: { en: string; ar: string };
  category:
    | 'crown_bridge'
    | 'veneers'
    | 'removable'
    | 'appliances'
    | 'orthodontics'
    | 'implants'
    | 'diagnostics'
    | 'other';
  description?: string;
  defaultTurnaroundDays: number;
  isCustom: boolean; // false = seed, true = tenant-created
  isActive: boolean;
  sortOrder: number;
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

const labOrderTypeSchema = new Schema<ILabOrderType>(
  {
    name: { type: bilingualSchema, required: true },
    category: {
      type: String,
      enum: [
        'crown_bridge',
        'veneers',
        'removable',
        'appliances',
        'orthodontics',
        'implants',
        'diagnostics',
        'other',
      ],
      required: true,
    },
    description: String,
    defaultTurnaroundDays: { type: Number, required: true, min: 1, max: 90, default: 7 },
    isCustom: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────────────

labOrderTypeSchema.index({ category: 1, isActive: 1 });
labOrderTypeSchema.index({ 'name.en': 1 }, { unique: true });

// ── Model Factory ───────────────────────────────────────────

export function getLabOrderTypeModel(connection: Connection): Model<ILabOrderType> {
  return (connection.models.LabOrderType ||
    connection.model('LabOrderType', labOrderTypeSchema)) as Model<ILabOrderType>;
}

export type LabOrderTypeModel = ReturnType<typeof getLabOrderTypeModel>;
