import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * Treatment Plan Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.4 — treatment_plans collection
 * Per DENTO_V2_MASTER_PLAN.md §10, §17 — Treatment Plans + Cross-Linking
 *
 * Rule: treatment_plans = "Was kommt" (Planning) — future-oriented
 * Items[] are EMBEDDED (not separate collection).
 * Each item can link to a tooth, service, xrays, cbcts.
 *
 * Status flow: draft → proposed → accepted → in_progress → completed
 *                                                        → cancelled
 *                                         → expired
 */

// ── Embedded Types ──────────────────────────────────────────

export type TreatmentPlanStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type TreatmentPlanItemStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';

export type DiscountType = 'percentage' | 'fixed';

export interface IRequiredImaging {
  type: string;
  status: string;
  fulfilledByXrayId?: Types.ObjectId | null;
  fulfilledByCbctId?: Types.ObjectId | null;
  notes?: string | null;
}

export interface ITreatmentPlanMaterial {
  materialId: Types.ObjectId;
  materialName: string;
  quantity: number;
  unit: string;
}

export interface ITreatmentPlanItem {
  _id?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  toothNumber?: string;
  surface?: string;
  procedureName: string;
  description?: string;
  cost: number;
  sequenceOrder: number;
  status: TreatmentPlanItemStatus;
  appointmentId?: Types.ObjectId;
  completedAt?: Date | null;
  linkedXrays: Types.ObjectId[];
  linkedCbcts: Types.ObjectId[];
  requiredImaging: IRequiredImaging[];
  materials: ITreatmentPlanMaterial[];
  notes?: string;
  // Phase 0.4 — Billing tracker
  billedAmount?: number;
  billedInvoiceId?: Types.ObjectId | null;
  // Phase 9.4 — per-item doctor assignment (overrides plan-level doctorId)
  assignedDoctorId?: Types.ObjectId | null;
  // Link to procedure note created when the item was started
  procedureNoteId?: Types.ObjectId | null;
}

// ── Main Interface ──────────────────────────────────────────

export interface ITreatmentPlan extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  title: string;
  description?: string;
  status: TreatmentPlanStatus;

  // Embedded items
  items: ITreatmentPlanItem[];

  // Cross-links (§17 Clinical Cross-Linking)
  linkedXrays: Types.ObjectId[];
  linkedCbcts: Types.ObjectId[];

  // Financials
  totalCost: number;
  discountType?: DiscountType;
  discountValue: number;
  finalCost: number;

  // Consent
  patientSignature?: string;
  signedAt?: Date;
  validUntil?: Date;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Required Imaging Sub-Schema (per V2_DATABASE.md §5.4) ──

const requiredImagingSubSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['xray', 'cbct', 'panoramic', 'periapical', 'bitewing'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'fulfilled', 'waived'],
      default: 'pending',
    },
    fulfilledByXrayId: { type: Schema.Types.ObjectId, default: null },
    fulfilledByCbctId: { type: Schema.Types.ObjectId, default: null },
    notes: { type: String, maxlength: 500, default: null },
  },
  { _id: false },
);

// ── Material Sub-Schema (per V2_DATABASE.md §5.4) ─────────

const materialSubSchema = new Schema(
  {
    materialId: { type: Schema.Types.ObjectId, required: true },
    materialName: { type: String, required: true, maxlength: 300 },
    quantity: { type: Number, min: 0, default: 1 },
    unit: { type: String, maxlength: 50, default: 'pcs' },
  },
  { _id: false },
);

// ── Embedded Item Schema ────────────────────────────────────

const treatmentPlanItemSchema = new Schema<ITreatmentPlanItem>(
  {
    serviceId: { type: Schema.Types.ObjectId },
    toothNumber: { type: String, maxlength: 10 },
    surface: { type: String, maxlength: 50 },
    procedureName: { type: String, required: true, maxlength: 300 },
    description: { type: String, maxlength: 500 },
    cost: { type: Number, min: 0, default: 0 },
    sequenceOrder: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'completed', 'cancelled'],
      default: 'pending',
    },
    appointmentId: { type: Schema.Types.ObjectId },
    completedAt: { type: Date, default: null },
    linkedXrays: { type: [Schema.Types.ObjectId], default: [] },
    linkedCbcts: { type: [Schema.Types.ObjectId], default: [] },
    requiredImaging: { type: [requiredImagingSubSchema], default: [] },
    materials: { type: [materialSubSchema], default: [] },
    notes: { type: String, maxlength: 1000 },
    // Phase 0.4 — Billing tracker
    billedAmount: { type: Number, min: 0, default: 0 },
    billedInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
    // Phase 9.4 — per-item doctor assignment
    assignedDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', default: null },
    // Link to the procedure note that was opened/completed for this item
    procedureNoteId: { type: Schema.Types.ObjectId, ref: 'ProcedureNote', default: null },
  },
  { _id: true },
);

// ── Treatment Plan Schema ───────────────────────────────────

const treatmentPlanSchema = new Schema<ITreatmentPlan>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, maxlength: 300 },
    description: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: ['draft', 'proposed', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired'],
      default: 'draft',
    },

    // Embedded items
    items: { type: [treatmentPlanItemSchema], default: [] },

    // Cross-links
    linkedXrays: { type: [Schema.Types.ObjectId], default: [] },
    linkedCbcts: { type: [Schema.Types.ObjectId], default: [] },

    // Financials
    totalCost: { type: Number, min: 0, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'] },
    discountValue: { type: Number, min: 0, default: 0 },
    finalCost: { type: Number, min: 0, default: 0 },

    // Consent
    patientSignature: String,
    signedAt: Date,
    validUntil: Date,

    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
);

// ── Indexes per V2_DATABASE.md ──────────────────────────────

treatmentPlanSchema.index({ patientId: 1, status: 1, createdAt: -1 });
treatmentPlanSchema.index({ doctorId: 1, status: 1 });
treatmentPlanSchema.index({ 'items.appointmentId': 1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────────
// `description`, `notes`, and per-item `notes` carry clinical detail that
// qualifies as PHI under HIPAA §164.514. `patientSignature` is consent PHI.
treatmentPlanSchema.plugin(fieldEncryptionPlugin, {
  fields: ['description', 'notes', 'patientSignature', 'items.notes', 'items.description'],
});

// ── Pre-save: Recalculate financials ────────────────────────

treatmentPlanSchema.pre('save', function () {
  // Sum up item costs
  this.totalCost = this.items.reduce((sum, item) => sum + (item.cost || 0), 0);

  // Calculate final cost after discount
  if (this.discountType === 'percentage') {
    this.finalCost = this.totalCost * (1 - (this.discountValue || 0) / 100);
  } else if (this.discountType === 'fixed') {
    this.finalCost = Math.max(0, this.totalCost - (this.discountValue || 0));
  } else {
    this.finalCost = this.totalCost;
  }
});

// ── Model Factory ───────────────────────────────────────────

/**
 * Get TreatmentPlan model for a specific tenant database connection.
 * Usage: const TreatmentPlan = getTreatmentPlanModel(tenantDb);
 */
export function getTreatmentPlanModel(connection: Connection): Model<ITreatmentPlan> {
  return (connection.models.TreatmentPlan ||
    connection.model('TreatmentPlan', treatmentPlanSchema)) as Model<ITreatmentPlan>;
}

export type TreatmentPlanModel = ReturnType<typeof getTreatmentPlanModel>;
