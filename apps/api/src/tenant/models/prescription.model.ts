import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * Prescription Model — Tenant Database (tenant_{slug})
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (Module #10 Prescriptions)
 * Per V2_DATABASE.md — prescriptions collection
 *
 * Embeds: items[] — each item references a medication from catalog (or freetext).
 * Links: patientId, doctorId, appointmentId, treatmentPlanId, procedureNoteId.
 *
 * Status flow: draft → active → dispensed → cancelled
 */

// ── Embedded Types ──────────────────────────────────────────

export interface IPrescriptionItem {
  _id?: Types.ObjectId;
  medicationId?: Types.ObjectId;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  notes: string;
}

export type PrescriptionStatus = 'draft' | 'active' | 'dispensed' | 'cancelled';

// ── Main Interface ──────────────────────────────────────────

export interface IPrescription extends Document {
  prescriptionNumber: string; // Auto: RX-2026-001
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  treatmentPlanId?: Types.ObjectId;
  procedureNoteId?: Types.ObjectId;

  items: IPrescriptionItem[];

  diagnosis: string;
  notes: string;
  status: PrescriptionStatus;
  validUntil?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ── Prescription Item Sub-Schema ────────────────────────────

const prescriptionItemSchema = new Schema<IPrescriptionItem>(
  {
    medicationId: { type: Schema.Types.ObjectId },
    medicationName: { type: String, required: true, maxlength: 300 },
    dosage: { type: String, default: '', maxlength: 200 },
    frequency: { type: String, default: '', maxlength: 200 },
    duration: { type: String, default: '', maxlength: 200 },
    quantity: { type: Number, default: 1, min: 1 },
    instructions: { type: String, default: '', maxlength: 500 },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { _id: true },
);

// ── Prescription Schema ─────────────────────────────────────

const prescriptionSchema = new Schema<IPrescription>(
  {
    prescriptionNumber: { type: String, maxlength: 50 },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, required: true },
    appointmentId: { type: Schema.Types.ObjectId },
    treatmentPlanId: { type: Schema.Types.ObjectId },
    procedureNoteId: { type: Schema.Types.ObjectId },

    items: { type: [prescriptionItemSchema], default: [] },

    diagnosis: { type: String, default: '', maxlength: 1000 },
    notes: { type: String, default: '', maxlength: 2000 },
    status: {
      type: String,
      enum: ['draft', 'active', 'dispensed', 'cancelled'],
      default: 'draft',
    },
    validUntil: Date,
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ prescriptionNumber: 1 }, { unique: true });
prescriptionSchema.index({ status: 1 });

// ── Auto-generate prescriptionNumber ────────────────────────

prescriptionSchema.pre('validate', async function () {
  if (this.isNew && !this.prescriptionNumber) {
    const year = new Date().getFullYear();
    const Model = this.constructor as Model<IPrescription>;
    const count = await Model.countDocuments();
    this.prescriptionNumber = `RX-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});
// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────────
prescriptionSchema.plugin(fieldEncryptionPlugin, {
  fields: ['diagnosis', 'notes', 'items.instructions', 'items.notes'],
});
// ── Model Factory ───────────────────────────────────────────

export function getPrescriptionModel(connection: Connection): Model<IPrescription> {
  return (connection.models.Prescription ||
    connection.model('Prescription', prescriptionSchema)) as Model<IPrescription>;
}

export type PrescriptionModel = ReturnType<typeof getPrescriptionModel>;
