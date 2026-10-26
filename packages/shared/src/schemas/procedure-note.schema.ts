import { z } from 'zod';

// ── Procedure Note Schemas ──────────────────────────────────
// Per V2_DATABASE.md §5.5 — procedure_notes collection
// Rule: procedure_notes = "Was wurde gemacht" (Documentation) — past-oriented
// Naming: v1 "treatments" → v2 "procedure_notes" (clearer separation from treatment_plans)

// ── Procedure Note Status ───────────────────────────────────

export const PROCEDURE_NOTE_STATUS_VALUES = ['draft', 'completed'] as const;
export type ProcedureNoteStatus = (typeof PROCEDURE_NOTE_STATUS_VALUES)[number];

export const PROCEDURE_NOTE_TYPE_VALUES = ['pre_op', 'intra_op', 'post_op'] as const;
export type ProcedureNoteType = (typeof PROCEDURE_NOTE_TYPE_VALUES)[number];

export const PROCEDURE_TEMPLATE_TYPE_VALUES = [
  'rct',
  'filling',
  'crown',
  'extraction',
  'scaling',
  'other',
] as const;
export type ProcedureTemplateType = (typeof PROCEDURE_TEMPLATE_TYPE_VALUES)[number];

// ── Affected Surface (Phase 12.3) ───────────────────────────────────────
export const affectedSurfaceSchema = z
  .object({
    toothNumber: z.string().min(1).max(10),
    surface: z.string().min(1).max(20),
  })
  .strict();

// ── Attachment Sub-Schema ───────────────────────────────────

export const procedureAttachmentSchema = z
  .object({
    name: z.string().min(1).max(300),
    url: z.string().min(1).max(2000),
    type: z.string().max(100).optional(),
  })
  .strict();

// ── Create Procedure Note Schema ────────────────────────────

export const createProcedureNoteSchema = z
  .object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    appointmentId: z.string().optional(),
    treatmentPlanId: z.string().optional(),
    treatmentPlanItemId: z.string().optional(),
    templateId: z.string().optional(),
    serviceId: z.string().optional(),
    status: z.enum(PROCEDURE_NOTE_STATUS_VALUES).default('draft'),
    noteType: z.enum(PROCEDURE_NOTE_TYPE_VALUES).default('intra_op'),

    // Clinical
    procedureName: z.string().min(1).max(300),
    teethInvolved: z.string().max(500).optional(),
    procedurePerformed: z.string().max(5000).optional(),
    materialsUsed: z.string().max(2000).optional(),
    anesthesiaUsed: z.string().max(200).optional(),
    complications: z.string().max(2000).optional(),
    postOpInstructions: z.string().max(2000).optional(),
    followUpRequired: z.boolean().default(false),
    followUpDate: z
      .string()
      .refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date' })
      .optional(),

    // Cross-Links to imaging (§17 Clinical Cross-Linking)
    linkedXrays: z.array(z.string()).default([]),
    linkedCbcts: z.array(z.string()).default([]),
    preOpXrays: z.array(z.string()).default([]),
    postOpXrays: z.array(z.string()).default([]),

    // Template-based dynamic fields
    teethDetails: z.record(z.string(), z.unknown()).nullable().optional(),

    // Attachments
    attachments: z.array(procedureAttachmentSchema).default([]),

    // Voice note (Phase 10.4)
    voiceNoteUrl: z.string().min(1).max(2000).optional(),
    voiceNoteDurationSeconds: z.number().int().min(0).max(3600).optional(),

    // Affected surfaces (Phase 12.3)
    affectedSurfaces: z.array(affectedSurfaceSchema).default([]),

    notes: z.string().max(2000).optional(),
  })
  .strict();

export const updateProcedureNoteSchema = createProcedureNoteSchema
  .omit({ patientId: true, doctorId: true })
  .partial();

export const procedureNoteQuerySchema = z
  .object({
    patientId: z.string().optional(),
    doctorId: z.string().optional(),
    appointmentId: z.string().optional(),
    treatmentPlanId: z.string().optional(),
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'procedureName']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Procedure Note Template Schemas ─────────────────────────
// Per V2_DATABASE.md §5.6 — procedure_note_templates collection

const bilingualSchema = z
  .object({
    en: z.string().min(1).max(300),
    ar: z.string().max(300).optional().default(''),
  })
  .strict();

export const createProcedureNoteTemplateSchema = z
  .object({
    name: bilingualSchema,
    procedureType: z.string().min(1).max(100),
    templateType: z.enum(PROCEDURE_TEMPLATE_TYPE_VALUES).default('other'),
    templateContent: z.string().max(10000).optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
  })
  .strict();

export const updateProcedureNoteTemplateSchema = createProcedureNoteTemplateSchema.partial();

export const procedureNoteTemplateQuerySchema = z
  .object({
    procedureType: z.string().optional(),
    templateType: z.enum(PROCEDURE_TEMPLATE_TYPE_VALUES).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────

export type ProcedureAttachmentInput = z.infer<typeof procedureAttachmentSchema>;
export type CreateProcedureNoteInput = z.infer<typeof createProcedureNoteSchema>;
export type UpdateProcedureNoteInput = z.infer<typeof updateProcedureNoteSchema>;
export type ProcedureNoteQuery = z.infer<typeof procedureNoteQuerySchema>;
export type CreateProcedureNoteTemplateInput = z.infer<typeof createProcedureNoteTemplateSchema>;
export type UpdateProcedureNoteTemplateInput = z.infer<typeof updateProcedureNoteTemplateSchema>;
export type ProcedureNoteTemplateQuery = z.infer<typeof procedureNoteTemplateQuerySchema>;
