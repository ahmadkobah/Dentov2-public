/**
 * Dental Lab Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.13 — dental_labs collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Dental Labs CRUD
 *
 * External dental laboratories for lab orders.
 */

import { Schema, type Document, type Connection, type Model } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export interface IDentalLab extends Document {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  specialties: string[];
  rating?: number;
  defaultTurnaroundDays: number;
  pricingNotes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const dentalLabSchema = new Schema<IDentalLab>(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    specialties: {
      type: [String],
      default: [],
    },
    rating: { type: Number, min: 1, max: 5 },
    defaultTurnaroundDays: { type: Number, default: 7, min: 1, max: 90 },
    pricingNotes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Indexes ─────────────────────────────────────────────────

dentalLabSchema.index({ isActive: 1 });
dentalLabSchema.index({ name: 1 }, { unique: true });

// ── Factory ─────────────────────────────────────────────────

export type DentalLabModel = Model<IDentalLab>;

const modelCache = new WeakMap<Connection, DentalLabModel>();

export function getDentalLabModel(connection: Connection): DentalLabModel {
  let model = modelCache.get(connection);
  if (!model) {
    model = connection.model<IDentalLab>('DentalLab', dentalLabSchema, 'dental_labs');
    modelCache.set(connection, model);
  }
  return model;
}
