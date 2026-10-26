import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * X-Ray Model — Tenant Database (tenant_{slug})
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11), §17 (Clinical Cross-Linking)
 * Per SECURITY_AND_ENCRYPTION.md §8 (File Upload Security)
 * Per V2_DECISION_LOG.md §19 (25MB limit, magic bytes)
 * Per V2_DECISION_LOG.md §29 (DICOM Viewer: cornerstone3D)
 *
 * S3/R2 storage: tenants/{slug}/xrays/{uuid}.{ext}
 * Cross-links: treatmentPlanId, procedureNoteId, dentalChartEntryId
 * Multi-tooth: toothNumbers[] with multi-key index
 */

// ── Interface ───────────────────────────────────────────────

export interface IXray extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  branchId?: Types.ObjectId;

  // Imaging data
  xrayType: string;
  toothNumbers: string[];
  imageUrl: string;
  thumbnailUrl?: string;
  title: string;
  notes: string;
  capturedAt?: Date;
  capturedBy?: Types.ObjectId;

  // Cross-links (§17)
  treatmentPlanId?: Types.ObjectId;
  treatmentPlanItemId?: Types.ObjectId;
  procedureNoteId?: Types.ObjectId;
  dentalChartEntryId?: Types.ObjectId;

  // Clinical context
  clinicalPurpose?: string;
  region?: string;
  findings: string;

  // Comparison
  comparedToXrayId?: Types.ObjectId;
  comparisonNotes: string;

  // File metadata
  fileName: string;
  fileSize: number;
  mimeType: string;

  // Annotations (drawn rectangles with notes on the image)
  annotations: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    note: string;
    color?: string;
    createdAt?: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const xraySchema = new Schema<IXray>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, required: true },
    appointmentId: { type: Schema.Types.ObjectId },
    branchId: { type: Schema.Types.ObjectId },

    // Imaging data
    xrayType: {
      type: String,
      required: true,
      enum: ['periapical', 'bitewing', 'panoramic', 'occlusal', 'cephalometric', 'other'],
    },
    toothNumbers: { type: [String], default: [] },
    imageUrl: { type: String, required: true, maxlength: 500 },
    thumbnailUrl: { type: String, maxlength: 500 },
    title: { type: String, required: true, maxlength: 300 },
    notes: { type: String, default: '', maxlength: 2000 },
    capturedAt: Date,
    capturedBy: { type: Schema.Types.ObjectId },

    // Cross-links
    treatmentPlanId: { type: Schema.Types.ObjectId },
    treatmentPlanItemId: { type: Schema.Types.ObjectId },
    procedureNoteId: { type: Schema.Types.ObjectId },
    dentalChartEntryId: { type: Schema.Types.ObjectId },

    // Clinical context
    clinicalPurpose: {
      type: String,
      enum: [
        'diagnostic',
        'pre_treatment',
        'post_treatment',
        'follow_up',
        'emergency',
        'routine_screening',
      ],
    },
    region: {
      type: String,
      enum: [
        'upper_left',
        'upper_right',
        'lower_left',
        'lower_right',
        'full_mouth',
        'anterior',
        'posterior',
      ],
    },
    findings: { type: String, default: '', maxlength: 3000 },

    // Comparison
    comparedToXrayId: { type: Schema.Types.ObjectId },
    comparisonNotes: { type: String, default: '', maxlength: 1000 },

    // File metadata
    fileName: { type: String, default: '', maxlength: 300 },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: '', maxlength: 100 },

    // Annotations
    annotations: {
      type: [
        {
          id: { type: String, required: true },
          x: { type: Number, required: true },
          y: { type: Number, required: true },
          width: { type: Number, required: true },
          height: { type: Number, required: true },
          note: { type: String, default: '', maxlength: 500 },
          color: { type: String, default: '#ef4444' },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// ── Indexes (per MASTER_PLAN §17) ───────────────────────────

xraySchema.index({ patientId: 1, createdAt: -1 });
xraySchema.index({ treatmentPlanId: 1 });
xraySchema.index({ procedureNoteId: 1 });
xraySchema.index({ appointmentId: 1 });
xraySchema.index({ toothNumbers: 1 }); // Multi-key index
xraySchema.index({ xrayType: 1, patientId: 1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────
xraySchema.plugin(fieldEncryptionPlugin, { fields: ['notes', 'comparisonNotes'] });

// ── Model Factory ───────────────────────────────────────────

export function getXrayModel(connection: Connection): Model<IXray> {
  return (connection.models.Xray || connection.model('Xray', xraySchema)) as Model<IXray>;
}

export type XrayModel = ReturnType<typeof getXrayModel>;
