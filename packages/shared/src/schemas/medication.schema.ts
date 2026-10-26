import { z } from 'zod';

/**
 * Medication Schemas — Tenant-level medications catalog
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (Module #10 Prescriptions)
 * Per V2_DATABASE.md — medications collection
 *
 * ~100 seed dental medications per tenant, custom additions allowed.
 * Used in Prescription forms via autocomplete.
 */

// ── Enums ───────────────────────────────────────────────────

export const medicationCategoryEnum = z.enum([
  'antibiotic',
  'analgesic',
  'anti_inflammatory',
  'antifungal',
  'antiseptic',
  'anesthetic',
  'vitamin',
  'other',
]);

export const dosageFormEnum = z.enum([
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
]);

// ── Create Schema ───────────────────────────────────────────

export const createMedicationSchema = z
  .object({
    nameEn: z.string().min(1).max(200),
    nameAr: z.string().max(200).optional().default(''),
    genericName: z.string().max(300).optional().default(''),
    category: medicationCategoryEnum,
    dosageForm: dosageFormEnum,
    strength: z.string().max(100).optional().default(''),

    // Defaults for prescription autocomplete
    defaultDosage: z.string().max(200).optional().default(''),
    defaultFrequency: z.string().max(200).optional().default(''),
    defaultDuration: z.string().max(200).optional().default(''),
    instructionsEn: z.string().max(500).optional().default(''),
    instructionsAr: z.string().max(500).optional().default(''),

    warnings: z.array(z.string().max(300)).optional().default([]),
    contraindications: z.array(z.string().max(300)).optional().default([]),

    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().int().min(0).optional().default(0),
  })
  .strict();

// ── Update Schema ───────────────────────────────────────────

export const updateMedicationSchema = createMedicationSchema.partial();

// ── Query Schema ────────────────────────────────────────────

export const medicationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    search: z.string().max(100).optional(),
    category: medicationCategoryEnum.optional(),
    dosageForm: dosageFormEnum.optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sortBy: z.enum(['nameEn', 'category', 'createdAt', 'sortOrder']).default('sortOrder'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type MedicationQuery = z.infer<typeof medicationQuerySchema>;
export type MedicationCategory = z.infer<typeof medicationCategoryEnum>;
export type DosageForm = z.infer<typeof dosageFormEnum>;
