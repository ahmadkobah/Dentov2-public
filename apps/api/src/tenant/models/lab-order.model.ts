/**
 * Lab Order Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.12 — lab_orders collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Lab Orders CRUD
 *
 * Status flow: draft → sent → in_progress → ready → delivered | rejected | cancelled
 */

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

// ── Types ───────────────────────────────────────────────────

export type LabOrderStatus =
  | 'draft'
  | 'sent'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export interface ILabOrderAttachment {
  name: string;
  url: string;
  type: 'impression' | 'photo' | 'xray' | 'prescription' | 'other';
}

export interface ILabOrder extends Document {
  orderNumber: string;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  branchId: Types.ObjectId;
  dentalLabId: Types.ObjectId;
  labOrderTypeId: Types.ObjectId;
  treatmentPlanId?: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  scanId?: Types.ObjectId;
  toothNumbers: string[];
  shade?: string;
  material?: string;
  description?: string;
  specialInstructions?: string;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  status: LabOrderStatus;
  tryInDate?: Date;
  tryInNotes?: string;
  adjustmentRequired: boolean;
  adjustmentNotes?: string;
  cost: number;
  isPaid: boolean;
  attachments: ILabOrderAttachment[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const attachmentSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['impression', 'photo', 'xray', 'prescription', 'other'],
      default: 'other',
    },
  },
  { _id: false },
);

const labOrderSchema = new Schema<ILabOrder>(
  {
    orderNumber: { type: String, required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    dentalLabId: { type: Schema.Types.ObjectId, ref: 'DentalLab', required: true },
    labOrderTypeId: { type: Schema.Types.ObjectId, ref: 'LabOrderType', required: true },
    treatmentPlanId: { type: Schema.Types.ObjectId, ref: 'TreatmentPlan' },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    scanId: { type: Schema.Types.ObjectId, ref: 'Scan' },
    toothNumbers: { type: [String], default: [] },
    shade: { type: String, trim: true },
    material: { type: String, trim: true },
    description: { type: String },
    specialInstructions: { type: String },
    orderDate: { type: Date, default: () => new Date() },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'sent', 'in_progress', 'ready', 'delivered', 'rejected', 'cancelled'],
      default: 'draft',
    },
    tryInDate: { type: Date },
    tryInNotes: { type: String },
    adjustmentRequired: { type: Boolean, default: false },
    adjustmentNotes: { type: String },
    cost: { type: Number, default: 0, min: 0 },
    isPaid: { type: Boolean, default: false },
    attachments: { type: [attachmentSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Indexes ─────────────────────────────────────────────────

labOrderSchema.index({ orderNumber: 1 }, { unique: true });
labOrderSchema.index({ patientId: 1, createdAt: -1 });
labOrderSchema.index({ dentalLabId: 1, status: 1 });
labOrderSchema.index({ status: 1, expectedDeliveryDate: 1 });
labOrderSchema.index({ doctorId: 1, createdAt: -1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────
labOrderSchema.plugin(fieldEncryptionPlugin, {
  fields: ['description', 'specialInstructions', 'tryInNotes', 'adjustmentNotes'],
});

// ── Auto-generate order number ──────────────────────────────

labOrderSchema.pre('validate', async function () {
  if (this.isNew && !this.orderNumber) {
    const year = new Date().getFullYear();
    const model = this.constructor as Model<ILabOrder>;
    const lastOrder = await model.findOne({}, { orderNumber: 1 }).sort({ createdAt: -1 }).lean();
    let seq = 1;
    if (lastOrder?.orderNumber) {
      const parts = lastOrder.orderNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1] ?? '0', 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    this.orderNumber = `LAB-${year}-${String(seq).padStart(5, '0')}`;
  }
});

// ── Factory ─────────────────────────────────────────────────

export type LabOrderModel = Model<ILabOrder>;

const modelCache = new WeakMap<Connection, LabOrderModel>();

export function getLabOrderModel(connection: Connection): LabOrderModel {
  let model = modelCache.get(connection);
  if (!model) {
    model = connection.model<ILabOrder>('LabOrder', labOrderSchema, 'lab_orders');
    modelCache.set(connection, model);
  }
  return model;
}
