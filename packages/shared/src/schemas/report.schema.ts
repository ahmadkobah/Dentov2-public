import { z } from 'zod';

// ── Report Enums ────────────────────────────────────────────

export const reportCategoryEnum = z.enum([
  'financial',
  'patient',
  'appointment',
  'clinical',
  'operational',
  'inventory',
]);

export const reportFormatEnum = z.enum(['json', 'csv', 'excel', 'pdf']);

export const reportPeriodEnum = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);

export const scheduleFrequencyEnum = z.enum(['daily', 'weekly', 'monthly', 'quarterly']);

export const deliveryMethodEnum = z.enum(['email', 'in_app', 'both']);

export const reportStatusEnum = z.enum(['pending', 'processing', 'completed', 'failed']);

// ── Report Filter Schema ────────────────────────────────────

export const reportFilterSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    branchId: z.string().optional(),
    doctorId: z.string().optional(),
    period: reportPeriodEnum.optional(),
    format: reportFormatEnum.optional(),
  })
  .strict();

// ── Report Export Schema ────────────────────────────────────

export const reportExportSchema = z
  .object({
    reportType: z.string().min(1),
    params: reportFilterSchema.optional(),
    format: z.enum(['pdf', 'csv', 'excel']),
  })
  .strict();

// ── Saved Report Schema ─────────────────────────────────────

export const createSavedReportSchema = z
  .object({
    name: z.string().min(1).max(200),
    reportType: z.string().min(1),
    category: reportCategoryEnum,
    params: reportFilterSchema.optional(),
  })
  .strict();

// ── Report Schedule Schemas ─────────────────────────────────

export const createReportScheduleSchema = z
  .object({
    reportType: z.string().min(1),
    category: reportCategoryEnum,
    reportParams: reportFilterSchema.optional(),
    frequency: scheduleFrequencyEnum,
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(28).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().regex(/^[A-Za-z_][A-Za-z0-9_+\-/]*$/, 'Invalid timezone format'),
    deliveryMethod: deliveryMethodEnum,
    recipients: z.array(z.string()).min(1),
    emailAddresses: z.array(z.string().email()).optional(),
    format: z.enum(['pdf', 'csv', 'excel']),
    name: z.string().min(1).max(200),
  })
  .strict();

export const updateReportScheduleSchema = z
  .object({
    reportParams: reportFilterSchema.optional(),
    frequency: scheduleFrequencyEnum.optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(28).optional(),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    timezone: z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_+\-/]*$/, 'Invalid timezone format')
      .optional(),
    deliveryMethod: deliveryMethodEnum.optional(),
    recipients: z.array(z.string()).optional(),
    emailAddresses: z.array(z.string().email()).optional(),
    format: z.enum(['pdf', 'csv', 'excel']).optional(),
    name: z.string().min(1).max(200).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ── Report Catalog Item Schema ──────────────────────────────

export const reportCatalogItemSchema = z
  .object({
    type: z.string(),
    name: z.object({ en: z.string(), ar: z.string() }),
    description: z.object({ en: z.string(), ar: z.string() }),
    isFree: z.boolean(),
    icon: z.string(),
  })
  .strict();

// ── Report Category Param Schema ────────────────────────────

export const reportCategoryParamSchema = z
  .object({
    type: z.string().min(1),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────
// NOTE: ReportCategory is exported from types/report.types.ts to avoid duplicate
export type ReportFormat = z.infer<typeof reportFormatEnum>;
export type ReportPeriod = z.infer<typeof reportPeriodEnum>;
export type ReportFilter = z.infer<typeof reportFilterSchema>;
export type ReportExport = z.infer<typeof reportExportSchema>;
export type CreateSavedReport = z.infer<typeof createSavedReportSchema>;
export type CreateReportSchedule = z.infer<typeof createReportScheduleSchema>;
export type UpdateReportSchedule = z.infer<typeof updateReportScheduleSchema>;
export type ReportCatalogItem = z.infer<typeof reportCatalogItemSchema>;

// ── History Query (moved from report-management.route.ts) ───

export const reportHistoryQuerySchema = z
  .object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  })
  .strict();

export type ReportHistoryQuery = z.infer<typeof reportHistoryQuerySchema>;

// ── Common ID Param Schema ──────────────────────────────────

export const idParamSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

export type IdParam = z.infer<typeof idParamSchema>;
