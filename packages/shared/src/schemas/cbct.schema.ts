import { z } from 'zod';

/**
 * CBCT Schemas — Orders + Scan + Report (embedded)
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#12), §17 (Clinical Cross-Linking)
 * Per SECURITY_AND_ENCRYPTION.md §8 (File Upload Security)
 * Per V2_DECISION_LOG.md §19 (Upload Limit: 150MB)
 * Per V2_DECISION_LOG.md §29 (DICOM Viewer: cornerstone3D)
 *
 * Report is EMBEDDED in cbct_orders (no separate cbct_reports collection).
 * Scan data is embedded when completed.
 */

// ── Enums ───────────────────────────────────────────────────

export const cbctStatusEnum = z.enum([
  'requested',
  'scheduled',
  'completed',
  'reported',
  'cancelled',
]);

export const cbctPriorityEnum = z.enum(['urgent', 'high', 'normal', 'low']);

export const cbctPurposeEnum = z.enum([
  'implant_planning',
  'endo_evaluation',
  'ortho_assessment',
  'tmj_evaluation',
  'pathology',
  'trauma',
  'surgical_planning',
  'other',
]);

export const cbctReportStatusEnum = z.enum(['draft', 'final', 'amended']);

// ── Embedded: Scan Data ─────────────────────────────────────

export const cbctScanSchema = z
  .object({
    scanReferenceId: z.string().max(100).optional(),
    technicianId: z.string().min(1).optional(),
    scanLocation: z.string().max(200).optional(),
    thumbnailUrl: z.string().max(500).optional(),
    dicomPath: z.string().max(500).optional(),
    dicomUrl: z.string().max(500).optional(),
    displayName: z.string().max(200).optional(),
    fileName: z.string().max(300).optional(),
    fileSize: z.number().int().min(0).optional(),
    scannerModel: z.string().max(200).optional(),
    scanParameters: z.record(z.string(), z.unknown()).optional(),
    scannedAt: z.string().optional(),
    scanDate: z.string().optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

// ── Embedded: Report ────────────────────────────────────────

export const cbctReportSchema = z
  .object({
    reportingDoctorId: z.string().min(1).optional(),
    findings: z.string().max(5000).optional(),
    measurements: z.record(z.string(), z.unknown()).optional(),
    recommendations: z.string().max(3000).optional(),
    reportPdfUrl: z.string().max(500).optional(),
    status: cbctReportStatusEnum.optional().default('draft'),
    reportedAt: z.string().datetime().optional(),
  })
  .strict();

// ── Create Schema ───────────────────────────────────────────

export const createCbctOrderSchema = z
  .object({
    patientId: z.string().min(1),
    requestingDoctorId: z.string().min(1),
    branchId: z.string().min(1).optional(),

    // Cross-links (§17)
    treatmentPlanId: z.string().min(1).optional(),
    treatmentPlanItemId: z.string().min(1).optional(),
    procedureNoteId: z.string().min(1).optional(),
    appointmentId: z.string().min(1).optional(),

    // Order details
    indication: z.string().max(1000).optional().default(''),
    clinicalNotes: z.string().max(2000).optional().default(''),
    priority: cbctPriorityEnum.optional().default('normal'),
    status: cbctStatusEnum.optional().default('requested'),
    clinicalPurpose: cbctPurposeEnum.optional(),

    scheduledDate: z.string().optional(),
    scheduledTime: z.string().max(10).optional(),

    // Embedded scan + report (optional on create, usually added later)
    scan: cbctScanSchema.optional(),
    report: cbctReportSchema.optional(),
  })
  .strict();

// ── Update Schema ───────────────────────────────────────────

export const updateCbctOrderSchema = createCbctOrderSchema.partial();

// ── Query Schema ────────────────────────────────────────────

export const cbctOrderQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    patientId: z.string().min(1).optional(),
    requestingDoctorId: z.string().min(1).optional(),
    branchId: z.string().min(1).optional(),
    status: cbctStatusEnum.optional(),
    priority: cbctPriorityEnum.optional(),
    clinicalPurpose: cbctPurposeEnum.optional(),
    treatmentPlanId: z.string().min(1).optional(),
    scheduledDateFrom: z.string().max(30).optional(),
    scheduledDateTo: z.string().max(30).optional(),
    sortBy: z.enum(['createdAt', 'scheduledDate', 'status', 'priority']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────

export type CbctScan = z.infer<typeof cbctScanSchema>;
export type CbctReport = z.infer<typeof cbctReportSchema>;
export type CreateCbctOrderInput = z.infer<typeof createCbctOrderSchema>;
export type UpdateCbctOrderInput = z.infer<typeof updateCbctOrderSchema>;
export type CbctOrderQuery = z.infer<typeof cbctOrderQuerySchema>;
export type CbctStatus = z.infer<typeof cbctStatusEnum>;
export type CbctPriority = z.infer<typeof cbctPriorityEnum>;
export type CbctPurpose = z.infer<typeof cbctPurposeEnum>;
export type CbctReportStatus = z.infer<typeof cbctReportStatusEnum>;
