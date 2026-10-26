import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * Patient Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.1 — patients collection
 * Per DENTO_V2_MASTER_PLAN.md §10 — Patient Management
 *
 * Embeds: allergies[], medicalHistory, familyLinks[], insurance[]
 * PII encrypted: nationalId (AES-256-GCM when ENCRYPTION_MASTER_KEY set)
 *
 * v1 equivalent: patients + patient_allergies + patient_medical_history +
 *                medical_history + patient_family_links + patient_insurance
 *                (6 tables → 1 collection)
 */

// ── Embedded Types ──────────────────────────────────────────

export interface IAllergy {
  allergen: string;
  reaction?: string;
  severity: 'mild' | 'moderate' | 'severe';
  notedAt: Date;
}

export interface IMedicalHistory {
  isDiabetes: boolean;
  isHypertension: boolean;
  isHeartDisease: boolean;
  isBleedingDisorder: boolean;
  isHepatitis: boolean;
  isAsthma: boolean;
  isEpilepsy: boolean;
  isPregnant: boolean;
  isSmoker: boolean;
  smokingFrequency?: string;
  currentMedications: string[];
  isTakingBloodThinners: boolean;
  isAllergicToAnesthesia: boolean;
  isAllergicToPenicillin: boolean;
  isAllergicToLatex: boolean;
  previousDentalSurgeries?: string;
  lastDentalVisitAt?: Date;
  isDentalAnxiety: boolean;
  dentalAnxietyLevel?: number; // 1-10
  otherConditions?: string;
  additionalNotes?: string;
  updatedBy?: Types.ObjectId;
  updatedAt?: Date;
}

export interface IFamilyLink {
  relatedPatientId: Types.ObjectId;
  relationship: 'spouse' | 'parent' | 'child' | 'sibling';
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  isFinancialResponsible: boolean;
}

export interface IPatientInsurance {
  insuranceCompanyId: Types.ObjectId;
  policyNumber: string;
  groupNumber?: string;
  memberId: string;
  coverageType: 'individual' | 'family';
  coveragePercentage: number; // 0-100
  maxCoverage?: number;
  deductible: number;
  deductibleMet: number;
  effectiveAt: Date;
  expiresAt: Date;
  isPrimary: boolean;
  isActive: boolean;
}

export interface IPatientBranchAssignment {
  branchId: Types.ObjectId;
  from: Date;
  to?: Date | null;
  reason?: string;
  transferredBy?: Types.ObjectId;
}

// ── Main Interface ————————————————————─────────────────────

export interface IPatient extends Document {
  userId?: string; // Platform User._id (optional, for patient login)
  patientCode: string; // Auto: "DEN-000001"

  // Personal
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  nationalId?: string; // 🔒 AES-256-GCM encrypted
  nationalIdHash?: string; // 🔍 HMAC-SHA-256 search hash for equality lookup

  // Contact
  phone: string;
  phoneHash?: string; // 🔍 HMAC-SHA-256 search hash for equality lookup
  email?: string;
  emailHash?: string; // 🔍 HMAC-SHA-256 search hash for equality lookup
  address?: string;
  city?: string;
  country?: string;

  // Emergency
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Embedded arrays
  allergies: IAllergy[];
  medicalHistory: IMedicalHistory;
  familyLinks: IFamilyLink[];
  insurance: IPatientInsurance[];

  // Meta
  source: 'admin' | 'website' | 'phone' | 'walk_in' | 'referral';
  howDidYouHear?: string;
  preferredLanguage: 'en' | 'ar';
  notes?: string;

  // Recall (Phase 0.1)
  nextVisitDue?: Date;
  recallMonths?: number; // default recall interval (e.g. 6)

  // Cross-branch assignment (Phase 9.1)
  assignedBranchId?: Types.ObjectId | null;
  assignedBranchHistory: IPatientBranchAssignment[];

