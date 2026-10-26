import { z } from 'zod';

/**
 * X-Ray Schemas — Upload, CRUD, Multi-Tooth tagging, Cross-Linking
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11), §17 (Clinical Cross-Linking)
 * Per SECURITY_AND_ENCRYPTION.md §8 (File Upload Security)
 * Per V2_DECISION_LOG.md §19 (Upload Limits: 25MB, magic bytes)
 *
 * Cross-links: treatmentPlanId, procedureNoteId, dentalChartEntryId
 * toothNumbers[] = Multi-tooth tagging (multi-key index)
 */

// ── Enums ───────────────────────────────────────────────────

export const clinicalPurposeEnum = z.enum([
  'diagnostic',
  'pre_treatment',
  'post_treatment',
  'follow_up',
  'emergency',
  'routine_screening',
]);

export const xrayRegionEnum = z.enum([
  'upper_left',
  'upper_right',
  'lower_left',
  'lower_right',
  'full_mouth',
  'anterior',
  'posterior',
]);

export const xrayTypeEnum = z.enum([
  'periapical',
  'bitewing',
  'panoramic',
  'occlusal',
  'cephalometric',
  'other',
]);

// ── Create Schema ───────────────────────────────────────────

export const createXraySchema = z
  .object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    appointmentId: z.string().min(1).optional(),
    branchId: z.string().min(1).optional(),

    // Imaging data
    xrayType: xrayTypeEnum,
    toothNumbers: z.array(z.string().max(5)).min(0).max(32).optional().default([]),
    title: z.string().min(1).max(300),
    notes: z.string().max(2000).optional().default(''),
    capturedAt: z.string().optional(),

    // Cross-links (§17)
    treatmentPlanId: z.string().min(1).optional(),
    treatmentPlanItemId: z.string().min(1).optional(),
    procedureNoteId: z.string().min(1).optional(),
    dentalChartEntryId: z.string().min(1).optional(),

    // Clinical context
    clinicalPurpose: clinicalPurposeEnum.optional(),
    region: xrayRegionEnum.optional(),
    findings: z.string().max(3000).optional().default(''),

    // Comparison
    comparedToXrayId: z.string().min(1).optional(),
    comparisonNotes: z.string().max(1000).optional().default(''),

    // File metadata (from upload step)
    imageUrl: z.string().max(500).optional(),
    thumbnailUrl: z.string().max(500).optional(),
    fileName: z.string().max(300).optional(),
    fileSize: z.number().int().min(0).optional(),
    mimeType: z.string().max(100).optional(),

    // Annotations (rectangles drawn on image)
    annotations: z
      .array(
        z.object({
          id: z.string().min(1),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          note: z.string().max(500).optional().default(''),
          color: z.string().max(20).optional().default('#ef4444'),
        }),
      )
      .max(50)
      .optional()
      .default([]),

    // Phase 1.3 / 1.6 — Clinical-safety override (e.g. pregnancy)
    safetyOverride: z
      .object({
        acknowledged: z.boolean(),
        reason: z.string().min(3).max(500),
      })
      .optional(),
  })
  .strict();

// ── Update Schema ───────────────────────────────────────────

export const updateXraySchema = createXraySchema.partial();

// ── Query Schema ────────────────────────────────────────────

export const xrayQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    patientId: z.string().min(1).optional(),
    doctorId: z.string().min(1).optional(),
    xrayType: xrayTypeEnum.optional(),
    clinicalPurpose: clinicalPurposeEnum.optional(),
    toothNumber: z.string().max(5).optional(),
    treatmentPlanId: z.string().min(1).optional(),
    procedureNoteId: z.string().min(1).optional(),
    sortBy: z.enum(['createdAt', 'capturedAt', 'xrayType']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────

export type CreateXrayInput = z.infer<typeof createXraySchema>;
export type UpdateXrayInput = z.infer<typeof updateXraySchema>;
export type XrayQuery = z.infer<typeof xrayQuerySchema>;
export type ClinicalPurpose = z.infer<typeof clinicalPurposeEnum>;
export type XrayRegion = z.infer<typeof xrayRegionEnum>;
export type XrayType = z.infer<typeof xrayTypeEnum>;
