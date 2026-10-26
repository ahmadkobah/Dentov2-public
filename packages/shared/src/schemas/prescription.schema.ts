import { z } from 'zod';

/**
 * Prescription Schemas — CRUD + embedded items
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (Module #10 Prescriptions)
 * Per V2_DATABASE.md — prescriptions collection
 *
 * Each prescription has embedded items[] (medications prescribed).
 * Items link to medications catalog via medicationId (optional—freetext allowed).
 */

// ── Embedded: Prescription Item ─────────────────────────────

export const prescriptionItemSchema = z
  .object({
    medicationId: z.string().min(1).optional(), // → medications (optional for freetext)
    medicationName: z.string().min(1).max(300),
    dosage: z.string().max(200).optional().default(''),
    frequency: z.string().max(200).optional().default(''),
    duration: z.string().max(200).optional().default(''),
    quantity: z.number().int().min(1).optional().default(1),
    instructions: z.string().max(500).optional().default(''),
    notes: z.string().max(500).optional().default(''),
  })
  .strict();

// ── Create Schema ───────────────────────────────────────────

export const createPrescriptionSchema = z
  .object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    appointmentId: z.string().min(1).optional(),
    treatmentPlanId: z.string().min(1).optional(),
    procedureNoteId: z.string().min(1).optional(),

    // Items
    items: z.array(prescriptionItemSchema).min(1).max(30),

    // Clinical
    diagnosis: z.string().max(1000).optional().default(''),
    notes: z.string().max(2000).optional().default(''),

    // Status
    status: z.enum(['draft', 'active', 'dispensed', 'cancelled']).optional().default('draft'),

    validUntil: z.string().datetime().optional(),

    // Phase 1.1 / 1.6 — Clinical-safety override (allergy / interaction warnings)
    safetyOverride: z
      .object({
        acknowledged: z.boolean(),
        reason: z.string().min(3).max(500),
      })
      .optional(),
  })
  .strict();

// ── Update Schema ───────────────────────────────────────────

export const updatePrescriptionSchema = createPrescriptionSchema.partial();

// ── Query Schema ────────────────────────────────────────────

export const prescriptionQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    patientId: z.string().min(1).optional(),
    doctorId: z.string().min(1).optional(),
    status: z.enum(['draft', 'active', 'dispensed', 'cancelled']).optional(),
    sortBy: z.enum(['createdAt', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────

export type PrescriptionItem = z.infer<typeof prescriptionItemSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type PrescriptionQuery = z.infer<typeof prescriptionQuerySchema>;