  // Communication preferences (Phase 0.2 / GDPR)
  preferredChannel?: 'sms' | 'whatsapp' | 'email' | 'inApp';
  smsOptOut: boolean;
  emailOptOut: boolean;
  whatsappOptOut: boolean;
  marketingOptIn: boolean;

  // Status
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  // Merge tracking (Phase 4.3)
  mergedIntoId?: Types.ObjectId;
  mergedAt?: Date;
  mergedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ── Embedded Schemas ────────────────────────────────────────

const allergySchema = new Schema<IAllergy>(
  {
    allergen: { type: String, required: true },
    reaction: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'mild',
    },
    notedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const medicalHistorySchema = new Schema<IMedicalHistory>(
  {
    isDiabetes: { type: Boolean, default: false },
    isHypertension: { type: Boolean, default: false },
    isHeartDisease: { type: Boolean, default: false },
    isBleedingDisorder: { type: Boolean, default: false },
    isHepatitis: { type: Boolean, default: false },
    isAsthma: { type: Boolean, default: false },
    isEpilepsy: { type: Boolean, default: false },
    isPregnant: { type: Boolean, default: false },
    isSmoker: { type: Boolean, default: false },
    smokingFrequency: String,
    currentMedications: { type: [String], default: [] },
    isTakingBloodThinners: { type: Boolean, default: false },
    isAllergicToAnesthesia: { type: Boolean, default: false },
    isAllergicToPenicillin: { type: Boolean, default: false },
    isAllergicToLatex: { type: Boolean, default: false },
    previousDentalSurgeries: String,
    lastDentalVisitAt: Date,
    isDentalAnxiety: { type: Boolean, default: false },
    dentalAnxietyLevel: { type: Number, min: 1, max: 10 },
    otherConditions: String,
    additionalNotes: String,
    updatedBy: { type: Schema.Types.ObjectId },
    updatedAt: Date,
  },
  { _id: false },
);

const familyLinkSchema = new Schema<IFamilyLink>(
  {
    relatedPatientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    relationship: {
      type: String,
      enum: ['spouse', 'parent', 'child', 'sibling'],
      required: true,
    },
    isPrimaryContact: { type: Boolean, default: false },
    isEmergencyContact: { type: Boolean, default: false },
    isFinancialResponsible: { type: Boolean, default: false },
  },
  { _id: true },
);

const patientInsuranceSchema = new Schema<IPatientInsurance>(
  {
    insuranceCompanyId: { type: Schema.Types.ObjectId, required: true },
    policyNumber: { type: String, required: true },
    groupNumber: String,
    memberId: { type: String, required: true },
    coverageType: {
      type: String,
      enum: ['individual', 'family'],
      default: 'individual',
    },
    coveragePercentage: { type: Number, min: 0, max: 100, default: 0 },
    maxCoverage: Number,
    deductible: { type: Number, default: 0 },
    deductibleMet: { type: Number, default: 0 },
    effectiveAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isPrimary: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

// ── Bilingual Sub-Schema ────────────────────────────────────

const bilingualSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

// ── Patient Schema ──────────────────────────────────────────

const patientSchema = new Schema<IPatient>(
  {
    userId: { type: String, index: true, sparse: true },
    patientCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Personal
    firstName: { type: bilingualSchema, required: true },
    lastName: { type: bilingualSchema, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    nationalId: { type: String }, // 🔒 Encrypted
    nationalIdHash: { type: String, index: true, sparse: true }, // 🔍 HMAC for equality lookup

    // Contact
    phone: { type: String, required: true }, // 🔒 Encrypted at rest
    phoneHash: { type: String, index: true, sparse: true }, // 🔍 HMAC for equality lookup
    email: { type: String }, // 🔒 Encrypted at rest
    emailHash: { type: String, index: true, sparse: true }, // 🔍 HMAC for equality lookup
    address: String, // 🔒 Encrypted at rest
    city: String,
    country: String,

    // Emergency
    emergencyContactName: String,
    emergencyContactPhone: String,

    // Embedded
    allergies: { type: [allergySchema], default: [] },
    medicalHistory: {
      type: medicalHistorySchema,
      default: () => ({}),
    },
    familyLinks: { type: [familyLinkSchema], default: [] },
    insurance: { type: [patientInsuranceSchema], default: [] },

    // Meta
    source: {
      type: String,
      enum: ['admin', 'website', 'phone', 'walk_in', 'referral'],
      default: 'admin',
    },
    howDidYouHear: String,
    preferredLanguage: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en',
    },
    notes: String,

    // Recall (Phase 0.1)
    nextVisitDue: { type: Date, index: true },
    recallMonths: { type: Number, min: 1, max: 36 },

    // Cross-branch assignment (Phase 9.1)
    assignedBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    assignedBranchHistory: {
      type: [
        new Schema<IPatientBranchAssignment>(
          {
            branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
            from: { type: Date, required: true },
            to: { type: Date, default: null },
            reason: { type: String },
            transferredBy: { type: Schema.Types.ObjectId },
          },
          { _id: true },
        ),
      ],
      default: [],
    },

    // Communication preferences (Phase 0.2)
    preferredChannel: {
      type: String,
      enum: ['sms', 'whatsapp', 'email', 'inApp'],
    },
    smsOptOut: { type: Boolean, default: false },
    emailOptOut: { type: Boolean, default: false },
    whatsappOptOut: { type: Boolean, default: false },
    marketingOptIn: { type: Boolean, default: false },

    // Status
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId },

    // Merge tracking (Phase 4.3)
    mergedIntoId: { type: Schema.Types.ObjectId, ref: 'Patient' },
    mergedAt: { type: Date },
    mergedBy: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────────────

// NOTE: phone / email / nationalId are AES-256-GCM encrypted at rest.
// Indexing the ciphertext is pointless (each encryption uses a fresh IV so
// values are non-deterministic) — equality lookups now go through the
// `*Hash` companion fields populated by the encryption plugin.
patientSchema.index({ isActive: 1, createdAt: -1 });
patientSchema.index(
  { 'firstName.en': 'text', 'lastName.en': 'text' },
  { name: 'patient_search_text' },
);

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ───────────────
//
// Wires AES-256-GCM transparently into save / insertMany / update / find hooks.
// `searchHashFields` populates HMAC-SHA-256 companion fields so the application
// layer can still do equality lookups on phone / email / nationalId without
// ever decrypting at query time.
patientSchema.plugin(fieldEncryptionPlugin, {
  fields: [
    'nationalId',
    'phone',
    'email',
    'address',
    'emergencyContactName',
    'emergencyContactPhone',
    'notes',
    'medicalHistory.previousDentalSurgeries',
    'medicalHistory.otherConditions',
    'medicalHistory.additionalNotes',
    'medicalHistory.smokingFrequency',
    'medicalHistory.currentMedications',
    'insurance.policyNumber',
    'insurance.memberId',
  ],
  searchHashFields: {
    phone: 'phoneHash',
    email: 'emailHash',
    nationalId: 'nationalIdHash',
  },
});

// ── Auto-generate patientCode ───────────────────────────────

patientSchema.pre('validate', async function () {
  if (this.isNew && !this.patientCode) {
    const model = this.constructor as ReturnType<typeof getPatientModel>;
    const lastPatient = await model
      .findOne({}, { patientCode: 1 })
      .sort({ patientCode: -1 })
      .lean();

    let nextNumber = 1;
    if (lastPatient?.patientCode) {
      const match = lastPatient.patientCode.match(/DEN-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    this.patientCode = `DEN-${String(nextNumber).padStart(6, '0')}`;
  }
});

// ── Model Factory ───────────────────────────────────────────

/**
 * Get Patient model for a specific tenant database connection.
 * Usage: const Patient = getPatientModel(tenantDb);
 */
export function getPatientModel(connection: Connection): Model<IPatient> {
  return (connection.models.Patient ||
    connection.model('Patient', patientSchema)) as Model<IPatient>;
}

export type PatientModel = ReturnType<typeof getPatientModel>;
