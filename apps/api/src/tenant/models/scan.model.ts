import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * Intraoral 3D Scan Model — Tenant Database (tenant_{slug})
 *
 * Stores metadata for intraoral scan ZIP archives stored in R2.
 * No order workflow — scans are uploaded directly and immediately viewable.
 * ZIP contains STL/PLY/OBJ+MTL+textures; decompressed client-side for 3D viewing.
 *
 * Gated under 'xrays' module (same as CBCT).
 */

// ── Types ───────────────────────────────────────────────────

export type ScanType =
  | 'full_arch'
  | 'upper_arch'
  | 'lower_arch'
  | 'bite_registration'
  | 'single_tooth'
  | 'other';

export type ScanStatus = 'uploaded' | 'ready' | 'error';

// ── Main Interface ──────────────────────────────────────────

export interface IScan extends Document {
  scanNumber: string; // Auto: SCAN-2026-0001
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  branchId?: Types.ObjectId;

  // Scan metadata
  scanType: ScanType;
  scannerModel?: string;
  scanDate?: Date;
  notes?: string;
  status: ScanStatus;

  // File info (R2)
  fileKey: string; // tenants/{slug}/intraoral_scan/{uuid}.zip
  fileSizeMB: number; // Compressed size in R2
  originalSizeMB?: number; // Uncompressed size
  fileCount: number; // Number of files in ZIP
  formats: string[]; // ['stl', 'ply', 'obj']

  // Cross-links
  treatmentPlanId?: Types.ObjectId;
  appointmentId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const scanSchema = new Schema<IScan>(
  {
    scanNumber: { type: String, maxlength: 50 },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },

    scanType: {
      type: String,
      enum: ['full_arch', 'upper_arch', 'lower_arch', 'bite_registration', 'single_tooth', 'other'],
      default: 'full_arch',
    },
    scannerModel: { type: String, maxlength: 200 },
    scanDate: Date,
    notes: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: ['uploaded', 'ready', 'error'],
      default: 'uploaded',
    },

    // File info
    fileKey: { type: String, required: true, maxlength: 500 },
    fileSizeMB: { type: Number, required: true },
    originalSizeMB: { type: Number },
    fileCount: { type: Number, default: 0 },
    formats: [{ type: String, maxlength: 10 }],

    // Cross-links
    treatmentPlanId: { type: Schema.Types.ObjectId },
    appointmentId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

scanSchema.index({ patientId: 1, createdAt: -1 });
scanSchema.index({ doctorId: 1 });
scanSchema.index({ scanNumber: 1 }, { unique: true });
scanSchema.index({ treatmentPlanId: 1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────
scanSchema.plugin(fieldEncryptionPlugin, { fields: ['notes'] });

// ── Auto-generate scanNumber ────────────────────────────────

scanSchema.pre('validate', async function () {
  if (this.isNew && !this.scanNumber) {
    const year = new Date().getFullYear();
    const ScanModel = this.constructor as Model<IScan>;
    const count = await ScanModel.countDocuments();
    this.scanNumber = `SCAN-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

// ── Model Factory ───────────────────────────────────────────

export function getScanModel(connection: Connection): Model<IScan> {
  return (connection.models.Scan || connection.model('Scan', scanSchema)) as Model<IScan>;
}

export type ScanModel = ReturnType<typeof getScanModel>;
