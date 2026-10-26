import { z } from 'zod';

/**
 * Intraoral 3D Scan Schemas — Upload, View, Download
 *
 * Stores ZIP archives of 3D scan files (STL, PLY, OBJ+MTL+textures).
 * ZIP is stored compressed in R2; decompressed client-side for viewing
 * with Online3DViewer.
 *
 * No order workflow — scans are uploaded directly and immediately ready.
 */

// ── Enums ───────────────────────────────────────────────────

export const scanTypeEnum = z.enum([
  'full_arch',
  'upper_arch',
  'lower_arch',
  'bite_registration',
  'single_tooth',
  'other',
]);

export const scanStatusEnum = z.enum(['uploaded', 'ready', 'error']);

// ── Create Schema ───────────────────────────────────────────

export const createScanSchema = z
  .object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    branchId: z.string().min(1).optional(),

    // Scan metadata
    scanType: scanTypeEnum.default('full_arch'),
    scannerModel: z.string().max(200).optional(),
    scanDate: z.string().optional(),
    notes: z.string().max(2000).optional(),

    // File info (set after upload)
    fileKey: z.string().max(500).optional(),
    fileSizeMB: z.number().min(0).optional(),
    originalSizeMB: z.number().min(0).optional(),
    fileCount: z.number().int().min(0).optional(),
    formats: z.array(z.string().max(10)).optional(),

    // Cross-links
    treatmentPlanId: z.string().min(1).optional(),
    appointmentId: z.string().min(1).optional(),
  })
  .strict();

// ── Update Schema ───────────────────────────────────────────

export const updateScanSchema = createScanSchema
  .omit({ patientId: true, doctorId: true })
  .partial();

// ── Query Schema ────────────────────────────────────────────

export const scanQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    patientId: z.string().min(1).optional(),
    doctorId: z.string().min(1).optional(),
    branchId: z.string().min(1).optional(),
    scanType: scanTypeEnum.optional(),
    status: scanStatusEnum.optional(),
    dateFrom: z.string().max(30).optional(),
    dateTo: z.string().max(30).optional(),
    sortBy: z.enum(['createdAt', 'scanDate', 'scanType']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────

export type CreateScanInput = z.infer<typeof createScanSchema>;
export type UpdateScanInput = z.infer<typeof updateScanSchema>;
export type ScanQuery = z.infer<typeof scanQuerySchema>;
export type ScanType = z.infer<typeof scanTypeEnum>;
export type ScanStatus = z.infer<typeof scanStatusEnum>;
