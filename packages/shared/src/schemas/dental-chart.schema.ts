import { z } from 'zod';

// ── Tooth Condition Enum ────────────────────────────────────
// Per V2_DATABASE.md §5.2 — dental_charts collection

export const toothConditionEnum = z.enum([
  'healthy',
  'cavity',
  'crown',
  'bridge',
  'implant',
  'missing',
  'rct',
  'filling',
  'extraction_needed',
  'periodontal',
  'veneer',
  'temporary',
  'pontic',
]);

export const numberingSystemEnum = z.enum(['universal', 'fdi']);

export const surfaceEnum = z.enum([
  'mesial',
  'distal',
  'buccal',
  'lingual',
  'occlusal',
  'incisal',
  'labial',
  'palatal',
]);

// ── Perio Data Sub-Schema ───────────────────────────────────

export const perioDataSchema = z
  .object({
    pocketDepth: z.array(z.number().int().min(0).max(20)).length(6).optional(),
    recession: z.array(z.number().int().min(-5).max(20)).length(6).optional(),
    bleedingOnProbing: z.array(z.boolean()).length(6).optional(),
    mobility: z.number().int().min(0).max(3).optional(),
    furcation: z.number().int().min(0).max(3).optional(),
  })
  .strict();

// ── Dental Chart Entry Schema ───────────────────────────────

export const createDentalChartSchema = z
  .object({
    patientId: z.string().min(1),
    toothNumber: z.number().int().min(1).max(85), // FDI goes up to 85 (child teeth)
    numberingSystem: numberingSystemEnum.default('fdi'),
    condition: toothConditionEnum,
    surfaces: z.array(surfaceEnum).default([]),
    perioData: perioDataSchema.optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const updateDentalChartSchema = createDentalChartSchema.omit({ patientId: true }).partial();

export const dentalChartQuerySchema = z
  .object({
    patientId: z.string().min(1),
    numberingSystem: numberingSystemEnum.optional(),
  })
  .strict();

// ── Dental Chart History Schema ─────────────────────────────
// Per V2_DATABASE.md §5.3 — snapshot-based history

export const snapshotTriggerEnum = z.enum([
  'manual',
  'tooth_update',
  'procedure_note',
  'treatment_plan',
]);

export const createDentalChartHistorySchema = z
  .object({
    patientId: z.string().min(1),
    trigger: snapshotTriggerEnum.default('manual'),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const dentalChartHistoryQuerySchema = z
  .object({
    patientId: z.string().min(1),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────

export type ToothCondition = z.infer<typeof toothConditionEnum>;
export type NumberingSystem = z.infer<typeof numberingSystemEnum>;
export type Surface = z.infer<typeof surfaceEnum>;
export type PerioDataInput = z.infer<typeof perioDataSchema>;
export type CreateDentalChartInput = z.infer<typeof createDentalChartSchema>;
export type UpdateDentalChartInput = z.infer<typeof updateDentalChartSchema>;
export type DentalChartQuery = z.infer<typeof dentalChartQuerySchema>;
export type SnapshotTrigger = z.infer<typeof snapshotTriggerEnum>;
export type CreateDentalChartHistoryInput = z.infer<typeof createDentalChartHistorySchema>;
export type DentalChartHistoryQuery = z.infer<typeof dentalChartHistoryQuerySchema>;
