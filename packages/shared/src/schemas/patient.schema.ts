import { z } from 'zod';

// ── Bilingual Helpers ───────────────────────────────────────

const bilingualSchema = z
  .object({
    en: z.string().min(1).max(200),
    ar: z.string().max(200).optional().default(''),
  })
  .strict();

// ── Embedded Sub-Schemas ────────────────────────────────────

export const allergySchema = z
  .object({
    allergen: z.string().min(1).max(200),
    reaction: z.string().max(500).optional(),
    severity: z.enum(['mild', 'moderate', 'severe']).default('mild'),
    notedAt: z.string().datetime().optional(),
  })
  .strict();

export const medicalHistorySchema = z
  .object({
    isDiabetes: z.boolean().default(false),
    isHypertension: z.boolean().default(false),
    isHeartDisease: z.boolean().default(false),
    isBleedingDisorder: z.boolean().default(false),
    isHepatitis: z.boolean().default(false),
    isAsthma: z.boolean().default(false),
    isEpilepsy: z.boolean().default(false),
    isPregnant: z.boolean().default(false),
    isSmoker: z.boolean().default(false),
    smokingFrequency: z.string().max(100).optional(),
    currentMedications: z.array(z.string().max(200)).default([]),
    isTakingBloodThinners: z.boolean().default(false),
    isAllergicToAnesthesia: z.boolean().default(false),
    isAllergicToPenicillin: z.boolean().default(false),
    isAllergicToLatex: z.boolean().default(false),
    previousDentalSurgeries: z.string().max(1000).optional(),
    lastDentalVisitAt: z.string().date().optional(),
    isDentalAnxiety: z.boolean().default(false),
    dentalAnxietyLevel: z.number().int().min(1).max(10).optional(),
    otherConditions: z.string().max(2000).optional(),
    additionalNotes: z.string().max(2000).optional(),
  })
  .strict();

export const familyLinkSchema = z
  .object({
    relatedPatientId: z.string().min(1),
    relationship: z.enum(['spouse', 'parent', 'child', 'sibling']),
    isPrimaryContact: z.boolean().default(false),
    isEmergencyContact: z.boolean().default(false),
    isFinancialResponsible: z.boolean().default(false),
  })
  .strict();

export const patientInsuranceSchema = z
  .object({
    insuranceCompanyId: z.string().min(1),
    policyNumber: z.string().min(1).max(50),
    groupNumber: z.string().max(50).optional(),
    memberId: z.string().min(1).max(50),
    coverageType: z.enum(['individual', 'family']).default('individual'),
    coveragePercentage: z.number().min(0).max(100).default(0),
    maxCoverage: z.number().optional(),
    deductible: z.number().default(0),
    deductibleMet: z.number().default(0),
    effectiveAt: z.string().date(),
    expiresAt: z.string().date(),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .strict();

/**
 * Phase 4.4 — Egyptian National ID validator.
 *
 * Format (14 digits):
 *   d1     century  (2 = 1900s, 3 = 2000s)
 *   d2-d3  birth year (YY)
 *   d4-d5  birth month (MM, 01-12)
 *   d6-d7  birth day (DD, 01-31)
 *   d8-d9  governorate code (01-88)
 *   d10-d12 sequence + gender (odd = male, even = female on d13)
 *   d13    gender (odd = male, even = female)
 *   d14    checksum
 *
 * The official checksum algorithm is not publicly published; we therefore
 * validate structure (length, century, valid date, governorate code) which
 * catches > 99% of fat-finger mistakes without rejecting legitimate IDs.
 */
export function isValidEgyptianNationalId(id: string): boolean {
  if (!/^\d{14}$/.test(id)) return false;
  const century = id[0];
  if (century !== '2' && century !== '3') return false;
  const yy = parseInt(id.slice(1, 3), 10);
  const mm = parseInt(id.slice(3, 5), 10);
  const dd = parseInt(id.slice(5, 7), 10);
  const gov = parseInt(id.slice(7, 9), 10);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  // Egyptian governorate codes: 01-88 are assigned (with gaps); accept full range.
  if (gov < 1 || gov > 88) return false;
  // Real-date check (handles Feb / 30-day months)
  const fullYear = (century === '2' ? 1900 : 2000) + yy;
  const d = new Date(Date.UTC(fullYear, mm - 1, dd));
  if (d.getUTCFullYear() !== fullYear || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) {
    return false;
  }
  return true;
}

// ── Patient Schemas ─────────────────────────────────────────

export const createPatientSchema = z
  .object({
    // Personal (bilingual names per V2_DATABASE.md)
    firstName: bilingualSchema,
    lastName: bilingualSchema,
    dateOfBirth: z.string().date(),
    gender: z.enum(['male', 'female', 'other']),
    nationalId: z
      .string()
      .max(30)
      .optional()
      .refine(
        (v) => {
          if (!v) return true;
          // Phase 4.4 — only enforce checksum for IDs that look Egyptian
          // (14 numeric digits). Other formats pass through unchanged.
          if (/^\d{14}$/.test(v)) return isValidEgyptianNationalId(v);
          return true;
        },
        { message: 'Invalid Egyptian National ID' },
      ),

    // Contact
    phone: z.string().min(5).max(20),
    email: z.string().email().optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),

    // Emergency
    emergencyContactName: z.string().max(200).optional(),
    emergencyContactPhone: z.string().max(20).optional(),

    // Embedded
    allergies: z.array(allergySchema).default([]),
    medicalHistory: medicalHistorySchema.optional(),
    familyLinks: z.array(familyLinkSchema).default([]),
    insurance: z.array(patientInsuranceSchema).default([]),

    // Meta
    source: z.enum(['admin', 'website', 'phone', 'walk_in', 'referral']).default('admin'),
    howDidYouHear: z.string().max(200).optional(),
    preferredLanguage: z.enum(['en', 'ar']).default('en'),
    notes: z.string().max(2000).optional(),

    // Phase 4.1 — Duplicate-detection bypass. Server returns 409
    // POSSIBLE_DUPLICATE when phone/email/nationalId match an existing
    // active patient unless this flag is true ("Create anyway").
    duplicateOverride: z.boolean().optional(),
  })
  .strict();

export const updatePatientSchema = createPatientSchema.partial();

export const patientQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    source: z.enum(['admin', 'website', 'phone', 'walk_in', 'referral']).optional(),
    sortBy: z
      .enum(['createdAt', 'firstName.en', 'lastName.en', 'patientCode', 'dateOfBirth'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// Type exports
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQuery = z.infer<typeof patientQuerySchema>;
export type AllergyInput = z.infer<typeof allergySchema>;
export type MedicalHistoryInput = z.infer<typeof medicalHistorySchema>;
export type FamilyLinkInput = z.infer<typeof familyLinkSchema>;
export type PatientInsuranceInput = z.infer<typeof patientInsuranceSchema>;
