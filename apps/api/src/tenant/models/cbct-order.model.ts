import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * CBCT Order Model — Tenant Database (tenant_{slug})
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#12), §17 (Clinical Cross-Linking)
 * Per SECURITY_AND_ENCRYPTION.md §8 (File Upload Security)
 * Per V2_DECISION_LOG.md §19 (150MB limit)
 * Per V2_DECISION_LOG.md §29 (DICOM Viewer: cornerstone3D, Phase 5+ for 3D)
 *
 * Report is EMBEDDED (no separate cbct_reports collection).
 * Scan data is embedded when order status reaches 'completed'.
 * Status flow: requested → scheduled → completed → reported → cancelled
 */

// ── Embedded Types ──────────────────────────────────────────

export interface ICbctScan {
  scanReferenceId?: string;
  technicianId?: Types.ObjectId;
  scanLocation?: string;
  thumbnailUrl?: string;
  dicomPath?: string;
  dicomUrl?: string;
  displayName?: string;
  fileName?: string;
  fileSize?: number;
  scannerModel?: string;
  scanDate?: Date;
  scanParameters?: Record<string, unknown>;
  scannedAt?: Date;
  notes?: string;
}

export interface ICbctReport {
  reportingDoctorId?: Types.ObjectId;
  findings?: string;
  measurements?: Record<string, unknown>;
  recommendations?: string;
  reportPdfUrl?: string;
  status: string;
  reportedAt?: Date;
}

export type CbctOrderStatus = 'requested' | 'scheduled' | 'completed' | 'reported' | 'cancelled';
export type CbctPriority = 'urgent' | 'high' | 'normal' | 'low';

// ── Main Interface ──────────────────────────────────────────

export interface ICbctOrder extends Document {
  orderNumber: string; // Auto: CBCT-2026-001
  patientId: Types.ObjectId;
  requestingDoctorId: Types.ObjectId;
  branchId?: Types.ObjectId;

  // Cross-links (§17)
  treatmentPlanId?: Types.ObjectId;
  treatmentPlanItemId?: Types.ObjectId;
  procedureNoteId?: Types.ObjectId;
  appointmentId?: Types.ObjectId;

  // Order details
  indication: string;
  clinicalNotes: string;
  priority: CbctPriority;
  status: CbctOrderStatus;
  clinicalPurpose?: string;

  scheduledDate?: Date;
  scheduledTime?: string;
  completedAt?: Date;

  // Embedded scan + report
  scan?: ICbctScan;
  report?: ICbctReport;

  createdAt: Date;
  updatedAt: Date;
}

// ── Scan Sub-Schema ─────────────────────────────────────────

const cbctScanSchema = new Schema<ICbctScan>(
  {
    scanReferenceId: { type: String, maxlength: 100 },
    technicianId: { type: Schema.Types.ObjectId },
    scanLocation: { type: String, maxlength: 200 },
    thumbnailUrl: { type: String, maxlength: 500 },
    dicomPath: { type: String, maxlength: 500 },
    dicomUrl: { type: String, maxlength: 500 },
    displayName: { type: String, maxlength: 200 },
    fileName: { type: String, maxlength: 300 },
    fileSize: { type: Number },
    scannerModel: { type: String, maxlength: 200 },
    scanDate: Date,
    scanParameters: { type: Schema.Types.Mixed },
    scannedAt: Date,
    notes: { type: String, maxlength: 2000 },
  },
  { _id: false },
);

// ── Report Sub-Schema ───────────────────────────────────────

const cbctReportSchema = new Schema<ICbctReport>(
  {
    reportingDoctorId: { type: Schema.Types.ObjectId },
    findings: { type: String, maxlength: 5000 },
    measurements: { type: Schema.Types.Mixed },
    recommendations: { type: String, maxlength: 3000 },
    reportPdfUrl: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ['draft', 'final', 'amended'],
      default: 'draft',
    },
    reportedAt: Date,
  },
  { _id: false },
);

// ── CBCT Order Schema ───────────────────────────────────────

const cbctOrderSchema = new Schema<ICbctOrder>(
  {
    orderNumber: { type: String, maxlength: 50 },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    requestingDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },

    // Cross-links
    treatmentPlanId: { type: Schema.Types.ObjectId },
    treatmentPlanItemId: { type: Schema.Types.ObjectId },
    procedureNoteId: { type: Schema.Types.ObjectId },
    appointmentId: { type: Schema.Types.ObjectId },

    // Order details
    indication: { type: String, default: '', maxlength: 1000 },
    clinicalNotes: { type: String, default: '', maxlength: 2000 },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'normal', 'low'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['requested', 'scheduled', 'completed', 'reported', 'cancelled'],
      default: 'requested',
    },
    clinicalPurpose: {
      type: String,
      enum: [
        'implant_planning',
        'endo_evaluation',
        'ortho_assessment',
        'tmj_evaluation',
        'pathology',
        'trauma',
        'surgical_planning',
        'other',
      ],
    },

    scheduledDate: Date,
    scheduledTime: { type: String, maxlength: 10 },
    completedAt: Date,

    // Embedded
    scan: { type: cbctScanSchema },
    report: { type: cbctReportSchema },
  },
  { timestamps: true },
);

// ── Indexes (per MASTER_PLAN §17) ───────────────────────────

cbctOrderSchema.index({ patientId: 1, createdAt: -1 });
cbctOrderSchema.index({ treatmentPlanId: 1 });
cbctOrderSchema.index({ procedureNoteId: 1 });
cbctOrderSchema.index({ orderNumber: 1 }, { unique: true });
cbctOrderSchema.index({ status: 1, scheduledDate: 1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────
cbctOrderSchema.plugin(fieldEncryptionPlugin, { fields: ['notes', 'clinicalNotes'] });

// ── Auto-generate orderNumber ───────────────────────────────

cbctOrderSchema.pre('validate', async function () {
  if (this.isNew && !this.orderNumber) {
    const year = new Date().getFullYear();
    const Model = this.constructor as Model<ICbctOrder>;
    const count = await Model.countDocuments();
    this.orderNumber = `CBCT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

// ── Model Factory ───────────────────────────────────────────

export function getCbctOrderModel(connection: Connection): Model<ICbctOrder> {
  return (connection.models.CbctOrder ||
    connection.model('CbctOrder', cbctOrderSchema)) as Model<ICbctOrder>;
}

export type CbctOrderModel = ReturnType<typeof getCbctOrderModel>;
