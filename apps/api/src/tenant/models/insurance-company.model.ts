import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Insurance Company Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §7.5 — insurance_companies collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11 Insurance)
 *
 * Tracks insurance providers that patients can be linked to.
 * Bilingual name (en/ar) per BUILD_RULES §11 RTL support.
 */

// ── Interface ───────────────────────────────────────────────

export interface IInsuranceCompany extends Document {
  name: {
    en: string;
    ar: string;
  };
  code: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  coveragePercentage: number;
  maxCoverage?: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const insuranceCompanySchema = new Schema<IInsuranceCompany>(
  {
    name: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    contactPerson: String,
    phone: String,
    email: String,
    coveragePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    maxCoverage: { type: Number, min: 0 },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  },
);

// ── Indexes (per V2_DATABASE.md §7.5) ──────────────────────

insuranceCompanySchema.index({ isActive: 1 });
insuranceCompanySchema.index(
  { 'name.en': 'text', 'name.ar': 'text', code: 'text' },
  { name: 'insurance_company_search_text' },
);

// ── Model Factory ───────────────────────────────────────────

/**
 * Get InsuranceCompany model for a specific tenant database connection.
 * Usage: const InsuranceCompany = getInsuranceCompanyModel(tenantDb);
 */
export function getInsuranceCompanyModel(connection: Connection): Model<IInsuranceCompany> {
  return (connection.models.InsuranceCompany ||
    connection.model(
      'InsuranceCompany',
      insuranceCompanySchema,
      'insurance_companies',
    )) as Model<IInsuranceCompany>;
}

export type InsuranceCompanyModel = ReturnType<typeof getInsuranceCompanyModel>;
