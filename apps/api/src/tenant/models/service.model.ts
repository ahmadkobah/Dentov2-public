/**
 * Service Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §11.2 — services collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#16) — Dental Services CRUD
 *
 * Dental services catalog with bilingual names, ADA/CDT codes,
 * branch-level pricing overrides, and default materials for inventory deduction.
 */

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export interface IBranchPrice {
  branchId: Types.ObjectId;
  price: number;
}

export interface IRequiredMaterial {
  itemId: Types.ObjectId;
  quantity: number;
  isOptional: boolean;
}

export interface IService extends Document {
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  code?: string;
  chartCondition?: string;
  defaultPrice: number;
  branchPrices: IBranchPrice[];
  defaultDuration: number;
  requiredMaterials: IRequiredMaterial[];
  isActive: boolean;
  isDefault: boolean;
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

const branchPriceSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const requiredMaterialSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true, min: 0 },
    isOptional: { type: Boolean, default: false },
  },
  { _id: false },
);

const serviceSchema = new Schema<IService>(
  {
    name: { type: bilingualSchema, required: true },
    description: { type: bilingualSchema, default: () => ({ en: '', ar: '' }) },
    code: { type: String, trim: true },
    chartCondition: {
      type: String,
      enum: [
        'healthy',
        'cavity',
        'crown',
        'bridge',
        'implant',
        'missing',
        'rct',
        'filling',
        'extraction_needed',
        'periodontal',
        'veneer',
        'temporary',
        'pontic',
      ],
    },
    defaultPrice: { type: Number, required: true, min: 0 },
    branchPrices: { type: [branchPriceSchema], default: [] },
    defaultDuration: { type: Number, default: 30, min: 5, max: 480 },
    requiredMaterials: { type: [requiredMaterialSchema], default: [] },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Indexes ─────────────────────────────────────────────────

serviceSchema.index({ isActive: 1, sortOrder: 1 });
serviceSchema.index({ code: 1 }, { sparse: true });
serviceSchema.index({ 'name.en': 'text', 'description.en': 'text' }, { name: 'services_text_idx' });

// ── Factory ─────────────────────────────────────────────────

export type ServiceModel = Model<IService>;

const modelCache = new WeakMap<Connection, ServiceModel>();

export function getServiceModel(connection: Connection): ServiceModel {
  let model = modelCache.get(connection);
  if (!model) {
    model = connection.model<IService>('Service', serviceSchema, 'services');
    modelCache.set(connection, model);
  }
  return model;
}
