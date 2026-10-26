import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * Insurance Claim Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §7.5 — insurance_claims collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11 Insurance)
 * Per SECURITY_AND_ENCRYPTION.md §5 — PHI protection
 *
 * 6-status flow: submitted → under_review → approved|partially_approved|denied → paid
 * Auto-generated claimNumber: CLM-{year}-{seq}
 * Document attachments: PDF only, 10MB max per SECURITY §8
 */

// ── Embedded Types ──────────────────────────────────────────

export interface IClaimDocument {
  name: string;
  url: string;
  type: string;
}

// ── Status Type ─────────────────────────────────────────────

export type InsuranceClaimStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'partially_approved'
  | 'denied'
  | 'paid';

// ── Main Interface ──────────────────────────────────────────

export interface IInsuranceClaim extends Document {
  claimNumber: string; // Auto: CLM-2026-00001
  patientId: Types.ObjectId;
  patientInsuranceIndex: number;
  invoiceId: Types.ObjectId;

  claimDate: Date;
  serviceDate: Date;
  totalAmount: number;
  claimedAmount: number;
  approvedAmount?: number;
  patientResponsibility?: number;

  status: InsuranceClaimStatus;
  denialReason?: string;

  documents: IClaimDocument[];

  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ── Embedded Schemas ────────────────────────────────────────

const claimDocumentSchema = new Schema<IClaimDocument>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
  },
  { _id: true },
);

// ── Insurance Claim Schema ──────────────────────────────────

const insuranceClaimSchema = new Schema<IInsuranceClaim>(
  {
    claimNumber: {
      type: String,
      required: true,
      unique: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    patientInsuranceIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },

    claimDate: { type: Date, required: true },
    serviceDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    claimedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, min: 0 },
    patientResponsibility: { type: Number, min: 0 },

    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'partially_approved', 'denied', 'paid'],
      default: 'submitted',
    },
    denialReason: String,

    documents: { type: [claimDocumentSchema], default: [] },

    notes: String,
    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  },
);

// ── Indexes (per V2_DATABASE.md §7.5) ──────────────────────

insuranceClaimSchema.index({ patientId: 1, createdAt: -1 });
insuranceClaimSchema.index({ status: 1, claimDate: 1 });
insuranceClaimSchema.index({ invoiceId: 1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────
insuranceClaimSchema.plugin(fieldEncryptionPlugin, { fields: ['notes'] });

// ── Auto-generate claimNumber ───────────────────────────────

insuranceClaimSchema.pre('validate', async function () {
  if (this.isNew && !this.claimNumber) {
    const model = this.constructor as ReturnType<typeof getInsuranceClaimModel>;
    const year = new Date().getFullYear();
    const prefix = 'CLM';

    const lastClaim = await model
      .findOne({ claimNumber: { $regex: `^${prefix}-${year}-` } }, { claimNumber: 1 })
      .sort({ claimNumber: -1 })
      .lean();

    let nextNumber = 1;
    if (lastClaim?.claimNumber) {
      const match = lastClaim.claimNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    this.claimNumber = `${prefix}-${year}-${String(nextNumber).padStart(5, '0')}`;
  }
});

// ── Model Factory ───────────────────────────────────────────

/**
 * Get InsuranceClaim model for a specific tenant database connection.
 * Usage: const InsuranceClaim = getInsuranceClaimModel(tenantDb);
 */
export function getInsuranceClaimModel(connection: Connection): Model<IInsuranceClaim> {
  return (connection.models.InsuranceClaim ||
    connection.model(
      'InsuranceClaim',
      insuranceClaimSchema,
      'insurance_claims',
    )) as Model<IInsuranceClaim>;
}

export type InsuranceClaimModel = ReturnType<typeof getInsuranceClaimModel>;
