/**
 * Consent Form Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.11 — consent_forms collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#24) — Consent Forms
 *
 * Signed consent forms linked to templates, patients, and treatment plans.
 */

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

// ── Types ───────────────────────────────────────────────────

export interface IConsentForm extends Document {
  templateId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  treatmentPlanId?: Types.ObjectId;
  patientSignature: string;
  witnessSignature?: string;
  signedAt: Date;
  pdfUrl?: string;
  createdAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const consentFormSchema = new Schema<IConsentForm>(
  {
    templateId: { type: Schema.Types.ObjectId, ref: 'ConsentTemplate', required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    treatmentPlanId: { type: Schema.Types.ObjectId, ref: 'TreatmentPlan' },
    patientSignature: { type: String, required: true },
    witnessSignature: { type: String },
    signedAt: { type: Date, required: true },
    pdfUrl: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Indexes ─────────────────────────────────────────────────

consentFormSchema.index({ patientId: 1, createdAt: -1 });
consentFormSchema.index({ treatmentPlanId: 1 });
consentFormSchema.index({ doctorId: 1, createdAt: -1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────────
consentFormSchema.plugin(fieldEncryptionPlugin, {
  fields: ['patientSignature', 'witnessSignature'],
});

// ── Factory ─────────────────────────────────────────────────

export type ConsentFormModel = Model<IConsentForm>;

const modelCache = new WeakMap<Connection, ConsentFormModel>();

export function getConsentFormModel(connection: Connection): ConsentFormModel {
  let model = modelCache.get(connection);
  if (!model) {
    model = connection.model<IConsentForm>('ConsentForm', consentFormSchema, 'consent_forms');
    modelCache.set(connection, model);
  }
  return model;
}
