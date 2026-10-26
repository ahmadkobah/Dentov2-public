import { z } from 'zod';

// ── Treatment Plan Status Enum ──────────────────────────────
// Per V2_DATABASE.md §5.4 — treatment_plans collection
// Rule: treatment_plans = "Was kommt" (Planning) — future-oriented

export const treatmentPlanStatusEnum = z.enum([
  'draft',
  'proposed',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
  'expired',
]);

export const discountTypeEnum = z.enum(['percentage', 'fixed']);

// ── Treatment Plan Item Sub-Schema (EMBEDDED) ───────────────

// ── Required Imaging Sub-Schema (per V2_DATABASE.md §5.4) ──

export const requiredImagingSchema = z
  .object({
    type: z.enum(['xray', 'cbct', 'panoramic', 'periapical', 'bitewing']),
    status: z.enum(['pending', 'fulfilled', 'waived']).default('pending'),
    fulfilledByXrayId: z.string().nullable().optional(),
    fulfilledByCbctId: z.string().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict();

// ── Material Sub-Schema (per V2_DATABASE.md §5.4) ───────────

export const treatmentPlanMaterialSchema = z
  .object({
    materialId: z.string().min(1),
    materialName: z.string().min(1).max(300),
    quantity: z.number().min(0).default(1),
    unit: z.string().max(50).default('pcs'),
  })
  .strict();

export const treatmentPlanItemSchema = z
  .object({
    serviceId: z.string().min(1).optional(),
    toothNumber: z
      .string()
      .max(10)
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const num = parseInt(val, 10);
          return !isNaN(num) && num >= 1 && num <= 85 && String(num) === val.trim();
        },
        { message: 'Tooth number must be 1–85' },
      ),
    surface: z.string().max(50).optional(),
    procedureName: z.string().min(1).max(300),
    description: z.string().max(500).optional(),
    cost: z.number().min(0).default(0),
    sequenceOrder: z.number().int().min(0).default(0),
    status: z.enum(['pending', 'scheduled', 'completed', 'cancelled']).default('pending'),
    appointmentId: z.string().optional(),
    completedAt: z.string().datetime().nullable().optional(),
    linkedXrays: z.array(z.string()).default([]),
    linkedCbcts: z.array(z.string()).default([]),
    requiredImaging: z.array(requiredImagingSchema).default([]),
    materials: z.array(treatmentPlanMaterialSchema).default([]),
    notes: z.string().max(1000).optional(),
    // Phase 9.4 — per-item doctor assignment (overrides plan-level)
    assignedDoctorId: z.string().nullable().optional(),
    // Link to procedure note created when the item was started
    procedureNoteId: z.string().nullable().optional(),
  })
  .strict();

// ── Create Treatment Plan Schema ────────────────────────────

export const createTreatmentPlanSchema = z
  .object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    title: z.string().min(1).max(300),
    description: z.string().max(2000).optional(),
    status: treatmentPlanStatusEnum.default('draft'),
    items: z.array(treatmentPlanItemSchema).default([]),

    // Cross-links
    linkedXrays: z.array(z.string()).default([]),
    linkedCbcts: z.array(z.string()).default([]),

    // Financials
    totalCost: z.number().min(0).default(0),
    discountType: discountTypeEnum.optional(),
    discountValue: z.number().min(0).default(0),
    finalCost: z.number().min(0).default(0),

    // Consent
    validUntil: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const updateTreatmentPlanSchema = createTreatmentPlanSchema
  .omit({ patientId: true })
  .partial();

export const treatmentPlanStatusUpdateSchema = z
  .object({
    status: treatmentPlanStatusEnum,
    patientSignature: z.string().optional(),
  })
  .strict();

export const treatmentPlanQuerySchema = z
  .object({
    patientId: z.string().optional(),
    doctorId: z.string().optional(),
    status: treatmentPlanStatusEnum.optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'title', 'status', 'finalCost']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────

export type TreatmentPlanStatus = z.infer<typeof treatmentPlanStatusEnum>;
export type DiscountType = z.infer<typeof discountTypeEnum>;
export type TreatmentPlanItemInput = z.infer<typeof treatmentPlanItemSchema>;
export type CreateTreatmentPlanInput = z.infer<typeof createTreatmentPlanSchema>;
export type UpdateTreatmentPlanInput = z.infer<typeof updateTreatmentPlanSchema>;
export type TreatmentPlanStatusUpdate = z.infer<typeof treatmentPlanStatusUpdateSchema>;
export type TreatmentPlanQuery = z.infer<typeof treatmentPlanQuerySchema>;
