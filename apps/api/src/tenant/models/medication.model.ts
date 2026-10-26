import { Schema, type Document, type Connection, type Model } from 'mongoose';

/**
 * Medication Model — Tenant Database (tenant_{slug})
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (Module #10 Prescriptions)
 * Per V2_DATABASE.md — medications collection
 *
 * ~100 seed dental medications per tenant.
 * isCustom=false → seed (non-deletable, deactivatable)
 * isCustom=true  → tenant-added
 *
 * Used in Prescription forms via autocomplete (name/genericName search).
 */

// ── Interface ───────────────────────────────────────────────

export interface IMedication extends Document {
  nameEn: string;
  nameAr: string;
  genericName: string;
  category: string;
  dosageForm: string;
  strength: string;

  // Defaults for prescription autocomplete
  defaultDosage: string;
  defaultFrequency: string;
  defaultDuration: string;
  instructionsEn: string;
  instructionsAr: string;

  warnings: string[];
  contraindications: string[];

  isActive: boolean;
  isCustom: boolean;
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const medicationSchema = new Schema<IMedication>(
  {
    nameEn: { type: String, required: true, maxlength: 200 },
    nameAr: { type: String, default: '', maxlength: 200 },
    genericName: { type: String, default: '', maxlength: 300 },
    category: {
      type: String,
      required: true,
      enum: [
        'antibiotic',
        'analgesic',
        'anti_inflammatory',
        'antifungal',
        'antiseptic',
        'anesthetic',
        'vitamin',
        'other',
      ],
    },
    dosageForm: {
      type: String,
      required: true,
      enum: [
        'tablet',
        'capsule',
        'syrup',
        'injection',
        'cream',
        'gel',
        'mouthwash',
        'drops',
        'spray',
        'powder',
        'other',
      ],
    },
    strength: { type: String, default: '', maxlength: 100 },

    defaultDosage: { type: String, default: '', maxlength: 200 },
    defaultFrequency: { type: String, default: '', maxlength: 200 },
    defaultDuration: { type: String, default: '', maxlength: 200 },
    instructionsEn: { type: String, default: '', maxlength: 500 },
    instructionsAr: { type: String, default: '', maxlength: 500 },

    warnings: { type: [String], default: [] },
    contraindications: { type: [String], default: [] },

    isActive: { type: Boolean, default: true },
    isCustom: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

medicationSchema.index({ nameEn: 1, strength: 1 }, { unique: true });
medicationSchema.index({ category: 1, isActive: 1 });
medicationSchema.index({ genericName: 1 });
medicationSchema.index(
  { nameEn: 'text', nameAr: 'text', genericName: 'text' },
  { weights: { nameEn: 3, genericName: 2, nameAr: 1 } },
);

// ── Model Factory ───────────────────────────────────────────

export function getMedicationModel(connection: Connection): Model<IMedication> {
  return (connection.models.Medication ||
    connection.model('Medication', medicationSchema)) as Model<IMedication>;
}

export type MedicationModel = ReturnType<typeof getMedicationModel>;
